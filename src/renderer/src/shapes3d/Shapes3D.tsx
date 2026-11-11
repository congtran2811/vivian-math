import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { latexToSvg } from '../exportImage'
import { saveFile } from '../files'
import { WordFigureBanner, insertImageIntoWord } from '../WordInsert'
import { SHAPES, type Step } from './shapes'

// Khung hình video 720p: hình 3D bên trái, lời giải bên phải.
const W = 1280
const H = 720
const VIEW = 720
const PANEL_X = VIEW + 20
const PANEL_W = W - PANEL_X - 30

const INTRO = 1.2
const PER_STEP = 2.4
const OUTRO = 2.5
const FADE = 0.6

interface StepImage {
  step: Step
  img: HTMLImageElement
  w: number
  h: number
}

function loadStepImages(steps: Step[]): Promise<StepImage[]> {
  return Promise.all(
    steps.map(async (step) => {
      const { svg, width, height } = latexToSvg(step.latex, { fontSize: 24, color: '#111827' })
      const img = new Image()
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      await img.decode()
      const scale = Math.min(1, PANEL_W / width)
      return { step, img, w: width * scale, h: height * scale }
    })
  )
}

/** Chọn định dạng video mà máy hỗ trợ, ưu tiên MP4. */
function pickVideoFormat(): { mime: string; ext: string } {
  for (const [mime, ext] of [
    ['video/mp4;codecs=avc1', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9', 'webm'],
    ['video/webm', 'webm']
  ]) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, ext }
  }
  throw new Error('Máy này không hỗ trợ ghi video.')
}

