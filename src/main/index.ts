import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    title: 'Vivian Math',
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

app.whenReady().then(() => {
  registerFileHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
