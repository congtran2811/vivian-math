import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)

const doc = mathjax.document('', {
  InputJax: new TeX({
    packages: AllPackages,
    // Các lệnh riêng của MathLive mà LaTeX chuẩn không có.
    macros: {
      placeholder: ['\\square', 1],
      differentialD: '\\mathrm{d}',
      exponentialE: '\\mathrm{e}',
      imaginaryI: '\\mathrm{i}',
      mleft: '\\left',
      mright: '\\right'
    }
  }),
  OutputJax: new SVG({ fontCache: 'local' })
})

export interface ExportOptions {
  /** Cỡ chữ tính bằng px */
  fontSize: number
  color: string
}

export interface SvgResult {
  svg: string
  width: number
  height: number
  /** Phần nằm dưới đường chân chữ, để đặt ảnh thẳng hàng với dòng văn bản. */
  depth: number
}

/** Chuyển LaTeX thành ảnh SVG độc lập, nền trong suốt. */
export function latexToSvg(latex: string, opts: ExportOptions): SvgResult {
  const source = latex
    // Ô trống trong \text{} phải bỏ đi, vì MathJax không hiểu lệnh toán bên trong lời văn.
    .replace(/\\text\{\\placeholder(\[[^\]]*\])?\{\}\}/g, '\\text{ }')
    .replace(/\\placeholder(\[[^\]]*\])?\{\}/g, '\\square ')
  const node = doc.convert(source, { display: true })
  let svg = adaptor.innerHTML(node)
  if (svg.includes('data-mjx-error')) throw new Error('Công thức chưa hợp lệ, không xuất được ảnh.')

  // MathJax dùng đơn vị ex. Đổi sang px để ảnh có kích thước cố định ở mọi nơi.
  const exToPx = opts.fontSize * 0.45
  const size = (attr: string): number => {
    const m = svg.match(new RegExp(`${attr}="([\\d.]+)ex"`))
    return Math.ceil((m ? parseFloat(m[1]) : 10) * exToPx)
  }
  const width = size('width')
  const height = size('height')
  const align = svg.match(/vertical-align:\s*(-?[\d.]+)ex/)
  const depth = align ? Math.max(0, -parseFloat(align[1]) * exToPx) : 0
  svg = svg
    .replace(/width="[\d.]+ex"/, `width="${width}"`)
    .replace(/height="[\d.]+ex"/, `height="${height}"`)
    .replace(/style="[^"]*"/, '')
    .replace(/currentColor/g, opts.color)
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, width, height, depth }
}

/** Vẽ SVG lên canvas để lấy ảnh PNG nền trong suốt. scale = 2 cho ảnh nét khi in. */
export async function latexToPng(latex: string, opts: ExportOptions, scale = 2): Promise<Blob> {
  const { svg, width, height } = latexToSvg(latex, opts)
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh PNG.'))), 'image/png')
  )
}
