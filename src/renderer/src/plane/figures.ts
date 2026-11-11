import { num, type Step } from '../shapes3d/shapes'

export type P = [number, number]

export interface PlaneParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  value: number
  unit: string
}

/** Hình vẽ theo tọa độ toán học (trục y hướng lên), đơn vị cm. */
export interface Drawing {
  polygon?: P[]
  vertices?: { at: P; name: string }[]
  circles?: { c: P; r: number; dashed?: boolean; fill?: boolean }[]
  segments?: { a: P; b: P; color?: string; dashed?: boolean }[]
  /** Hình quạt tròn: tâm, bán kính, góc quét tính bằng độ kể từ trục Ox. */
  sector?: { c: P; r: number; deg: number }
  rightAngles?: { at: P; toA: P; toB: P }[]
  texts?: { at: P; text: string; color?: string }[]
}

export interface PlaneFigure {
  id: string
  name: string
  params: PlaneParam[]
  /** Trả về lỗi khi kích thước không tạo được hình (ví dụ ba cạnh không thỏa bất đẳng thức tam giác). */
  build(p: Record<string, number>): { drawing: Drawing; steps: Step[] } | { error: string }
}

const RED = '#e11d48'
const GREEN = '#059669'
const cm = (key: string, label: string, value: number): PlaneParam => ({ key, label, min: 1, max: 12, step: 0.5, value, unit: 'cm' })
const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
const deg = (rad: number): number => (rad * 180) / Math.PI

