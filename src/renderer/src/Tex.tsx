import { useMemo } from 'react'
import { convertLatexToMarkup } from 'mathlive'

/** Hiển thị một công thức LaTeX tĩnh (không sửa được). */
export function Tex({ latex }: { latex: string }): JSX.Element {
  const html = useMemo(() => convertLatexToMarkup(latex), [latex])
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

/** Viết số kiểu Việt Nam (dấu phẩy thập phân), tối đa 2 chữ số lẻ, dùng trong văn bản thường. */
export function vn(x: number): string {
  return (Math.round(x * 100) / 100).toString().replace('.', ',')
}
