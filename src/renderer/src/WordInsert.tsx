import { useState } from 'react'

/** Gửi một ảnh PNG về Word làm hình chèn vào văn bản. widthPt là bề rộng hình trong Word, tính bằng point. */
export async function insertImageIntoWord(blob: Blob, widthPx: number, heightPx: number, widthPt: number): Promise<void> {
  if (!window.vivian) return
  await window.vivian.wordFinish({
    png: new Uint8Array(await blob.arrayBuffer()),
    // Hình vẽ không có LaTeX: Word nhận biết đây là hình chứ không phải công thức.
    latex: '',
    width: widthPt,
    height: (widthPt * heightPx) / widthPx,
    depth: 0
  })
}

/** Thanh "đang soạn cho Word" của các phần hình vẽ: chèn hình đang xem vào Word. */
export function WordFigureBanner({ onInsert, disabled }: { onInsert: () => Promise<void>; disabled?: boolean }): JSX.Element {
  const [error, setError] = useState('')
  const insert = async (): Promise<void> => {
    try {
      setError('')
      await onInsert()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="word-banner">
      <span>{error || 'Đang soạn cho Word: chèn hình này vào văn bản'}</span>
      <button className="primary" onClick={() => void insert()} disabled={disabled}>Chèn vào Word</button>
      <button onClick={() => void window.vivian?.wordCancel()}>Hủy</button>
    </div>
  )
}
