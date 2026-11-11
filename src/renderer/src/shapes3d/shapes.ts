import * as THREE from 'three'

export interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  value: number
}

export interface Step {
  text: string
  latex: string
}

export interface ShapeDef {
  id: string
  name: string
  params: ParamDef[]
  /** Dựng hình, đáy nằm trên mặt phẳng y = 0. */
  build(p: Record<string, number>): THREE.Group
  /** Lời giải từng bước với số đã thay vào. */
  steps(p: Record<string, number>): Step[]
}

const FACE = 0x4f7cff
const EDGE = 0x1f2a5c
const RED = 0xe11d48
const GREEN = 0x059669

/** Viết số theo kiểu Việt Nam: dấu phẩy thập phân, tối đa 2 chữ số lẻ. */
export function num(x: number): string {
  return (Math.round(x * 100) / 100).toString().replace('.', '{,}')
}

function solid(geometry: THREE.BufferGeometry, edgeAngle = 1): THREE.Group {
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: FACE,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  group.add(new THREE.Mesh(geometry, material))
  group.add(
    new THREE.LineSegments(new THREE.EdgesGeometry(geometry, edgeAngle), new THREE.LineBasicMaterial({ color: EDGE }))
  )
  return group
}

function segment(a: [number, number, number], b: [number, number, number], color: number): THREE.Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)])
  const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.12 }))
  line.computeLineDistances()
  return line
}

function circle(radius: number, y: number): THREE.LineLoop {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius))
  }
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: EDGE }))
}

const len = (key: string, label: string, value: number): ParamDef => ({ key, label, min: 1, max: 10, value })

