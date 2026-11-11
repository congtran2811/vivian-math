import { useEffect, useRef, useState } from 'react'
import { convertLatexToMathMl, type MathfieldElement } from 'mathlive'

// Mẫu công thức thường gặp ở toán THCS.
const TEMPLATES: { label: string; latex: string }[] = [
  { label: 'Phân số', latex: '\\frac{#?}{#?}' },
  { label: 'Căn bậc hai', latex: '\\sqrt{#?}' },
  { label: 'Lũy thừa', latex: '#?^{#?}' },
  { label: 'Chỉ số dưới', latex: '#?_{#?}' },
  { label: 'Hệ phương trình', latex: '\\begin{cases}#? \\\\ #?\\end{cases}' },
  { label: 'Góc', latex: '\\widehat{#?}' },
  { label: 'Tam giác', latex: '\\triangle #?' },
  { label: 'Vuông góc', latex: '\\perp' },
  { label: 'Song song', latex: '\\parallel' },
  { label: 'Độ', latex: '^{\\circ}' },
  { label: '±', latex: '\\pm' },
  { label: '≤', latex: '\\le' },
  { label: '≥', latex: '\\ge' },
  { label: '≠', latex: '\\ne' },
  { label: 'π', latex: '\\pi' }
]

export default function App(): JSX.Element {
  const fieldRef = useRef<MathfieldElement | null>(null)
  const [latex, setLatex] = useState('x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.value = latex
    const onInput = (): void => setLatex(field.value)
    field.addEventListener('input', onInput)
    return () => field.removeEventListener('input', onInput)
    // Chỉ khởi tạo một lần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const insert = (tpl: string): void => {
    const field = fieldRef.current
    if (!field) return
    field.executeCommand(['insert', tpl])
    field.focus()
    setLatex(field.value)
  }

  const copy = async (kind: 'LaTeX' | 'MathML'): Promise<void> => {
    const text = kind === 'LaTeX' ? latex : `<math xmlns="http://www.w3.org/1998/Math/MathML">${convertLatexToMathMl(latex)}</math>`
    await navigator.clipboard.writeText(text)
    setCopied(kind)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="app">
      <header>
        <h1>Vivian Math</h1>
        <span>Trình soạn công thức toán</span>
      </header>

      <div className="palette">
        {TEMPLATES.map((t) => (
          <button key={t.label} onClick={() => insert(t.latex)} title={t.latex}>
            {t.label}
          </button>
        ))}
      </div>

      <math-field ref={fieldRef} class="editor" />

      <section className="output">
        <label>LaTeX</label>
        <textarea
          value={latex}
          onChange={(e) => {
            setLatex(e.target.value)
            if (fieldRef.current) fieldRef.current.value = e.target.value
          }}
        />
        <div className="actions">
          <button onClick={() => copy('LaTeX')}>Sao chép LaTeX</button>
          <button onClick={() => copy('MathML')}>Sao chép MathML (dán vào Word)</button>
          {copied && <span className="hint">Đã sao chép {copied}</span>}
        </div>
      </section>
    </div>
  )
}
