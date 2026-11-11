import { useMemo, useRef, useState } from 'react'
import { Tex } from '../Tex'
import { savePng, saveSvg, svgToPng } from '../svgExport'
import { WordFigureBanner, insertImageIntoWord } from '../WordInsert'
import { FIGURES, type Drawing, type P } from './figures'

const W = 640
const H = 520
const PAD = 56
const INK = '#1f2a5c'
const FILL = 'rgba(79, 124, 255, 0.18)'

/** Tính phép đổi từ tọa độ toán học sang màn hình sao cho hình nằm vừa khung. */
function fit(d: Drawing): (p: P) => P {
  const xs: number[] = []
  const ys: number[] = []
  const add = (p: P): void => {
    xs.push(p[0])
    ys.push(p[1])
  }
  d.polygon?.forEach(add)
  d.vertices?.forEach((v) => add(v.at))
  d.segments?.forEach((s) => (add(s.a), add(s.b)))
  d.circles?.forEach((c) => (add([c.c[0] - c.r, c.c[1] - c.r]), add([c.c[0] + c.r, c.c[1] + c.r])))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const scale = Math.min((W - 2 * PAD) / (maxX - minX || 1), (H - 2 * PAD) / (maxY - minY || 1))
  const ox = (W - (maxX - minX) * scale) / 2
  const oy = (H - (maxY - minY) * scale) / 2
  return ([x, y]) => [ox + (x - minX) * scale, H - oy - (y - minY) * scale]
}

function Figure({ drawing, svgRef }: { drawing: Drawing; svgRef: React.RefObject<SVGSVGElement> }): JSX.Element {
  const to = useMemo(() => fit(drawing), [drawing])
  const font = 'Segoe UI, system-ui, sans-serif'
  const poly = drawing.polygon?.map(to)
  // Tâm hình, để đẩy tên đỉnh ra phía ngoài.
  const ref = poly ?? drawing.vertices?.map((v) => to(v.at)) ?? []
  const cx = ref.reduce((s, p) => s + p[0], 0) / (ref.length || 1)
  const cy = ref.reduce((s, p) => s + p[1], 0) / (ref.length || 1)
  const unit = Math.abs(to([1, 0])[0] - to([0, 0])[0])

  let sector: string | null = null
  if (drawing.sector) {
    const { c, r, deg } = drawing.sector
    const rad = (deg * Math.PI) / 180
    const o = to(c)
    const a = to([c[0] + r, c[1]])
    const b = to([c[0] + r * Math.cos(rad), c[1] + r * Math.sin(rad)])
    // Trục y màn hình hướng xuống nên cung ngược chiều kim đồng hồ có sweep = 0.
    sector = `M${o[0]} ${o[1]}L${a[0]} ${a[1]}A${r * unit} ${r * unit} 0 ${deg > 180 ? 1 : 0} 0 ${b[0]} ${b[1]}Z`
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="stage plane">
      <rect width={W} height={H} fill="#ffffff" />
      {drawing.circles?.map((c, i) => {
        const o = to(c.c)
        return (
          <circle key={i} cx={o[0]} cy={o[1]} r={c.r * unit} fill="none" stroke={INK} strokeWidth={c.dashed ? 1.2 : 1.8} strokeDasharray={c.dashed ? '6 5' : undefined} />
        )
      })}
      {sector && <path d={sector} fill="rgba(79, 124, 255, 0.35)" stroke="none" />}
      {poly && <polygon points={poly.map((p) => p.join(',')).join(' ')} fill={FILL} stroke={INK} strokeWidth={2} strokeLinejoin="round" />}
      {drawing.segments?.map((s, i) => {
        const a = to(s.a)
        const b = to(s.b)
        return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={s.color ?? INK} strokeWidth={1.8} strokeDasharray={s.dashed ? '7 5' : undefined} />
      })}
      {drawing.rightAngles?.map((r, i) => {
        const o = to(r.at)
        const dir = (p: P): P => {
          const q = to(p)
          const len = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1
          return [((q[0] - o[0]) / len) * 12, ((q[1] - o[1]) / len) * 12]
        }
        const u = dir(r.toA)
        const v = dir(r.toB)
        return (
          <path key={i} d={`M${o[0] + u[0]} ${o[1] + u[1]}l${v[0]} ${v[1]}l${-u[0]} ${-u[1]}`} fill="none" stroke={INK} strokeWidth={1.2} />
        )
      })}
      <g fontFamily={font} fontSize={18} fontStyle="italic" fill={INK} textAnchor="middle" dominantBaseline="middle">
        {drawing.vertices?.map((v) => {
          const p = to(v.at)
          const len = Math.hypot(p[0] - cx, p[1] - cy) || 1
          return (
            <g key={v.name}>
              <circle cx={p[0]} cy={p[1]} r={3} />
              <text x={p[0] + ((p[0] - cx) / len) * 20} y={p[1] + ((p[1] - cy) / len) * 20}>{v.name}</text>
            </g>
          )
        })}
        {drawing.texts?.map((t) => {
          const p = to(t.at)
          return <text key={t.text} x={p[0]} y={p[1]} fill={t.color ?? INK}>{t.text}</text>
        })}
      </g>
    </svg>
  )
}

export default function Plane({ word }: { word: boolean }): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const [figId, setFigId] = useState(FIGURES[0].id)
  const fig = FIGURES.find((f) => f.id === figId)!
  const [values, setValues] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(FIGURES.map((f) => [f.id, Object.fromEntries(f.params.map((p) => [p.key, p.value]))]))
  )
  const params = values[figId]
  const [status, setStatus] = useState('')
  const result = useMemo(() => fig.build(params), [fig, params])

  const insertIntoWord = async (): Promise<void> => {
    if (!svgRef.current) return
    const { blob, width, height } = await svgToPng(svgRef.current, 3)
    await insertImageIntoWord(blob, width, height, 300)
  }

  const exportAs = async (kind: 'png' | 'svg'): Promise<void> => {
    if (!svgRef.current) return
    try {
      const saved = await (kind === 'png' ? savePng : saveSvg)(svgRef.current, fig.id)
      if (saved) setStatus(`Đã xuất ${saved.split(/[\\/]/).pop()}`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="panel-view plane-view">
      <aside>
        <label className="field">
          Hình
          <select value={figId} onChange={(e) => setFigId(e.target.value)}>
            {FIGURES.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>
        {fig.params.map((p) => (
          <label className="field" key={p.key}>
            {p.label}: {String(params[p.key]).replace('.', ',')}{p.unit === '°' ? '°' : ' ' + p.unit}
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={params[p.key]}
              onChange={(e) => setValues((v) => ({ ...v, [figId]: { ...v[figId], [p.key]: Number(e.target.value) } }))}
            />
          </label>
        ))}
        {word && <WordFigureBanner onInsert={insertIntoWord} disabled={'error' in result} />}
        <div className="shape-actions">
          <button onClick={() => void exportAs('png')} disabled={'error' in result}>Xuất ảnh PNG</button>
          <button onClick={() => void exportAs('svg')} disabled={'error' in result}>Xuất ảnh SVG</button>
        </div>
        {status && <p className="status">{status}</p>}
      </aside>

      {'error' in result ? (
        <p className="plane-error">{result.error}</p>
      ) : (
        <>
          <Figure drawing={result.drawing} svgRef={svgRef} />
          <ol className="steps">
            {result.steps.map((s) => (
              <li key={s.text}>
                <div className="step-text">{s.text}</div>
                <div className="step-math">
                  <Tex latex={s.latex} />
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
