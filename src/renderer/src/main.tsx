import React from 'react'
import { createRoot } from 'react-dom/client'
import { MathfieldElement } from 'mathlive'
import 'mathlive/fonts.css'
import 'mathlive/static.css'
import App from './App'
import './styles.css'

// Font được đóng gói sẵn trong app, không tải từ mạng.
MathfieldElement.fontsDirectory = null
MathfieldElement.soundsDirectory = null

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
