import { useEffect, useMemo, useRef, useState } from 'react'
import { convertLatexToMarkup, convertLatexToMathMl, type MathfieldElement, type Selector } from 'mathlive'
import { GROUPS } from './symbols'
import { latexToPng, latexToSvg } from './exportImage'
import { VMATH_FILTER, openFile, parse, saveFile, serialize } from './files'
import { loadList, saveList } from './storage'
import { clipboardToLatex, hasMathML } from './wordPaste'

const START = 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}'
const FONT_SIZES = [16, 20, 24, 32, 48, 64]
const ZOOMS = [20, 28, 36, 48, 64]
const FAVORITES_KEY = 'vivian.favorites'
const RECENT_KEY = 'vivian.recent'
const MAX_RECENT = 12
const MAX_FAVORITES = 40

// Phím tắt chèn nhanh, theo thói quen của MathType (Ctrl + phím).
const SHORTCUTS: { key: string; shift?: boolean; insert: string; label: string; name: string }[] = [
  { key: 'f', insert: '\\frac{#@}{#?}', label: 'Ctrl+F', name: 'Phân số' },
  { key: 'r', insert: '\\sqrt{#@}', label: 'Ctrl+R', name: 'Căn bậc hai' },
  { key: 'h', insert: '#@^{#?}', label: 'Ctrl+H', name: 'Chỉ số trên (lũy thừa)' },
  { key: 'l', insert: '#@_{#?}', label: 'Ctrl+L', name: 'Chỉ số dưới' },
  { key: 'j', insert: '#@_{#?}^{#?}', label: 'Ctrl+J', name: 'Chỉ số trên và dưới' },
  { key: '9', insert: '\\left(#@\\right)', label: 'Ctrl+9', name: 'Ngoặc tròn' },
  { key: '[', insert: '\\left[#@\\right]', label: 'Ctrl+[', name: 'Ngoặc vuông' },
  { key: '{', shift: true, insert: '\\left\\{#@\\right\\}', label: 'Ctrl+Shift+[', name: 'Ngoặc nhọn' },
  { key: 't', insert: '\\left|#@\\right|', label: 'Ctrl+T', name: 'Giá trị tuyệt đối' },
  { key: 'e', insert: '\\text{#?}', label: 'Ctrl+E', name: 'Chữ thường (lời văn)' }
]

const MATRIX_COMMANDS = [
  { command: 'addRowAfter', name: 'Thêm hàng' },
  { command: 'addColumnAfter', name: 'Thêm cột' },
  { command: 'removeRow', name: 'Xóa hàng' },
  { command: 'removeColumn', name: 'Xóa cột' }
] as const

const FAVORITES_TAB = GROUPS.length
const RECENT_TAB = GROUPS.length + 1

const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path
const markup = (latex: string): string => convertLatexToMarkup(latex, { defaultMode: 'math' })

