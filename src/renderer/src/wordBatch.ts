import { latexToPng, latexToSvg } from './exportImage'

let running = false

// Dựng lần lượt các lô công thức Word gửi sang (đổi $...$ thành công thức, đổi cỡ hàng loạt).
// Công thức sai cú pháp trả về null để Word giữ nguyên chỗ đó.
async function drain(): Promise<void> {
  if (running || !window.vivian?.wordBatch) return
  running = true
  try {
    for (;;) {
      const batch = await window.vivian.wordBatch()
      if (!batch) break
      const results: ({ png: Uint8Array; width: number; height: number; depth: number } | null)[] = []
      for (const item of batch.items) {
        try {
          const opts = { fontSize: item.fontSize, color: '#000000' }
          const { width, height, depth } = latexToSvg(item.latex, opts)
          const blob = await latexToPng(item.latex, opts, 4)
          results.push({ png: new Uint8Array(await blob.arrayBuffer()), width, height, depth })
        } catch {
          results.push(null)
        }
      }
      await window.vivian.wordBatchFinish({ dir: batch.dir, results })
    }
  } finally {
    running = false
  }
}

export function startWordBatches(): void {
  window.vivian?.onWordBatch?.(() => void drain())
  void drain()
}
