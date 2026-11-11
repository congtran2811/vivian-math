import { MathMLToLaTeX } from 'mathml-to-latex'

const MATH_TAG = /<(?:\w+:)?math[\s>][\s\S]*?<\/(?:\w+:)?math>/i

/** Kiểm tra đoạn văn bản có chứa công thức MathML (kiểu Word sao chép ra) hay không. */
export function hasMathML(text: string): boolean {
  return MATH_TAG.test(text)
}

/** Sửa các chỗ bộ chuyển đổi sinh ra LaTeX chưa hợp lệ hoặc chưa đẹp. */
function tidy(latex: string): string {
  return (
    latex
      // Ngoặc một phía của Word (ví dụ hệ phương trình) cần dấu chấm làm ngoặc ẩn.
      .replace(/\\right(?![a-zA-Z])(?!\s*[.)\]|\\>/])/g, '\\right.')
      .replace(/\\left(?![a-zA-Z])(?!\s*[.(\[|\\</])/g, '\\left.')
      // Dấu mũ phủ nhiều chữ (góc ABC) dùng dạng rộng.
      .replace(/\\hat\{([^{}]{2,})\}/g, (_, inner: string) => `\\widehat{${inner.replace(/\s+/g, '')}}`)
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * Chuyển nội dung sao chép từ Word thành LaTeX.
 * Word đưa công thức vào bộ nhớ tạm dưới dạng MathML (có tiền tố mml:). Cũng nhận LaTeX dán thẳng.
 */
export function clipboardToLatex(text: string): string {
  const match = text.match(MATH_TAG)
  if (match) {
    const mathml = match[0].replace(/<(\/?)\w+:/g, '<$1').replace(/\sxmlns(:\w+)?="[^"]*"/g, '')
    const latex = tidy(MathMLToLaTeX.convert(mathml))
    if (!latex) throw new Error('Không đọc được công thức trong nội dung đã sao chép.')
    return latex
  }
  const plain = text.trim().replace(/^\$\$?|\$\$?$/g, '').trim()
  if (/\\[a-zA-Z]+|[\^_]/.test(plain)) return plain
  throw new Error(
    'Không thấy công thức trong bộ nhớ tạm. Trong Word, hãy bấm chọn công thức rồi Ctrl+C. Nếu vẫn không được, vào File > Options > Advanced và chọn "Copy MathML to the clipboard as plain text".'
  )
}
