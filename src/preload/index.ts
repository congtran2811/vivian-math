import { contextBridge, ipcRenderer } from 'electron'

// Cầu nối an toàn giữa giao diện và hệ thống: giao diện chỉ gọi được đúng các hàm dưới đây.
contextBridge.exposeInMainWorld('vivian', {
  platform: process.platform,
  saveFile: (args: unknown) => ipcRenderer.invoke('file:save', args),
  openFile: (args: unknown) => ipcRenderer.invoke('file:open', args)
})
