import { saveFile } from './files'

function serialize(svg: SVGSVGElement): { text: string; width: number; height: number } {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const box = svg.viewBox.baseVal
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(box.width))
  clone.setAttribute('height', String(box.height))
  clone.removeAttribute('class')
  return { text: new XMLSerializer().serializeToString(clone), width: box.width, height: box.height }
}

/** Lưu hình vẽ thành file SVG. Trả về tên file, hoặc null nếu người dùng hủy. */
export async function saveSvg(svg: SVGSVGElement, name: string): Promise<string | null> {
  const { text } = serialize(svg)
  return saveFile(`${name}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${text}`, {
    name: 'Ảnh SVG',
    extensions: ['svg']
  })
}

/** Vẽ hình thành ảnh PNG nền trắng. Trả về ảnh cùng kích thước gốc của hình (chưa phóng). */
export async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<{ blob: Blob; width: number; height: number }> {
  const { text, width, height } = serialize(svg)
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text)
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không tạo được ảnh PNG.'))), 'image/png')
  )
  return { blob, width, height }
}

/** Lưu hình vẽ thành PNG nền trắng, phóng to 2 lần cho nét. */
export async function savePng(svg: SVGSVGElement, name: string, scale = 2): Promise<string | null> {
  const { blob } = await svgToPng(svg, scale)
  return saveFile(`${name}.png`, new Uint8Array(await blob.arrayBuffer()), { name: 'Ảnh PNG', extensions: ['png'] })
}