export default function App(): JSX.Element {
  const fieldRef = useRef<MathfieldElement | null>(null)
  const [latex, setLatex] = useState(START)
  const [group, setGroup] = useState(0)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [fontSize, setFontSize] = useState(24)
  const [color, setColor] = useState('#000000')
  const [zoom, setZoom] = useState(28)
  const [favorites, setFavorites] = useState<string[]>(() => loadList(FAVORITES_KEY))
  const [recent, setRecent] = useState<string[]>(() => loadList(RECENT_KEY))
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null)
  // Khác null khi Word mở phần mềm để soạn một công thức; fontSize là cỡ chữ của dòng văn bản trong Word.
  const [word, setWord] = useState<{ fontSize: number } | null>(null)

  const say = (text: string, error = false): void => {
    setStatus({ text, error })
    // Thông báo lỗi thường dài hơn nên giữ lâu hơn.
    setTimeout(() => setStatus((s) => (s?.text === text ? null : s)), error ? 9000 : 3000)
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

  const insert = (tpl: string): void => {
    const field = fieldRef.current
    if (!field) return
    field.executeCommand(['insert', tpl])
    field.focus()
    setLatex(field.value)
    setDirty(true)
  }

  useEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.value = START
    const onInput = (): void => {
      setLatex(field.value)
      setDirty(true)
    }
    // Bắt phím tắt trước khi MathLive xử lý, để Ctrl+F, Ctrl+R... chèn mẫu như MathType.
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const hit = SHORTCUTS.find((s) => s.key === e.key.toLowerCase() && !!s.shift === e.shiftKey)
      if (!hit) return
      e.preventDefault()
      e.stopPropagation()
      insert(hit.insert)
    }
    // Dán công thức sao chép từ Word (MathML): đổi sang LaTeX rồi chèn tại con trỏ.
    const onPaste = (e: ClipboardEvent): void => {
      const text = e.clipboardData?.getData('text/plain') ?? ''
      if (!hasMathML(text)) return
      e.preventDefault()
      e.stopPropagation()
      try {
        insert(clipboardToLatex(text))
        say('Đã dán công thức từ Word')
      } catch (err) {
        say(err instanceof Error ? err.message : String(err), true)
      }
    }
    field.addEventListener('input', onInput)
    field.addEventListener('keydown', onKey, { capture: true })
    field.addEventListener('paste', onPaste, { capture: true })
    return () => {
      field.removeEventListener('input', onInput)
      field.removeEventListener('keydown', onKey, { capture: true })
      field.removeEventListener('paste', onPaste, { capture: true })
    }
    // Chỉ gắn một lần: insert chỉ dùng ref và các hàm setState ổn định.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const command = (name: Selector): void => {
    const field = fieldRef.current
    if (!field) return
    field.executeCommand(name)
    field.focus()
    setLatex(field.value)
    setDirty(true)
  }

  /** Ghi nhớ công thức vừa lưu, xuất hoặc sao chép vào danh sách gần đây. */
  const remember = (value: string): void => {
    if (!value.trim()) return
    setRecent((list) => {
      const next = [value, ...list.filter((x) => x !== value)].slice(0, MAX_RECENT)
      saveList(RECENT_KEY, next)
      return next
    })
  }

  const addFavorite = (): void => {
    const field = fieldRef.current
    if (!field) return
    // Nếu đang bôi đen một phần thì chỉ lưu phần đó, giống kéo biểu thức lên thanh công cụ của MathType.
    const value = (field.selectionIsCollapsed ? field.value : field.getValue(field.selection, 'latex')).trim()
    if (!value) return say('Chưa có công thức để thêm vào yêu thích.', true)
    if (favorites.includes(value)) return say('Công thức này đã có trong yêu thích.')
    const next = [...favorites, value].slice(-MAX_FAVORITES)
    setFavorites(next)
    saveList(FAVORITES_KEY, next)
    setGroup(FAVORITES_TAB)
    say('Đã thêm vào yêu thích')
  }

  const removeFavorite = (value: string): void => {
    const next = favorites.filter((x) => x !== value)
    setFavorites(next)
    saveList(FAVORITES_KEY, next)
  }

  const colorSelection = (): void => {
    const field = fieldRef.current
    if (!field) return
    if (field.selectionIsCollapsed) return say('Hãy bôi đen phần công thức cần tô màu trước.', true)
    field.applyStyle({ color })
    field.focus()
    setLatex(field.value)
    setDirty(true)
  }

  const onPasteFromWord = async (): Promise<void> => {
    const converted = clipboardToLatex(await navigator.clipboard.readText())
    if (!confirmDiscard()) return
    setFormula(converted, true)
    fieldRef.current?.focus()
    say('Đã dán công thức từ Word')
  }

  // Hỏi xem có phải Word vừa mở phần mềm không, nếu có thì nạp công thức cần sửa.
  useEffect(() => {
    void window.vivian?.wordSession?.().then((session) => {
      if (!session) return
      setWord({ fontSize: session.fontSize })
      setFormula(session.latex, false)
      fieldRef.current?.focus()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onInsertIntoWord = async (): Promise<void> => {
    if (!word || !window.vivian) return
    requireFormula()
    // Vẽ theo đúng cỡ chữ của Word (1 px ứng với 1 point), ảnh phóng 4 lần để in ra vẫn nét.
    const opts = { fontSize: word.fontSize, color }
    const { width, height, depth } = latexToSvg(latex, opts)
    const blob = await latexToPng(latex, opts, 4)
    remember(latex)
    await window.vivian.wordFinish({ png: new Uint8Array(await blob.arrayBuffer()), latex, width, height, depth })
  }

  const WORD_INSTALL_MESSAGES: Record<string, string> = {
    OK: 'Đã cài bộ nút Vivian Math vào Word. Mở lại Word và xem thẻ Add-Ins.',
    NOT_WINDOWS: 'Hiện chỉ hỗ trợ Word trên Windows.',
    WORD_RUNNING: 'Hãy đóng hết các cửa sổ Word rồi bấm lại.',
    NO_WORD: 'Không tìm thấy Microsoft Word trên máy này.'
  }

  const onInstallWordAddin = async (): Promise<void> => {
    if (!window.vivian?.installWordAddin) throw new Error('Chức năng này chỉ có trong phần mềm cài trên máy.')
    say('Đang cài bộ nút vào Word, chờ một chút…')
    const result = await window.vivian.installWordAddin()
    const [kind, ...rest] = result.split(' ')
    const code = kind === 'OK' ? 'OK' : rest[0]
    const message = WORD_INSTALL_MESSAGES[code] ?? `Không cài được vào Word: ${rest.join(' ')}`
    say(message, kind !== 'OK')
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
    remember(latex)
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
    if (!saved) return
    remember(latex)
    say(`Đã xuất ${baseName(saved)}`)
  }

  const onExportPng = async (): Promise<void> => {
    requireFormula()
    const blob = await latexToPng(latex, { fontSize, color })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const saved = await saveFile(imageName('png'), bytes, { name: 'Ảnh PNG', extensions: ['png'] })
    if (!saved) return
    remember(latex)
    say(`Đã xuất ${baseName(saved)}`)
  }

  const onCopyImage = async (): Promise<void> => {
    requireFormula()
    const blob = await latexToPng(latex, { fontSize, color })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    remember(latex)
    say('Đã sao chép ảnh, dán vào Word hoặc PowerPoint bằng Ctrl+V')
  }

  const onCopyText = async (kind: 'LaTeX' | 'MathML'): Promise<void> => {
    const text =
      kind === 'LaTeX'
        ? latex
        : `<math xmlns="http://www.w3.org/1998/Math/MathML">${convertLatexToMathMl(latex)}</math>`
    await navigator.clipboard.writeText(text)
    remember(latex)
    say(`Đã sao chép ${kind}`)
  }

  // Phím tắt file giống các phần mềm văn phòng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'enter' && word) {
        e.preventDefault()
        void run(onInsertIntoWord)()
      } else if (key === 's') {
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
  const labels = useMemo(() => GROUPS.map((g) => g.items.map((it) => markup(it.show))), [])
  const favoriteLabels = useMemo(() => favorites.map(markup), [favorites])
  const recentLabels = useMemo(() => recent.map(markup), [recent])

  const title = (filePath ? baseName(filePath) : 'Chưa đặt tên') + (dirty ? ' •' : '')
  const zoomStep = (dir: 1 | -1): void =>
    setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + dir))])

  return (
    <div className="app">
      <header>
        <h1>Vivian Math</h1>
        <span className="filename">{title}</span>
        {status && <span className={status.error ? 'status error' : 'status'}>{status.text}</span>}
      </header>

      {word && (
        <div className="word-banner">
          <span>Đang soạn công thức cho Word (cỡ chữ {word.fontSize} pt)</span>
          <button className="primary" onClick={run(onInsertIntoWord)}>Chèn vào Word</button>
          <button onClick={() => void window.vivian?.wordCancel()}>Hủy</button>
        </div>
      )}

      <div className="toolbar">
        <button onClick={onNew} title="Ctrl+N">Mới</button>
        <button onClick={run(onOpen)} title="Ctrl+O">Mở</button>
        <button onClick={run(() => onSave(false))} title="Ctrl+S">Lưu</button>
        <button onClick={run(() => onSave(true))} title="Ctrl+Shift+S">Lưu thành</button>
        <span className="sep" />
        <button onClick={run(onPasteFromWord)} title="Sao chép công thức trong Word (Ctrl+C) rồi bấm nút này">Dán từ Word</button>
        <button onClick={() => command('undo')} title="Ctrl+Z">Hoàn tác</button>
        <button onClick={() => command('redo')} title="Ctrl+Y">Làm lại</button>
        <span className="sep" />
        <button onClick={() => zoomStep(-1)} title="Thu nhỏ vùng soạn" disabled={zoom === ZOOMS[0]}>A−</button>
        <button onClick={() => zoomStep(1)} title="Phóng to vùng soạn" disabled={zoom === ZOOMS[ZOOMS.length - 1]}>A+</button>
        <span className="sep" />
        <label>
          Màu
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <button onClick={colorSelection} title="Tô màu đang chọn cho phần công thức được bôi đen">Tô màu phần chọn</button>
        <span className="sep" />
        <label>
          Cỡ ảnh
          <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button onClick={run(onExportPng)}>Xuất PNG</button>
        <button onClick={run(onExportSvg)}>Xuất SVG</button>
        <button onClick={run(onCopyImage)}>Sao chép ảnh</button>
        <span className="sep" />
        <button onClick={addFavorite} title="Lưu công thức (hoặc phần đang bôi đen) để dùng lại">★ Yêu thích</button>
        <button onClick={() => setShowShortcuts((v) => !v)} className={showShortcuts ? 'on' : ''}>Phím tắt</button>
        {!word && (
          <button onClick={run(onInstallWordAddin)} title="Thêm các nút Chèn công thức vào thẻ Add-Ins của Word">
            Cài vào Word
          </button>
        )}
      </div>

      {showShortcuts && (
        <div className="shortcuts">
          {SHORTCUTS.map((s) => (
            <span key={s.label}>
              <kbd>{s.label}</kbd> {s.name}
            </span>
          ))}
          <span><kbd>Ctrl+S</kbd> Lưu</span>
          <span><kbd>Ctrl+O</kbd> Mở</span>
          <span><kbd>Ctrl+N</kbd> Mới</span>
          <span><kbd>Ctrl+Z</kbd> Hoàn tác</span>
          <span><kbd>Tab</kbd> Sang ô trống kế tiếp</span>
        </div>
      )}

      <div className="tabs">
        {GROUPS.map((g, i) => (
          <button key={g.name} className={i === group ? 'tab active' : 'tab'} onClick={() => setGroup(i)}>
            {g.name}
          </button>
        ))}
        <button className={group === FAVORITES_TAB ? 'tab active' : 'tab'} onClick={() => setGroup(FAVORITES_TAB)}>
          ★ Yêu thích ({favorites.length})
        </button>
        <button className={group === RECENT_TAB ? 'tab active' : 'tab'} onClick={() => setGroup(RECENT_TAB)}>
          Gần đây
        </button>
      </div>

      {group < GROUPS.length && (
        <div className={GROUPS[group].wide ? 'palette wide' : 'palette'}>
          {GROUPS[group].items.map((it, i) => (
            <button
              key={it.title}
              title={it.title}
              onClick={() => insert(it.insert)}
              dangerouslySetInnerHTML={{ __html: labels[group][i] }}
            />
          ))}
          {GROUPS[group].name === 'Ma trận' &&
            MATRIX_COMMANDS.map((c) => (
              <button key={c.command} className="text-btn" title="Đặt con trỏ trong ma trận rồi bấm" onClick={() => command(c.command)}>
                {c.name}
              </button>
            ))}
        </div>
      )}

      {group === FAVORITES_TAB && (
        <div className="palette wide">
          {favorites.length === 0 && (
            <p className="empty">Chưa có công thức yêu thích. Soạn công thức rồi bấm "★ Yêu thích" để lưu lại dùng nhiều lần.</p>
          )}
          {favorites.map((f, i) => (
            <div className="fav" key={f}>
              <button title="Chèn vào công thức" onClick={() => insert(f)} dangerouslySetInnerHTML={{ __html: favoriteLabels[i] }} />
              <button className="remove" title="Xóa khỏi yêu thích" aria-label="Xóa khỏi yêu thích" onClick={() => removeFavorite(f)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {group === RECENT_TAB && (
        <div className="palette wide">
          {recent.length === 0 && (
            <p className="empty">Các công thức bạn lưu, xuất ảnh hoặc sao chép sẽ hiện ở đây.</p>
          )}
          {recent.map((r, i) => (
            <button
              key={r}
              title="Mở lại công thức này"
              onClick={() => confirmDiscard() && setFormula(r, false)}
              dangerouslySetInnerHTML={{ __html: recentLabels[i] }}
            />
          ))}
        </div>
      )}

      <math-field ref={fieldRef} class="editor" style={{ color, fontSize: zoom }} />

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
