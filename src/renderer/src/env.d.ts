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
    }
  }
}
