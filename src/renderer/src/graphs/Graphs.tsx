import { useMemo, useRef, useState } from 'react'
import { Tex, vn } from '../Tex'
import { num } from '../shapes3d/shapes'
import { savePng, saveSvg } from '../svgExport'

type Kind = 'linear' | 'quadratic' | 'inverse'

interface Fn {
  id: number
  kind: Kind
  a: number
  b: number
  color: string
}

interface Point {
  x: number
  y: number
  label: string
}

const KINDS: { id: Kind; name: string }[] = [
  { id: 'linear', name: 'y = ax + b' },
  { id: 'quadratic', name: 'y = ax²' },
  { id: 'inverse', name: 'y = a/x' }
]
const COLORS = ['#2b4eff', '#e11d48', '#059669', '#d97706']
const SIZE = 640
const PAD = 24

const evalFn = (f: Fn, x: number): number =>
  f.kind === 'linear' ? f.a * x + f.b : f.kind === 'quadratic' ? f.a * x * x : f.a / x

/** Hệ số kèm dấu để ghép vào công thức, ví dụ a = -1 thành "-", a = 2 thành "2". */
function coef(a: number): string {
  if (a === 1) return ''
  if (a === -1) return '-'
  return num(a)
}

function formula(f: Fn): string {
  if (f.kind === 'quadratic') return `y=${coef(f.a)}x^2`
  if (f.kind === 'inverse') return `y=\\frac{${num(f.a)}}{x}`
  if (f.a === 0) return `y=${num(f.b)}`
  const tail = f.b === 0 ? '' : f.b > 0 ? `+${num(f.b)}` : `-${num(-f.b)}`
  return `y=${coef(f.a)}x${tail}`
}

function describe(f: Fn): string[] {
  if (f.kind === 'linear') {
    if (f.a === 0) return [`Hàm hằng, đồ thị là đường thẳng song song với trục Ox, cắt Oy tại (0; ${vn(f.b)}).`]
    return [
      f.a > 0 ? 'Hàm số đồng biến trên R (vì a > 0).' : 'Hàm số nghịch biến trên R (vì a < 0).',
      `Cắt trục Oy tại (0; ${vn(f.b)}), cắt trục Ox tại (${vn(-f.b / f.a)}; 0).`
    ]
  }
  if (f.kind === 'quadratic') {
    if (f.a === 0) return ['Với a = 0 thì y = 0, đồ thị trùng trục Ox.']
    return f.a > 0
      ? ['Parabol đỉnh O(0; 0), bề lõm quay lên, nhận Oy làm trục đối xứng.', 'Nghịch biến khi x < 0, đồng biến khi x > 0.']
      : ['Parabol đỉnh O(0; 0), bề lõm quay xuống, nhận Oy làm trục đối xứng.', 'Đồng biến khi x < 0, nghịch biến khi x > 0.']
  }
  if (f.a === 0) return ['Với a = 0 thì y = 0 (x ≠ 0).']
  return [
    'Đại lượng y tỉ lệ nghịch với x, đồ thị là hai nhánh hypebol.',
    f.a > 0 ? 'Hai nhánh nằm ở góc phần tư thứ I và III.' : 'Hai nhánh nằm ở góc phần tư thứ II và IV.'
  ]
}

/** Giao điểm của đường thẳng với đường thẳng hoặc parabol (các dạng học ở THCS). */
function intersections(f: Fn, g: Fn): { x: number; y: number }[] {
  const [line, other] = f.kind === 'linear' ? [f, g] : [g, f]
  if (line.kind !== 'linear') return []
  let xs: number[] = []
  if (other.kind === 'linear') {
    if (line.a !== other.a) xs = [(other.b - line.b) / (line.a - other.a)]
  } else if (other.kind === 'quadratic' && other.a !== 0) {
    // other.a x² = line.a x + line.b
    const delta = line.a ** 2 + 4 * other.a * line.b
    if (delta === 0) xs = [line.a / (2 * other.a)]
    else if (delta > 0) xs = [(line.a - Math.sqrt(delta)) / (2 * other.a), (line.a + Math.sqrt(delta)) / (2 * other.a)]
  }
  return xs.map((x) => ({ x, y: line.a * x + line.b }))
}