export const SHAPES: ShapeDef[] = [
  {
    id: 'box',
    name: 'Hình hộp chữ nhật',
    params: [len('a', 'Chiều dài a', 5), len('b', 'Chiều rộng b', 3), len('c', 'Chiều cao c', 4)],
    build: ({ a, b, c }) => {
      const g = solid(new THREE.BoxGeometry(a, c, b))
      g.children.forEach((o) => (o.position.y = c / 2))
      return g
    },
    steps: ({ a, b, c }) => [
      { text: 'Diện tích xung quanh', latex: `S_{xq}=2(a+b)c=2(${num(a)}+${num(b)})\\cdot ${num(c)}=${num(2 * (a + b) * c)}\\ \\mathrm{cm}^2` },
      { text: 'Diện tích toàn phần', latex: `S_{tp}=S_{xq}+2ab=${num(2 * (a + b) * c)}+2\\cdot ${num(a)}\\cdot ${num(b)}=${num(2 * (a + b) * c + 2 * a * b)}\\ \\mathrm{cm}^2` },
      { text: 'Thể tích', latex: `V=abc=${num(a)}\\cdot ${num(b)}\\cdot ${num(c)}=${num(a * b * c)}\\ \\mathrm{cm}^3` }
    ]
  },
  {
    id: 'cube',
    name: 'Hình lập phương',
    params: [len('a', 'Cạnh a', 4)],
    build: ({ a }) => {
      const g = solid(new THREE.BoxGeometry(a, a, a))
      g.children.forEach((o) => (o.position.y = a / 2))
      return g
    },
    steps: ({ a }) => [
      { text: 'Diện tích xung quanh', latex: `S_{xq}=4a^2=4\\cdot ${num(a)}^2=${num(4 * a * a)}\\ \\mathrm{cm}^2` },
      { text: 'Diện tích toàn phần', latex: `S_{tp}=6a^2=6\\cdot ${num(a)}^2=${num(6 * a * a)}\\ \\mathrm{cm}^2` },
      { text: 'Thể tích', latex: `V=a^3=${num(a)}^3=${num(a ** 3)}\\ \\mathrm{cm}^3` }
    ]
  },
  {
    id: 'prism',
    name: 'Lăng trụ đứng tam giác',
    params: [len('a', 'Cạnh góc vuông a', 3), len('b', 'Cạnh góc vuông b', 4), len('h', 'Chiều cao h', 5)],
    build: ({ a, b, h }) => {
      // Đáy là tam giác vuông, dựng bằng cách kéo đáy lên theo chiều cao.
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(a, 0), new THREE.Vector2(0, b)])
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false })
      geometry.rotateX(-Math.PI / 2)
      geometry.translate(-a / 3, 0, b / 3)
      return solid(geometry)
    },
    steps: ({ a, b, h }) => {
      const c = Math.hypot(a, b)
      const base = (a * b) / 2
      return [
        { text: 'Cạnh huyền của đáy (định lý Pythagore)', latex: `c=\\sqrt{a^2+b^2}=\\sqrt{${num(a)}^2+${num(b)}^2}=${num(c)}\\ \\mathrm{cm}` },
        { text: 'Diện tích đáy', latex: `S_{đ}=\\frac{1}{2}ab=\\frac{1}{2}\\cdot ${num(a)}\\cdot ${num(b)}=${num(base)}\\ \\mathrm{cm}^2` },
        { text: 'Diện tích xung quanh (chu vi đáy nhân chiều cao)', latex: `S_{xq}=(a+b+c)h=${num((a + b + c) * h)}\\ \\mathrm{cm}^2` },
        { text: 'Thể tích', latex: `V=S_{đ}\\cdot h=${num(base)}\\cdot ${num(h)}=${num(base * h)}\\ \\mathrm{cm}^3` }
      ]
    }
  },
  {
    id: 'pyramid',
    name: 'Hình chóp tứ giác đều',
    params: [len('a', 'Cạnh đáy a', 4), len('h', 'Chiều cao h', 5)],
    build: ({ a, h }) => {
      const geometry = new THREE.ConeGeometry(a / Math.SQRT2, h, 4, 1)
      geometry.rotateY(Math.PI / 4)
      geometry.translate(0, h / 2, 0)
      const g = solid(geometry)
      g.add(segment([0, 0, 0], [0, h, 0], RED))
      g.add(segment([0, h, 0], [0, 0, a / 2], GREEN))
      g.add(segment([0, 0, 0], [0, 0, a / 2], GREEN))
      return g
    },
    steps: ({ a, h }) => {
      const d = Math.hypot(h, a / 2)
      return [
        { text: 'Trung đoạn d (xanh lá), từ chiều cao h (đỏ)', latex: `d=\\sqrt{h^2+\\left(\\frac{a}{2}\\right)^2}=\\sqrt{${num(h)}^2+${num(a / 2)}^2}=${num(d)}\\ \\mathrm{cm}` },
        { text: 'Diện tích xung quanh (nửa chu vi đáy nhân trung đoạn)', latex: `S_{xq}=\\frac{1}{2}\\cdot 4a\\cdot d=2\\cdot ${num(a)}\\cdot ${num(d)}=${num(2 * a * d)}\\ \\mathrm{cm}^2` },
        { text: 'Thể tích', latex: `V=\\frac{1}{3}a^2h=\\frac{1}{3}\\cdot ${num(a)}^2\\cdot ${num(h)}=${num((a * a * h) / 3)}\\ \\mathrm{cm}^3` }
      ]
    }
  },
  {
    id: 'cylinder',
    name: 'Hình trụ',
    params: [len('R', 'Bán kính đáy R', 2), len('h', 'Chiều cao h', 5)],
    build: ({ R, h }) => {
      const geometry = new THREE.CylinderGeometry(R, R, h, 64)
      geometry.translate(0, h / 2, 0)
      const g = solid(geometry, 30)
      g.add(segment([0, 0, 0], [R, 0, 0], RED))
      g.add(segment([0, 0, 0], [0, h, 0], GREEN))
      return g
    },
    steps: ({ R, h }) => [
      { text: 'Diện tích xung quanh, R (đỏ), h (xanh lá)', latex: `S_{xq}=2\\pi Rh=2\\pi\\cdot ${num(R)}\\cdot ${num(h)}\\approx ${num(2 * Math.PI * R * h)}\\ \\mathrm{cm}^2` },
      { text: 'Diện tích toàn phần', latex: `S_{tp}=2\\pi Rh+2\\pi R^2\\approx ${num(2 * Math.PI * R * (h + R))}\\ \\mathrm{cm}^2` },
      { text: 'Thể tích', latex: `V=\\pi R^2h=\\pi\\cdot ${num(R)}^2\\cdot ${num(h)}\\approx ${num(Math.PI * R * R * h)}\\ \\mathrm{cm}^3` }
    ]
  },
  {
    id: 'cone',
    name: 'Hình nón',
    params: [len('R', 'Bán kính đáy R', 3), len('h', 'Chiều cao h', 4)],
    build: ({ R, h }) => {
      const geometry = new THREE.ConeGeometry(R, h, 64, 1)
      geometry.translate(0, h / 2, 0)
      const g = solid(geometry, 30)
      g.add(segment([0, 0, 0], [R, 0, 0], RED))
      g.add(segment([0, 0, 0], [0, h, 0], GREEN))
      return g
    },
    steps: ({ R, h }) => {
      const l = Math.hypot(R, h)
      return [
        { text: 'Đường sinh l, từ R (đỏ) và h (xanh lá)', latex: `l=\\sqrt{R^2+h^2}=\\sqrt{${num(R)}^2+${num(h)}^2}=${num(l)}\\ \\mathrm{cm}` },
        { text: 'Diện tích xung quanh', latex: `S_{xq}=\\pi Rl=\\pi\\cdot ${num(R)}\\cdot ${num(l)}\\approx ${num(Math.PI * R * l)}\\ \\mathrm{cm}^2` },
        { text: 'Thể tích', latex: `V=\\frac{1}{3}\\pi R^2h=\\frac{1}{3}\\pi\\cdot ${num(R)}^2\\cdot ${num(h)}\\approx ${num((Math.PI * R * R * h) / 3)}\\ \\mathrm{cm}^3` }
      ]
    }
  },
  {
    id: 'sphere',
    name: 'Hình cầu',
    params: [len('R', 'Bán kính R', 3)],
    build: ({ R }) => {
      const geometry = new THREE.SphereGeometry(R, 48, 32)
      geometry.translate(0, R, 0)
      const g = new THREE.Group()
      g.add(solid(geometry, 180).children[0])
      g.add(circle(R, R))
      const meridian = circle(R, 0)
      meridian.rotation.x = Math.PI / 2
      meridian.position.y = R
      g.add(meridian)
      g.add(segment([0, R, 0], [R, R, 0], RED))
      return g
    },
    steps: ({ R }) => [
      { text: 'Diện tích mặt cầu, R (đỏ)', latex: `S=4\\pi R^2=4\\pi\\cdot ${num(R)}^2\\approx ${num(4 * Math.PI * R * R)}\\ \\mathrm{cm}^2` },
      { text: 'Thể tích', latex: `V=\\frac{4}{3}\\pi R^3=\\frac{4}{3}\\pi\\cdot ${num(R)}^3\\approx ${num((4 / 3) * Math.PI * R ** 3)}\\ \\mathrm{cm}^3` }
    ]
  }
]
