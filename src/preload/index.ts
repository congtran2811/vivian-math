import { contextBridge } from 'electron'

// Cầu nối an toàn giữa giao diện và hệ thống. Sẽ thêm lưu/mở file ở Bước 2.
contextBridge.exposeInMainWorld('vivian', {
  platform: process.platform
})
