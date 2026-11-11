import type { DetailedHTMLProps, HTMLAttributes } from 'react'
import type { MathfieldElement } from 'mathlive'
import type { FileFilter } from './files'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': DetailedHTMLProps<HTMLAttributes<MathfieldElement>, MathfieldElement> & { class?: string }
    }
  }
  interface Window {
    vivian?: {
      platform: string
      saveFile(args: {
        defaultName: string
        data: string | Uint8Array
        filter: FileFilter
        path?: string
      }): Promise<string | null>
      openFile(args: { filter: FileFilter }): Promise<{ path: string; content: string } | null>
      /** Có giá trị khi phần mềm được Word mở để soạn một công thức. */
      wordSession(): Promise<{ latex: string; fontSize: number } | null>
      wordFinish(args: { png: Uint8Array; latex: string; width: number; height: number; depth: number }): Promise<void>
      /** Gọi khi Word gửi công thức mới cho cửa sổ đang mở (session), hoặc khi soạn xong (null). */
      onWordSession(cb: (session: { latex: string; fontSize: number } | null) => void): void
      wordCancel(): Promise<void>
      installWordAddin(): Promise<string>
    }
  }
}
