import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const mathjaxVersion: string = JSON.parse(readFileSync('node_modules/mathjax-full/package.json', 'utf8')).version

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    plugins: [react()],
    // MathJax đọc phiên bản bằng require() của Node nếu thiếu hằng số này, gây lỗi trong trình duyệt.
    define: { PACKAGE_VERSION: JSON.stringify(mathjaxVersion) }
  }
})
