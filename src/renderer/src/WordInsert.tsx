import { useState } from 'react'

export type FigureView = 'graphs' | 'plane' | 'shapes'
export interface FigureSource {
  view: FigureView
  state: unknown
}

// Word lưu chuỗi này cùng với hình (ở chỗ công thức lưu LaTeX) để Edit Equation mở lại đúng phần và đúng hình.
const FIGURE_PREFIX = '@figure:'

/** Đọc chuỗi Word gửi sang: trả về hình cần mở lại, hoặc null nếu đó là một công thức. */
export function parseFigure(source: string): FigureSource | null {
  if (!source.startsWith(FIGURE_PREFIX)) return null
  try {
    const data = JSON.parse(source.slice(FIGURE_PREFIX.length)) as FigureSource
    return ['graphs', 'plane', 'shapes'].includes(data.view) ? data : null
  } catch {
    return null
  }
}

/** Gửi một ảnh PNG về Word làm hình chèn vào văn bản. widthPt là bề rộng hình trong Word, tính bằng point. */
export async function insertImageIntoWord(
  blob: Blob,
  widthPx: number,
  heightPx: number,
  widthPt: number,
  source: FigureSource
): Promise<void> {
  if (!window.vivian) return
  await window.vivian.wordFinish({
    png: new Uint8Array(await blob.arrayBuffer()),
    latex: FIGURE_PREFIX + JSON.stringify(source),
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
