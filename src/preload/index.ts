import { contextBridge, ipcRenderer } from 'electron'

// Cầu nối an toàn giữa giao diện và hệ thống: giao diện chỉ gọi được đúng các hàm dưới đây.
contextBridge.exposeInMainWorld('vivian', {
  platform: process.platform,
  saveFile: (args: unknown) => ipcRenderer.invoke('file:save', args),
  openFile: (args: unknown) => ipcRenderer.invoke('file:open', args),
  wordSession: () => ipcRenderer.invoke('word:session'),
  wordFinish: (args: unknown) => ipcRenderer.invoke('word:finish', args),
  onWordSession: (cb: (session: unknown) => void) => {
    ipcRenderer.on('word:session', (_event, session) => cb(session))
  },
  wordBatch: () => ipcRenderer.invoke('word:batch'),
  wordBatchFinish: (args: unknown) => ipcRenderer.invoke('word:batchFinish', args),
  onWordBatch: (cb: () => void) => {
    ipcRenderer.on('word:batch', () => cb())
  },
  wordCancel: () => ipcRenderer.invoke('word:cancel'),
  installWordAddin: () => ipcRenderer.invoke('word:installAddin')
})
