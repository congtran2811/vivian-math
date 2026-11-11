/** Lưu danh sách công thức (yêu thích, gần đây) trên máy người dùng. */
export function loadList(key: string): string[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Không lưu được (ví dụ hết dung lượng) thì danh sách vẫn dùng được trong phiên này.
  }
}
