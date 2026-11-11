import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { execFile } from 'child_process'
import { existsSync, statSync, writeFileSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join, resolve } from 'path'

// Khi Word gọi phần mềm để soạn một công thức, nó truyền thư mục trao đổi qua tham số này.
// Word ghi latex.txt và fontsize.txt vào đó; phần mềm ghi lại result.png, result.txt, size.txt rồi done.flag.
const SESSION_FLAG = '--word-session='
const sessionFromArgs = (argv: string[]): string | null => {
  const arg = argv.find((a) => a.startsWith(SESSION_FLAG))
  const path = arg ? resolve(arg.slice(SESSION_FLAG.length)) : null
  return path && existsSync(path) && statSync(path).isDirectory() ? path : null
}
// Thư mục trao đổi của công thức đang soạn cho Word; null khi không có.
let wordDir: string | null = sessionFromArgs(process.argv)
let mainWindow: BrowserWindow | null = null

const windowTitle = (): string => (wordDir ? 'Vivian Math (Word)' : 'Vivian Math')

// Báo cho Word biết công thức đang soạn bị bỏ, để nó thôi chờ.
function cancelWordSession(): void {
  if (!wordDir) return
  try {
    writeFileSync(join(wordDir, 'cancel.flag'), '')
  } catch {
    // Thư mục trao đổi đã bị xóa: Word sẽ tự hết thời gian chờ.
  }
  wordDir = null
}

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
    title: windowTitle(),
    backgroundColor: '#f4f6fb',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
  // Giữ tên cửa sổ do phần mềm đặt, không lấy theo thẻ <title> của trang.
  win.on('page-title-updated', (e) => e.preventDefault())

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

async function readSession(): Promise<{ latex: string; fontSize: number } | null> {
  if (!wordDir) return null
  const fontSize = parseFloat(await readText(join(wordDir, 'fontsize.txt')))
  return {
    latex: (await readText(join(wordDir, 'latex.txt'))).trim(),
    fontSize: fontSize >= 6 && fontSize <= 96 ? fontSize : 12
  }
}

// Đưa cửa sổ đang mở lên trước thay vì mở thêm một phần mềm nữa.
function showWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  // Windows hay chặn việc tự giành tiêu điểm; bật tắt "luôn ở trên" để cửa sổ chắc chắn nổi lên.
  mainWindow.setAlwaysOnTop(true)
  mainWindow.focus()
  mainWindow.setAlwaysOnTop(false)
}

// Kết thúc công thức đang soạn cho Word: phần mềm vẫn mở, thu nhỏ lại để lần sau dùng tiếp.
async function endWordSession(): Promise<void> {
  wordDir = null
  if (!mainWindow) return
  mainWindow.setTitle(windowTitle())
  mainWindow.webContents.send('word:session', null)
  mainWindow.minimize()
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
  ipcMain.handle('word:session', readSession)

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
      await endWordSession()
    }
  )

  ipcMain.handle('word:cancel', async (): Promise<void> => {
    cancelWordSession()
    await endWordSession()
  })

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
app.on('will-quit', cancelWordSession)

// Chỉ chạy một phần mềm: lần mở sau (ví dụ Word bấm nút lần nữa) chuyển yêu cầu cho cửa sổ đang mở rồi thoát.
const isFirstInstance = app.requestSingleInstanceLock()
if (!isFirstInstance) {
  wordDir = null
  app.quit()
}

app.on('second-instance', (_event, argv) => {
  const next = sessionFromArgs(argv)
  if (next && next !== wordDir) {
    cancelWordSession()
    wordDir = next
  }
  showWindow()
  if (!next || !mainWindow) return
  mainWindow.setTitle(windowTitle())
  const win = mainWindow
  const send = (): void => void readSession().then((session) => win.webContents.send('word:session', session))
  // Cửa sổ vừa tạo lại sẽ tự hỏi 'word:session' khi nạp xong.
  if (!win.webContents.isLoading()) send()
})

app.whenReady().then(() => {
  if (!isFirstInstance) return
  registerFileHandlers()
  registerWordHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
