export interface FileFilter {
  name: string
  extensions: string[]
}

export const VMATH_FILTER: FileFilter = { name: 'Công thức Vivian Math', extensions: ['vmath'] }

interface VmathFile {
  app: 'vivian-math'
  version: 1
  latex: string
}

export function serialize(latex: string): string {
  const file: VmathFile = { app: 'vivian-math', version: 1, latex }
  return JSON.stringify(file, null, 2)
}

export function parse(content: string): string {
  const data = JSON.parse(content) as Partial<VmathFile>
  if (data.app !== 'vivian-math' || typeof data.latex !== 'string') {
    throw new Error('Đây không phải file công thức Vivian Math.')
  }
  return data.latex
}

/** Lưu file qua hộp thoại của hệ điều hành. Trả về đường dẫn, hoặc null nếu người dùng hủy. */
export async function saveFile(
  defaultName: string,
  data: string | Uint8Array,
  filter: FileFilter,
  path?: string
): Promise<string | null> {
  if (window.vivian?.saveFile) return window.vivian.saveFile({ defaultName, data, filter, path })
  // Khi chạy trong trình duyệt (không có Electron): tải file xuống.
  const blob = new Blob([data as BlobPart])
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = defaultName
  a.click()
  URL.revokeObjectURL(a.href)
  return defaultName
}

export async function openFile(filter: FileFilter): Promise<{ path: string; content: string } | null> {
  if (window.vivian?.openFile) return window.vivian.openFile({ filter })
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = filter.extensions.map((e) => '.' + e).join(',')
    input.onchange = async () => {
      const f = input.files?.[0]
      resolve(f ? { path: f.name, content: await f.text() } : null)
    }
    input.click()
  })
}