export default function Graphs(): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const nextId = useRef(3)
  const [fns, setFns] = useState<Fn[]>([
    { id: 1, kind: 'linear', a: 1, b: 2, color: COLORS[0] },
    { id: 2, kind: 'quadratic', a: 1, b: 0, color: COLORS[1] }
  ])
  const [range, setRange] = useState(6)
  const [status, setStatus] = useState('')

  // Đổi tọa độ toán học (trục y hướng lên) sang tọa độ màn hình.
  const unit = (SIZE - 2 * PAD) / (2 * range)
  const sx = (x: number): number => SIZE / 2 + x * unit
  const sy = (y: number): number => SIZE / 2 - y * unit

  const paths = useMemo(
    () =>
      fns.map((f) => {
        let d = ''
        let pen = false
        const n = 600
        for (let i = 0; i <= n; i++) {
          const x = -range + (2 * range * i) / n
          const y = evalFn(f, x)
          // Ngắt nét khi ra ngoài khung hoặc qua điểm không xác định (x = 0 của y = a/x).
          if (!Number.isFinite(y) || Math.abs(y) > range * 1.5) {
            pen = false
            continue
          }
          d += `${pen ? 'L' : 'M'}${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`
          pen = true
        }
        return d
      }),
    // sx, sy chỉ phụ thuộc range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fns, range]
  )

  const points = useMemo(() => {
    const out: (Point & { color: string })[] = []
    fns.forEach((f, i) => {
      fns.slice(i + 1).forEach((g) => {
        intersections(f, g).forEach((p) =>
          out.push({ ...p, label: `(${vn(p.x)}; ${vn(p.y)})`, color: '#111827' })
        )
      })
    })
    return out.filter((p) => Math.abs(p.x) <= range && Math.abs(p.y) <= range)
  }, [fns, range])

  const update = (id: number, patch: Partial<Fn>): void =>
    setFns((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const add = (): void =>
    setFns((list) => [
      ...list,
      { id: nextId.current++, kind: 'linear', a: -1, b: 1, color: COLORS[list.length % COLORS.length] }
    ])

  const exportAs = async (kind: 'png' | 'svg'): Promise<void> => {
    try {
      const saved = await (kind === 'png' ? savePng : saveSvg)(svgRef.current!, 'do-thi')
      if (saved) setStatus(`Đã xuất ${saved.split(/[\\/]/).pop()}`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    }
  }

  const tick = range > 10 ? 2 : 1
  const ticks: number[] = []
  for (let t = -Math.floor(range / tick) * tick; t <= range; t += tick) ticks.push(t)
  const font = 'Segoe UI, system-ui, sans-serif'

  return (
    <div className="panel-view">
      <aside>
        {fns.map((f, i) => (
          <div className="fn-card" key={f.id} style={{ borderLeftColor: f.color }}>
            <div className="fn-head">
              <Tex latex={formula(f)} />
              {fns.length > 1 && (
                <button className="link" title="Xóa hàm số" onClick={() => setFns((l) => l.filter((x) => x.id !== f.id))}>
                  Xóa
                </button>
              )}
            </div>
            <div className="fn-inputs">
              <select value={f.kind} aria-label={`Dạng hàm số ${i + 1}`} onChange={(e) => update(f.id, { kind: e.target.value as Kind })}>
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
              <label>
                a
                <input type="number" step={0.5} value={f.a} onChange={(e) => update(f.id, { a: Number(e.target.value) || 0 })} />
              </label>
              {f.kind === 'linear' && (
                <label>
                  b
                  <input type="number" step={0.5} value={f.b} onChange={(e) => update(f.id, { b: Number(e.target.value) || 0 })} />
                </label>
              )}
            </div>
            {describe(f).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ))}
        {fns.length < 4 && <button onClick={add}>Thêm hàm số</button>}

        {points.length > 0 && (
          <div className="fn-card">
            <strong>Giao điểm</strong>
            {points.map((p) => (
              <p key={p.label}>{p.label}</p>
            ))}
          </div>
        )}

        <label className="field">
          Phạm vi trục: từ {-range} đến {range}
          <input type="range" min={3} max={20} value={range} onChange={(e) => setRange(Number(e.target.value))} />
        </label>
        <div className="shape-actions">
          <button onClick={() => void exportAs('png')}>Xuất ảnh PNG</button>
          <button onClick={() => void exportAs('svg')}>Xuất ảnh SVG</button>
        </div>
        {status && <p className="status">{status}</p>}
      </aside>

      <svg ref={svgRef} viewBox={`0 0 ${SIZE} ${SIZE}`} className="stage square">
        <defs>
          <clipPath id="plot-area">
            <rect x={PAD} y={PAD} width={SIZE - 2 * PAD} height={SIZE - 2 * PAD} />
          </clipPath>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="#111827" />
          </marker>
        </defs>
        <rect width={SIZE} height={SIZE} fill="#ffffff" />
        {ticks.map((t) => (
          <g key={t} stroke="#e5e7eb" strokeWidth={1}>
            <line x1={sx(t)} y1={PAD} x2={sx(t)} y2={SIZE - PAD} />
            <line x1={PAD} y1={sy(t)} x2={SIZE - PAD} y2={sy(t)} />
          </g>
        ))}
        <g stroke="#111827" strokeWidth={1.5} markerEnd="url(#arrow)">
          <line x1={PAD} y1={SIZE / 2} x2={SIZE - PAD + 14} y2={SIZE / 2} />
          <line x1={SIZE / 2} y1={SIZE - PAD} x2={SIZE / 2} y2={PAD - 14} />
        </g>
        <g fontFamily={font} fontSize={12} fill="#4b5563">
          {ticks.filter((t) => t !== 0).map((t) => (
            <g key={t}>
              <text x={sx(t)} y={SIZE / 2 + 16} textAnchor="middle">{t}</text>
              <text x={SIZE / 2 - 8} y={sy(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
          <text x={SIZE / 2 - 8} y={SIZE / 2 + 16} textAnchor="end">O</text>
          <text x={SIZE - PAD + 8} y={SIZE / 2 - 10} fontStyle="italic" fontSize={15}>x</text>
          <text x={SIZE / 2 + 10} y={PAD - 6} fontStyle="italic" fontSize={15}>y</text>
        </g>
        <g clipPath="url(#plot-area)" fill="none" strokeWidth={2.5}>
          {fns.map((f, i) => (
            <path key={f.id} d={paths[i]} stroke={f.color} />
          ))}
        </g>
        <g fontFamily={font} fontSize={13}>
          {points.map((p) => (
            <g key={p.label}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={p.color} />
              <text x={sx(p.x) + 8} y={sy(p.y) - 8} fill={p.color} stroke="#ffffff" strokeWidth={3} paintOrder="stroke">
                {p.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}
