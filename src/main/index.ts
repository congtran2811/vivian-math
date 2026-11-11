import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { execFile } from 'child_process'
import { existsSync, statSync, writeFileSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join, resolve } from 'path'

// Khi Word gọi phần mềm để soạn một công thức, nó truyền thư mục trao đổi qua tham số này.
// Word ghi latex.txt và fontsize.txt vào đó; phần mềm ghi lại result.png, result.txt, size.txt rồi done.flag.
const SESSION_FLAG = '--word-session='
const sessionArg = process.argv.find((a) => a.startsWith(SESSION_FLAG))
const sessionPath = sessionArg ? resolve(sessionArg.slice(SESSION_FLAG.length)) : null
const wordDir = sessionPath && existsSync(sessionPath) && statSync(sessionPath).isDirectory() ? sessionPath : null
let wordDone = false

const readText = async (file: string): Promise<string> => {
  try {
    // Bỏ dấu BOM mà Word ghi ở đầu file UTF-8.
    return (await readFile(file, 'utf8')).replace(/^\uFEFF/, '')
  } catch {
    return ''
  }
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    title: wordDir ? 'Vivian Math (Word)' : 'Vivian Math',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Mở liên kết ngoài bằng trình duyệt mặc định, không mở trong app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

interface FileFilter {
  name: string
  extensions: string[]
}

// Đường dẫn mà người dùng đã chọn qua hộp thoại. Chỉ các đường dẫn này mới được ghi đè không hỏi lại.
const approvedPaths = new Set<string>()

function registerFileHandlers(): void {
  ipcMain.handle(
    'file:save',
    async (
      event,
      args: { defaultName: string; data: string | Uint8Array; filter: FileFilter; path?: string }
    ): Promise<string | null> => {
      let target = args.path && approvedPaths.has(args.path) ? args.path : undefined
      if (!target) {
        const win = BrowserWindow.fromWebContents(event.sender)!
        const res = await dialog.showSaveDialog(win, { defaultPath: args.defaultName, filters: [args.filter] })
        if (res.canceled || !res.filePath) return null
        target = res.filePath
        approvedPaths.add(target)
      }
      await writeFile(target, args.data)
      return target
    }
  )

  ipcMain.handle(
    'file:open',
    async (event, args: { filter: FileFilter }): Promise<{ path: string; content: string } | null> => {
      const win = BrowserWindow.fromWebContents(event.sender)!
      const res = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [args.filter] })
      if (res.canceled || res.filePaths.length === 0) return null
      const path = res.filePaths[0]
      approvedPaths.add(path)
      return { path, content: await readFile(path, 'utf8') }
    }
  )
}

function registerWordHandlers(): void {
  ipcMain.handle('word:session', async (): Promise<{ latex: string; fontSize: number } | null> => {
    if (!wordDir) return null
    const fontSize = parseFloat(await readText(join(wordDir, 'fontsize.txt')))
    return {
      latex: (await readText(join(wordDir, 'latex.txt'))).trim(),
      fontSize: fontSize >= 6 && fontSize <= 96 ? fontSize : 12
    }
  })

  ipcMain.handle(
    'word:finish',
    async (_event, a: { png: Uint8Array; latex: string; width: number; height: number; depth: number }): Promise<void> => {
      if (!wordDir) throw new Error('Phần mềm không được mở từ Word.')
      await writeFile(join(wordDir, 'result.png'), a.png)
      await writeFile(join(wordDir, 'result.txt'), '\uFEFF' + a.latex, 'utf8')
      // Kích thước tính bằng point, dùng dấu chấm thập phân để Word đọc được ở mọi ngôn ngữ hệ thống.
      await writeFile(join(wordDir, 'size.txt'), [a.width, a.height, a.depth].map((n) => n.toFixed(2)).join(';'))
      // done.flag ghi sau cùng: Word chỉ đọc kết quả khi thấy file này.
      await writeFile(join(wordDir, 'done.flag'), '')
      wordDone = true
      app.quit()
    }
  )

  ipcMain.handle('word:cancel', (): void => app.quit())

  // Cài bộ nút Vivian Math vào Word bằng script đi kèm. Script trả về mã ngắn, giao diện tự dịch ra lời.
  ipcMain.handle('word:installAddin', (): Promise<string> => {
    if (process.platform !== 'win32') return Promise.resolve('ERR NOT_WINDOWS')
    const dir = app.isPackaged ? join(process.resourcesPath, 'word-addin') : join(app.getAppPath(), 'word-addin')
    const args = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(dir, 'install.ps1'), '-ExePath', process.execPath]
    // Khi chạy thử bằng `npm run dev`, electron.exe cần thêm đường dẫn dự án.
    if (!app.isPackaged) args.push('-AppPath', app.getAppPath())
    return new Promise((done) => {
      execFile('powershell.exe', args, { windowsHide: true, timeout: 120_000 }, (error, stdout) => {
        const line = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^(OK|ERR)\b/.test(l)).pop()
        done(line ?? `ERR ${error ? error.message : 'NO_OUTPUT'}`)
      })
    })
  })
}

// Nếu người dùng đóng cửa sổ mà không chèn, báo cho Word biết để nó thôi chờ.
app.on('will-quit', () => {
  if (wordDir && !wordDone) {
    try {
      writeFileSync(join(wordDir, 'cancel.flag'), '')
    } catch {
      // Thư mục trao đổi đã bị xóa: Word sẽ tự hết thời gian chờ.
    }
  }
})

app.whenReady().then(() => {
  registerFileHandlers()
  registerWordHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' || wordDir) app.quit()
})