export const FIGURES: PlaneFigure[] = [
  {
    id: 'right-triangle',
    name: 'Tam giác vuông',
    params: [cm('c', 'Cạnh AB', 3), cm('b', 'Cạnh AC', 4)],
    build: ({ c, b }) => {
      const A: P = [0, 0]
      const B: P = [0, c]
      const C: P = [b, 0]
      const a = Math.hypot(b, c)
      const h = (b * c) / a
      // Chân đường cao H trên BC.
      const t = (c * c) / (a * a)
      const H: P = [B[0] + (C[0] - B[0]) * t, B[1] + (C[1] - B[1]) * t]
      return {
        drawing: {
          polygon: [A, B, C],
          vertices: [{ at: A, name: 'A' }, { at: B, name: 'B' }, { at: C, name: 'C' }, { at: H, name: 'H' }],
          segments: [{ a: A, b: H, color: RED, dashed: true }],
          rightAngles: [{ at: A, toA: B, toB: C }, { at: H, toA: A, toB: C }]
        },
        steps: [
          { text: 'Cạnh huyền BC (định lý Pythagore)', latex: `BC=\\sqrt{AB^2+AC^2}=\\sqrt{${num(c)}^2+${num(b)}^2}=${num(a)}\\ \\mathrm{cm}` },
          { text: 'Chu vi', latex: `P=AB+AC+BC=${num(a + b + c)}\\ \\mathrm{cm}` },
          { text: 'Diện tích', latex: `S=\\frac{1}{2}AB\\cdot AC=\\frac{1}{2}\\cdot ${num(c)}\\cdot ${num(b)}=${num((b * c) / 2)}\\ \\mathrm{cm}^2` },
          { text: 'Đường cao AH (đỏ)', latex: `AH=\\frac{AB\\cdot AC}{BC}=\\frac{${num(c)}\\cdot ${num(b)}}{${num(a)}}=${num(h)}\\ \\mathrm{cm}` },
          { text: 'Tỉ số lượng giác của góc B', latex: `\\sin B=\\frac{AC}{BC}=${num(b / a)}\\Rightarrow \\widehat{B}\\approx ${num(deg(Math.asin(b / a)))}^{\\circ}` }
        ]
      }
    }
  },
  {
    id: 'triangle',
    name: 'Tam giác (biết ba cạnh)',
    params: [cm('a', 'Cạnh BC = a', 6), cm('b', 'Cạnh CA = b', 5), cm('c', 'Cạnh AB = c', 4)],
    build: ({ a, b, c }) => {
      if (a + b <= c || a + c <= b || b + c <= a) {
        return { error: 'Ba độ dài này không tạo thành tam giác: mỗi cạnh phải nhỏ hơn tổng hai cạnh còn lại.' }
      }
      const B: P = [0, 0]
      const C: P = [a, 0]
      const x = (a * a + c * c - b * b) / (2 * a)
      const y = Math.sqrt(Math.max(0, c * c - x * x))
      const A: P = [x, y]
      const p = (a + b + c) / 2
      const S = Math.sqrt(p * (p - a) * (p - b) * (p - c))
      const r = S / p
      const R = (a * b * c) / (4 * S)
      // Tâm đường tròn nội tiếp: trung bình có trọng số theo độ dài cạnh đối diện.
      const I: P = [(a * A[0] + b * B[0] + c * C[0]) / (2 * p), (a * A[1] + b * B[1] + c * C[1]) / (2 * p)]
      // Tâm đường tròn ngoại tiếp nằm trên đường trung trực của BC.
      const O: P = [a / 2, (x * x + y * y - a * x) / (2 * y)]
      return {
        drawing: {
          polygon: [A, B, C],
          vertices: [{ at: A, name: 'A' }, { at: B, name: 'B' }, { at: C, name: 'C' }],
          circles: [{ c: I, r }, { c: O, r: R, dashed: true }],
          segments: [{ a: A, b: [x, 0], color: RED, dashed: true }]
        },
        steps: [
          { text: 'Chu vi và nửa chu vi', latex: `P=a+b+c=${num(2 * p)}\\ \\mathrm{cm},\\quad p=\\frac{P}{2}=${num(p)}\\ \\mathrm{cm}` },
          { text: 'Diện tích (công thức Heron)', latex: `S=\\sqrt{p(p-a)(p-b)(p-c)}=${num(S)}\\ \\mathrm{cm}^2` },
          { text: 'Đường cao hạ từ A (đỏ)', latex: `h_a=\\frac{2S}{a}=\\frac{2\\cdot ${num(S)}}{${num(a)}}=${num((2 * S) / a)}\\ \\mathrm{cm}` },
          { text: 'Bán kính đường tròn nội tiếp (nét liền)', latex: `r=\\frac{S}{p}=${num(r)}\\ \\mathrm{cm}` },
          { text: 'Bán kính đường tròn ngoại tiếp (nét đứt)', latex: `R=\\frac{abc}{4S}=${num(R)}\\ \\mathrm{cm}` }
        ]
      }
    }
  },
  {
    id: 'rectangle',
    name: 'Hình chữ nhật',
    params: [cm('a', 'Chiều dài a', 6), cm('b', 'Chiều rộng b', 4)],
    build: ({ a, b }) => {
      const A: P = [0, b]
      const B: P = [a, b]
      const C: P = [a, 0]
      const D: P = [0, 0]
      return {
        drawing: {
          polygon: [A, B, C, D],
          vertices: [{ at: A, name: 'A' }, { at: B, name: 'B' }, { at: C, name: 'C' }, { at: D, name: 'D' }],
          segments: [{ a: A, b: C, color: RED, dashed: true }],
          rightAngles: [{ at: D, toA: A, toB: C }]
        },
        steps: [
          { text: 'Chu vi', latex: `P=2(a+b)=2(${num(a)}+${num(b)})=${num(2 * (a + b))}\\ \\mathrm{cm}` },
          { text: 'Diện tích', latex: `S=ab=${num(a)}\\cdot ${num(b)}=${num(a * b)}\\ \\mathrm{cm}^2` },
          { text: 'Đường chéo AC (đỏ)', latex: `AC=\\sqrt{a^2+b^2}=\\sqrt{${num(a)}^2+${num(b)}^2}=${num(Math.hypot(a, b))}\\ \\mathrm{cm}` }
        ]
      }
    }
  },
  {
    id: 'parallelogram',
    name: 'Hình bình hành',
    params: [cm('a', 'Cạnh đáy a', 6), cm('b', 'Cạnh bên b', 4), { key: 'g', label: 'Góc D', min: 20, max: 160, step: 5, value: 60, unit: '°' }],
    build: ({ a, b, g }) => {
      const rad = (g * Math.PI) / 180
      const D: P = [0, 0]
      const C: P = [a, 0]
      const A: P = [b * Math.cos(rad), b * Math.sin(rad)]
      const B: P = [A[0] + a, A[1]]
      const h = b * Math.sin(rad)
      const H: P = [A[0], 0]
      return {
        drawing: {
          polygon: [A, B, C, D],
          vertices: [{ at: A, name: 'A' }, { at: B, name: 'B' }, { at: C, name: 'C' }, { at: D, name: 'D' }],
          segments: [{ a: A, b: H, color: RED, dashed: true }]
        },
        steps: [
          { text: 'Chiều cao AH (đỏ)', latex: `h=b\\cdot \\sin D=${num(b)}\\cdot \\sin ${num(g)}^{\\circ}=${num(h)}\\ \\mathrm{cm}` },
          { text: 'Chu vi', latex: `P=2(a+b)=2(${num(a)}+${num(b)})=${num(2 * (a + b))}\\ \\mathrm{cm}` },
          { text: 'Diện tích', latex: `S=a\\cdot h=${num(a)}\\cdot ${num(h)}=${num(a * h)}\\ \\mathrm{cm}^2` }
        ]
      }
    }
  },
  {
    id: 'trapezoid',
    name: 'Hình thang cân',
    params: [cm('a', 'Đáy lớn a', 8), cm('b', 'Đáy nhỏ b', 4), cm('h', 'Chiều cao h', 4)],
    build: ({ a, b, h }) => {
      if (b >= a) return { error: 'Đáy nhỏ phải ngắn hơn đáy lớn.' }
      const off = (a - b) / 2
      const D: P = [0, 0]
      const C: P = [a, 0]
      const A: P = [off, h]
      const B: P = [off + b, h]
      const side = Math.hypot(off, h)
      return {
        drawing: {
          polygon: [A, B, C, D],
          vertices: [{ at: A, name: 'A' }, { at: B, name: 'B' }, { at: C, name: 'C' }, { at: D, name: 'D' }],
          segments: [{ a: A, b: [off, 0], color: RED, dashed: true }],
          rightAngles: [{ at: [off, 0], toA: A, toB: C }]
        },
        steps: [
          { text: 'Diện tích', latex: `S=\\frac{(a+b)h}{2}=\\frac{(${num(a)}+${num(b)})\\cdot ${num(h)}}{2}=${num(((a + b) * h) / 2)}\\ \\mathrm{cm}^2` },
          { text: 'Cạnh bên, từ chiều cao (đỏ)', latex: `AD=\\sqrt{h^2+\\left(\\frac{a-b}{2}\\right)^2}=\\sqrt{${num(h)}^2+${num(off)}^2}=${num(side)}\\ \\mathrm{cm}` },
          { text: 'Chu vi', latex: `P=a+b+2AD=${num(a + b + 2 * side)}\\ \\mathrm{cm}` }
        ]
      }
    }
  },
  {
    id: 'rhombus',
    name: 'Hình thoi',
    params: [cm('m', 'Đường chéo AC', 8), cm('n', 'Đường chéo BD', 6)],
    build: ({ m, n }) => {
      const A: P = [-m / 2, 0]
      const C: P = [m / 2, 0]
      const B: P = [0, n / 2]
      const D: P = [0, -n / 2]
      const side = Math.hypot(m / 2, n / 2)
      return {
        drawing: {
          polygon: [A, B, C, D],
          vertices: [{ at: A, name: 'A' }, { at: B, name: 'B' }, { at: C, name: 'C' }, { at: D, name: 'D' }],
          segments: [{ a: A, b: C, color: RED, dashed: true }, { a: B, b: D, color: GREEN, dashed: true }],
          rightAngles: [{ at: [0, 0], toA: C, toB: B }]
        },
        steps: [
          { text: 'Diện tích (nửa tích hai đường chéo)', latex: `S=\\frac{AC\\cdot BD}{2}=\\frac{${num(m)}\\cdot ${num(n)}}{2}=${num((m * n) / 2)}\\ \\mathrm{cm}^2` },
          { text: 'Cạnh hình thoi (hai đường chéo vuông góc tại trung điểm)', latex: `AB=\\sqrt{\\left(\\frac{AC}{2}\\right)^2+\\left(\\frac{BD}{2}\\right)^2}=\\sqrt{${num(m / 2)}^2+${num(n / 2)}^2}=${num(side)}\\ \\mathrm{cm}` },
          { text: 'Chu vi', latex: `P=4AB=4\\cdot ${num(side)}=${num(4 * side)}\\ \\mathrm{cm}` }
        ]
      }
    }
  },
  {
    id: 'circle',
    name: 'Đường tròn và hình quạt',
    params: [cm('R', 'Bán kính R', 4), { key: 'n', label: 'Góc ở tâm n', min: 10, max: 350, step: 5, value: 90, unit: '°' }],
    build: ({ R, n }) => {
      const rad = (n * Math.PI) / 180
      const O: P = [0, 0]
      const A: P = [R, 0]
      const B: P = [R * Math.cos(rad), R * Math.sin(rad)]
      return {
        drawing: {
          circles: [{ c: O, r: R }],
          sector: { c: O, r: R, deg: n },
          segments: [{ a: O, b: A, color: RED }, { a: O, b: B, color: RED }],
          vertices: [{ at: A, name: 'A' }, { at: B, name: 'B' }],
          texts: [{ at: mid(O, [-0.5, -0.5]), text: 'O' }]
        },
        steps: [
          { text: 'Chu vi đường tròn', latex: `C=2\\pi R=2\\pi\\cdot ${num(R)}\\approx ${num(2 * Math.PI * R)}\\ \\mathrm{cm}` },
          { text: 'Diện tích hình tròn', latex: `S=\\pi R^2=\\pi\\cdot ${num(R)}^2\\approx ${num(Math.PI * R * R)}\\ \\mathrm{cm}^2` },
          { text: 'Độ dài cung AB', latex: `l=\\frac{\\pi Rn}{180}=\\frac{\\pi\\cdot ${num(R)}\\cdot ${num(n)}}{180}\\approx ${num((Math.PI * R * n) / 180)}\\ \\mathrm{cm}` },
          { text: 'Diện tích hình quạt OAB (phần tô đậm)', latex: `S_q=\\frac{\\pi R^2n}{360}=\\frac{\\pi\\cdot ${num(R)}^2\\cdot ${num(n)}}{360}\\approx ${num((Math.PI * R * R * n) / 360)}\\ \\mathrm{cm}^2` }
        ]
      }
    }
  }
]
