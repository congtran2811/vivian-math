import { useEffect, useMemo, useRef, useState } from 'react'
import { convertLatexToMarkup, convertLatexToMathMl, type MathfieldElement } from 'mathlive'
import { GROUPS } from './symbols'
import { latexToPng, latexToSvg } from './exportImage'
import { VMATH_FILTER, openFile, parse, saveFile, serialize } from './files'

const START = 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'
const FONT_SIZES = [16, 20, 24, 32, 48, 64]

const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path

export default function App(): JSX.Element {
  const fieldRef = useRef<MathfieldElement | null>(null)
  const [latex, setLatex] = useState(START)
  const [group, setGroup] = useState(0)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [fontSize, setFontSize] = useState(24)
  const [color, setColor] = useState('#000000')
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null)

  const say = (text: string, error = false): void => {
    setStatus({ text, error })
    setTimeout(() => setStatus((s) => (s?.text === text ? null : s)), 3000)
  }

  /** Chạy một thao tác và báo lỗi bằng tiếng Việt thay vì im lặng. */
  const run = (fn: () => Promise<void> | void) => async (): Promise<void> => {
    try {
      await fn()
    } catch (e) {
      say(e instanceof Error ? e.message : String(e), true)
    }
  }

  const setFormula = (value: string, markDirty: boolean): void => {
    if (fieldRef.current) fieldRef.current.value = value
    setLatex(value)
    setDirty(markDirty)
  }

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.value = START
    const onInput = (): void => {
      setLatex(field.value)
      setDirty(true)
    }
    field.addEventListener('input', onInput)
    return () => field.removeEventListener('input', onInput)
  }, [])

  const insert = (tpl: string): void => {
    const field = fieldRef.current
    if (!field) return
    field.executeCommand(['insert', tpl])
    field.focus()
    setLatex(field.value)
    setDirty(true)
  }

  const command = (name: 'undo' | 'redo'): void => {
    const field = fieldRef.current
    if (!field) return
    field.executeCommand(name)
    field.focus()
    setLatex(field.value)
  }

  const confirmDiscard = (): boolean =>
    !dirty || window.confirm('Công thức chưa được lưu. Bạn có muốn bỏ thay đổi không?')

  const onNew = (): void => {
    if (!confirmDiscard()) return
    setFormula('', false)
    setFilePath(null)
    fieldRef.current?.focus()
  }

  const onOpen = async (): Promise<void> => {
    if (!confirmDiscard()) return
    const file = await openFile(VMATH_FILTER)
    if (!file) return
    setFormula(parse(file.content), false)
    setFilePath(file.path)
    say(`Đã mở ${baseName(file.path)}`)
  }

  const onSave = async (saveAs: boolean): Promise<void> => {
    const name = filePath ? baseName(filePath) : 'cong-thuc.vmath'
    const saved = await saveFile(name, serialize(latex), VMATH_FILTER, saveAs ? undefined : (filePath ?? undefined))
    if (!saved) return
    setFilePath(saved)
    setDirty(false)
    say(`Đã lưu ${baseName(saved)}`)
  }

  const imageName = (ext: string): string =>
    (filePath ? baseName(filePath).replace(/\.vmath$/i, '') : 'cong-thuc') + '.' + ext

  const requireFormula = (): void => {
    if (!latex.trim()) throw new Error('Chưa có công thức để xuất.')
  }

  const onExportSvg = async (): Promise<void> => {
    requireFormula()
    const { svg } = latexToSvg(latex, { fontSize, color })
    const saved = await saveFile(imageName('svg'), svg, { name: 'Ảnh SVG', extensions: ['svg'] })
    if (saved) say(`Đã xuất ${baseName(saved)}`)
  }

  const onExportPng = async (): Promise<void> => {
    requireFormula()
    const blob = await latexToPng(latex, { fontSize, color })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const saved = await saveFile(imageName('png'), bytes, { name: 'Ảnh PNG', extensions: ['png'] })
    if (saved) say(`Đã xuất ${baseName(saved)}`)
  }

  const onCopyImage = async (): Promise<void> => {
    requireFormula()
    const blob = await latexToPng(latex, { fontSize, color })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    say('Đã sao chép ảnh, dán vào Word hoặc PowerPoint bằng Ctrl+V')
  }

  const onCopyText = async (kind: 'LaTeX' | 'MathML'): Promise<void> => {
    const text =
      kind === 'LaTeX'
        ? latex
        : `<math xmlns="http://www.w3.org/1998/Math/MathML">${convertLatexToMathMl(latex)}</math>`
    await navigator.clipboard.writeText(text)
    say(`Đã sao chép ${kind}`)
  }

  // Phím tắt giống các phần mềm văn phòng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        void run(() => onSave(e.shiftKey))()
      } else if (key === 'o') {
        e.preventDefault()
        void run(onOpen)()
      } else if (key === 'n') {
        e.preventDefault()
        onNew()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Vẽ sẵn nhãn các nút, chỉ tính một lần.
  const labels = useMemo(
    () => GROUPS.map((g) => g.items.map((it) => convertLatexToMarkup(it.show, { defaultMode: 'math' }))),
    []
  )

  const title = (filePath ? baseName(filePath) : 'Chưa đặt tên') + (dirty ? ' •' : '')

  return (
    <div className="app">
      <header>
        <h1>Vivian Math</h1>
        <span className="filename">{title}</span>
        {status && <span className={status.error ? 'status error' : 'status'}>{status.text}</span>}
      </header>

      <div className="toolbar">
        <button onClick={onNew} title="Ctrl+N">Mới</button>
        <button onClick={run(onOpen)} title="Ctrl+O">Mở</button>
        <button onClick={run(() => onSave(false))} title="Ctrl+S">Lưu</button>
        <button onClick={run(() => onSave(true))} title="Ctrl+Shift+S">Lưu thành</button>
        <span className="sep" />
        <button onClick={() => command('undo')} title="Ctrl+Z">Hoàn tác</button>
        <button onClick={() => command('redo')} title="Ctrl+Y">Làm lại</button>
        <span className="sep" />
        <label>
          Cỡ chữ
          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Màu
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <button onClick={run(onExportPng)}>Xuất PNG</button>
        <button onClick={run(onExportSvg)}>Xuất SVG</button>
        <button onClick={run(onCopyImage)}>Sao chép ảnh</button>
      </div>

      <div className="tabs">
        {GROUPS.map((g, i) => (
          <button key={g.name} className={i === group ? 'tab active' : 'tab'} onClick={() => setGroup(i)}>
            {g.name}
          </button>
        ))}
      </div>
      <div className={GROUPS[group].wide ? 'palette wide' : 'palette'}>
        {GROUPS[group].items.map((it, i) => (
          <button
            key={it.title}
            title={it.title}
            onClick={() => insert(it.insert)}
            dangerouslySetInnerHTML={{ __html: labels[group][i] }}
          />
        ))}
      </div>

      <math-field ref={fieldRef} class="editor" style={{ color }} />

      <section className="output">
        <label>LaTeX</label>
        <textarea value={latex} spellCheck={false} onChange={(e) => setFormula(e.target.value, true)} />
        <div className="actions">
          <button onClick={run(() => onCopyText('LaTeX'))}>Sao chép LaTeX</button>
          <button onClick={run(() => onCopyText('MathML'))}>Sao chép MathML (dán vào Word)</button>
        </div>
      </section>
    </div>
  )
}