export default function Shapes3D({ active, word }: { active: boolean; word: boolean }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [shapeId, setShapeId] = useState(SHAPES[0].id)
  const shape = SHAPES.find((s) => s.id === shapeId)!
  const [values, setValues] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(SHAPES.map((s) => [s.id, Object.fromEntries(s.params.map((p) => [p.key, p.value]))]))
  )
  const params = values[shapeId]
  const [playing, setPlaying] = useState(false)
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null)

  // Trạng thái dùng trong vòng lặp vẽ, đặt trong ref để không dựng lại cảnh 3D mỗi lần đổi.
  const three = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    model: THREE.Group | null
  } | null>(null)
  const stepImages = useRef<StepImage[]>([])
  const playStart = useRef<number | null>(null)
  const title = useRef(shape.name)
  const onPlayEnd = useRef<(() => void) | null>(null)

  const steps = useMemo(() => shape.steps(params), [shape, params])
  const duration = INTRO + steps.length * PER_STEP + OUTRO

  // Dựng cảnh 3D một lần.
  useEffect(() => {
    const canvas = canvasRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(VIEW, VIEW, false)
    renderer.setClearColor(0xffffff)
    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const light = new THREE.DirectionalLight(0xffffff, 1.4)
    light.position.set(5, 10, 7)
    scene.add(light)
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500)
    // Điều khiển xoay gắn vào khung hình hiển thị, vì canvas 3D nằm ẩn phía sau.
    const controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    three.current = { renderer, scene, camera, controls, model: null }
    return () => {
      controls.dispose()
      renderer.dispose()
      three.current = null
    }
  }, [])

  // Đổi hình hoặc kích thước: dựng lại mô hình và lời giải.
  useEffect(() => {
    const t = three.current
    if (!t) return
    if (t.model) {
      t.scene.remove(t.model)
      t.model.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        ;(m.material as THREE.Material | undefined)?.dispose()
      })
    }
    const model = shape.build(params)
    t.scene.add(model)
    t.model = model

    const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere())
    const dist = sphere.radius / Math.sin((t.camera.fov * Math.PI) / 360) * 1.15
    const dir = t.camera.position.clone().sub(t.controls.target)
    if (dir.lengthSq() === 0) dir.set(1, 0.6, 1.2)
    t.controls.target.copy(sphere.center)
    t.camera.position.copy(sphere.center).add(dir.normalize().multiplyScalar(dist))
    t.controls.update()

    title.current = shape.name
    let cancelled = false
    loadStepImages(steps)
      .then((imgs) => {
        if (!cancelled) stepImages.current = imgs
      })
      .catch((e) => setStatus({ text: String(e instanceof Error ? e.message : e), error: true }))
    return () => {
      cancelled = true
    }
  }, [shape, params, steps])

  // Vòng lặp vẽ: ghép hình 3D và lời giải vào một khung hình.
  useEffect(() => {
    if (!active) return
    const ctx = canvasRef.current!.getContext('2d')!
    let raf = 0
    const frame = (now: number): void => {
      raf = requestAnimationFrame(frame)
      const t = three.current
      if (!t) return

      const elapsed = playStart.current === null ? null : (now - playStart.current) / 1000
      if (elapsed !== null && elapsed >= duration) {
        playStart.current = null
        onPlayEnd.current?.()
      }
      const time = playStart.current === null ? null : elapsed

      if (t.model) t.model.rotation.y = time === null ? 0 : time * 0.5
      t.controls.update()
      t.renderer.render(t.scene, t.camera)

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)
      ctx.drawImage(t.renderer.domElement, 0, 0, VIEW, VIEW)

      ctx.fillStyle = '#2b4eff'
      ctx.font = '600 34px "Segoe UI", system-ui, sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillText(title.current, PANEL_X, 36)
      ctx.fillStyle = '#e5e7eb'
      ctx.fillRect(PANEL_X, 88, PANEL_W, 2)

      let y = 112
      stepImages.current.forEach((s, i) => {
        const appear = INTRO + i * PER_STEP
        const alpha = time === null ? 1 : Math.min(1, Math.max(0, (time - appear) / FADE))
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#6b7280'
        ctx.font = '20px "Segoe UI", system-ui, sans-serif'
        ctx.fillText(`Bước ${i + 1}. ${s.step.text}`, PANEL_X, y, PANEL_W)
        // Công thức trượt nhẹ lên khi xuất hiện.
        ctx.drawImage(s.img, PANEL_X, y + 34 + (1 - alpha) * 12, s.w, s.h)
        ctx.globalAlpha = 1
        y += 34 + s.h + 30
      })

      ctx.fillStyle = '#9ca3af'
      ctx.font = '16px "Segoe UI", system-ui, sans-serif'
      ctx.fillText('Vivian Math', W - 120, H - 32)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [active, duration])

  const say = (text: string, error = false): void => {
    setStatus({ text, error })
    setTimeout(() => setStatus((s) => (s?.text === text ? null : s)), 4000)
  }

  const play = (): Promise<void> =>
    new Promise((resolve) => {
      setPlaying(true)
      onPlayEnd.current = () => {
        onPlayEnd.current = null
        setPlaying(false)
        resolve()
      }
      playStart.current = performance.now()
    })

  const stop = (): void => {
    playStart.current = null
    onPlayEnd.current?.()
  }

  const exportVideo = async (): Promise<void> => {
    try {
      const { mime, ext } = pickVideoFormat()
      const stream = canvasRef.current!.captureStream(30)
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 })
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
      const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()))
      setRecording(true)
      recorder.start()
      await play()
      recorder.stop()
      await stopped
      stream.getTracks().forEach((t) => t.stop())
      const bytes = new Uint8Array(await new Blob(chunks, { type: mime }).arrayBuffer())
      const saved = await saveFile(`${shape.id}.${ext}`, bytes, { name: 'Video', extensions: [ext] })
      if (saved) say(`Đã xuất video ${saved.split(/[\\/]/).pop()}`)
    } catch (e) {
      say(e instanceof Error ? e.message : String(e), true)
    } finally {
      setRecording(false)
    }
  }

  const insertIntoWord = async (): Promise<void> => {
    const canvas = canvasRef.current!
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh.'))), 'image/png')
    )
    await insertImageIntoWord(blob, canvas.width, canvas.height, 400)
  }

  const exportImage = (): void => {
    canvasRef.current!.toBlob(async (blob) => {
      if (!blob) return say('Không tạo được ảnh.', true)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const saved = await saveFile(`${shape.id}.png`, bytes, { name: 'Ảnh PNG', extensions: ['png'] })
      if (saved) say(`Đã xuất ảnh ${saved.split(/[\\/]/).pop()}`)
    }, 'image/png')
  }

  const setParam = (key: string, value: number): void =>
    setValues((v) => ({ ...v, [shapeId]: { ...v[shapeId], [key]: value } }))

  const busy = playing || recording

  return (
    <div className="shapes">
      <aside>
        <label className="field">
          Hình
          <select value={shapeId} disabled={busy} onChange={(e) => setShapeId(e.target.value)}>
            {SHAPES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        {shape.params.map((p) => (
          <label className="field" key={p.key}>
            {p.label}: {params[p.key]} cm
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={0.5}
              disabled={busy}
              value={params[p.key]}
              onChange={(e) => setParam(p.key, Number(e.target.value))}
            />
          </label>
        ))}
        <div className="shape-actions">
          {playing && !recording ? (
            <button onClick={stop}>Dừng</button>
          ) : (
            <button onClick={() => void play()} disabled={busy}>Phát giải thích</button>
          )}
          <button onClick={() => void exportVideo()} disabled={busy}>
            {recording ? 'Đang ghi video…' : 'Xuất video'}
          </button>
          <button onClick={exportImage} disabled={busy}>Xuất ảnh PNG</button>
        </div>
        {word && <WordFigureBanner onInsert={insertIntoWord} disabled={busy} />}
        <p className="tip">Kéo chuột trên hình để xoay, lăn chuột để phóng to hoặc thu nhỏ.</p>
        {status && <p className={status.error ? 'status error' : 'status'}>{status.text}</p>}
      </aside>
      <canvas ref={canvasRef} width={W} height={H} className="stage" />
    </div>
  )
}
