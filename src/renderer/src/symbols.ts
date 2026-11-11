export interface PaletteItem {
  /** LaTeX hiển thị trên nút */
  show: string
  /** LaTeX chèn vào công thức, #? là ô trống */
  insert: string
  title: string
}

export interface PaletteGroup {
  name: string
  /** Nút rộng dành cho công thức mẫu dài */
  wide?: boolean
  items: PaletteItem[]
}

const sym = (latex: string, title: string): PaletteItem => ({ show: latex, insert: latex, title })
const tpl = (show: string, insert: string, title: string): PaletteItem => ({ show, insert, title })
const B = '\\square'

export const GROUPS: PaletteGroup[] = [
  {
    name: 'Mẫu',
    items: [
      tpl(`\\frac{${B}}{${B}}`, '\\frac{#?}{#?}', 'Phân số'),
      tpl(`${B}\\frac{${B}}{${B}}`, '#?\\frac{#?}{#?}', 'Hỗn số'),
      tpl(`\\sqrt{${B}}`, '\\sqrt{#?}', 'Căn bậc hai'),
      tpl(`\\sqrt[3]{${B}}`, '\\sqrt[3]{#?}', 'Căn bậc ba'),
      tpl(`\\sqrt[${B}]{${B}}`, '\\sqrt[#?]{#?}', 'Căn bậc n'),
      tpl(`${B}^2`, '#@^2', 'Bình phương'),
      tpl(`${B}^3`, '#@^3', 'Lập phương'),
      tpl(`${B}^{${B}}`, '#@^{#?}', 'Lũy thừa'),
      tpl(`${B}_{${B}}`, '#@_{#?}', 'Chỉ số dưới'),
      tpl(`\\left|${B}\\right|`, '\\left|#?\\right|', 'Giá trị tuyệt đối'),
      tpl(`\\left(${B}\\right)`, '\\left(#?\\right)', 'Ngoặc tròn'),
      tpl(`\\left[${B}\\right]`, '\\left[#?\\right]', 'Ngoặc vuông'),
      tpl(`\\left\\{${B}\\right\\}`, '\\left\\{#?\\right\\}', 'Ngoặc nhọn'),
      tpl(`\\begin{cases}${B}\\\\${B}\\end{cases}`, '\\begin{cases}#?\\\\#?\\end{cases}', 'Hệ 2 phương trình'),
      tpl(
        `\\begin{cases}${B}\\\\${B}\\\\${B}\\end{cases}`,
        '\\begin{cases}#?\\\\#?\\\\#?\\end{cases}',
        'Hệ 3 phương trình'
      ),
      tpl(
        `\\left[\\begin{matrix}${B}\\\\${B}\\end{matrix}\\right.`,
        '\\left[\\begin{matrix}#?\\\\#?\\end{matrix}\\right.',
        'Hoặc (ngoặc vuông)'
      ),
      tpl(`\\overline{${B}}`, '\\overline{#?}', 'Gạch trên (số có chữ số, chu kỳ)'),
      tpl(`${B}\\%`, '#@\\%', 'Phần trăm')
    ]
  },
  {
    name: 'Phép toán',
    items: [
      sym('+', 'Cộng'),
      sym('-', 'Trừ'),
      sym('\\times', 'Nhân'),
      sym('\\cdot', 'Nhân (dấu chấm)'),
      sym('\\div', 'Chia'),
      sym(':', 'Chia (dấu hai chấm)'),
      sym('\\pm', 'Cộng trừ'),
      sym('\\mp', 'Trừ cộng'),
      sym('=', 'Bằng'),
      sym('\\ne', 'Khác'),
      sym('\\approx', 'Xấp xỉ'),
      sym('<', 'Nhỏ hơn'),
      sym('>', 'Lớn hơn'),
      sym('\\le', 'Nhỏ hơn hoặc bằng'),
      sym('\\ge', 'Lớn hơn hoặc bằng'),
      sym('\\vdots', 'Chia hết'),
      sym('\\not\\vdots', 'Không chia hết'),
      sym('\\equiv', 'Đồng dư'),
      sym('\\infty', 'Vô cực'),
      sym('\\ldots', 'Ba chấm')
    ]
  },
  {
    name: 'Hình học',
    items: [
      tpl(`\\widehat{${B}}`, '\\widehat{#?}', 'Góc'),
      sym('\\angle', 'Ký hiệu góc'),
      sym('^{\\circ}', 'Độ'),
      sym('\\triangle', 'Tam giác'),
      sym('\\perp', 'Vuông góc'),
      sym('\\parallel', 'Song song'),
      sym('\\backsim', 'Đồng dạng'),
      sym('\\cong', 'Bằng nhau'),
      tpl(`\\overset{\\frown}{${B}}`, '\\overset{\\frown}{#?}', 'Cung'),
      tpl(`\\overrightarrow{${B}}`, '\\overrightarrow{#?}', 'Vectơ'),
      tpl(`\\overline{${B}}`, '\\overline{#?}', 'Đoạn thẳng'),
      sym('\\pi', 'Pi'),
      tpl(`\\sin ${B}`, '\\sin #?', 'sin'),
      tpl(`\\cos ${B}`, '\\cos #?', 'cos'),
      tpl(`\\tan ${B}`, '\\tan #?', 'tan'),
      tpl(`\\cot ${B}`, '\\cot #?', 'cot'),
      sym('\\mathrm{cm}', 'cm'),
      sym('\\mathrm{cm}^2', 'cm²'),
      sym('\\mathrm{cm}^3', 'cm³')
    ]
  },
  {
    name: 'Tập hợp',
    items: [
      sym('\\in', 'Thuộc'),
      sym('\\notin', 'Không thuộc'),
      sym('\\subset', 'Tập con'),
      sym('\\supset', 'Chứa'),
      sym('\\cup', 'Hợp'),
      sym('\\cap', 'Giao'),
      sym('\\varnothing', 'Tập rỗng'),
      sym('\\mathbb{N}', 'Số tự nhiên'),
      sym('\\mathbb{N}^*', 'Số tự nhiên khác 0'),
      sym('\\mathbb{Z}', 'Số nguyên'),
      sym('\\mathbb{Q}', 'Số hữu tỉ'),
      sym('\\mathbb{I}', 'Số vô tỉ'),
      sym('\\mathbb{R}', 'Số thực'),
      sym('\\mid', 'Sao cho'),
      sym('\\setminus', 'Hiệu')
    ]
  },
  {
    name: 'Mũi tên',
    items: [
      sym('\\Rightarrow', 'Suy ra'),
      sym('\\Leftrightarrow', 'Tương đương'),
      sym('\\rightarrow', 'Mũi tên phải'),
      sym('\\leftarrow', 'Mũi tên trái'),
      sym('\\leftrightarrow', 'Mũi tên hai chiều'),
      sym('\\mapsto', 'Biến thành'),
      sym('\\forall', 'Với mọi'),
      sym('\\exists', 'Tồn tại'),
      sym('\\therefore', 'Vậy'),
      sym('\\because', 'Vì')
    ]
  },
  {
    name: 'Hy Lạp',
    items: [
      sym('\\alpha', 'alpha'),
      sym('\\beta', 'beta'),
      sym('\\gamma', 'gamma'),
      sym('\\delta', 'delta'),
      sym('\\Delta', 'Delta'),
      sym('\\varepsilon', 'epsilon'),
      sym('\\theta', 'theta'),
      sym('\\lambda', 'lambda'),
      sym('\\mu', 'mu'),
      sym('\\pi', 'pi'),
      sym('\\rho', 'rho'),
      sym('\\sigma', 'sigma'),
      sym('\\varphi', 'phi'),
      sym('\\omega', 'omega'),
      sym('\\Omega', 'Omega')
    ]
  },
  {
    name: 'Ma trận',
    items: [
      tpl(`\\begin{pmatrix}${B}&${B}\\\\${B}&${B}\\end{pmatrix}`, '\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}', 'Ma trận 2×2 ngoặc tròn'),
      tpl(`\\begin{bmatrix}${B}&${B}\\\\${B}&${B}\\end{bmatrix}`, '\\begin{bmatrix}#?&#?\\\\#?&#?\\end{bmatrix}', 'Ma trận 2×2 ngoặc vuông'),
      tpl(`\\begin{vmatrix}${B}&${B}\\\\${B}&${B}\\end{vmatrix}`, '\\begin{vmatrix}#?&#?\\\\#?&#?\\end{vmatrix}', 'Định thức 2×2'),
      tpl(
        `\\begin{pmatrix}${B}&${B}&${B}\\\\${B}&${B}&${B}\\\\${B}&${B}&${B}\\end{pmatrix}`,
        '\\begin{pmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{pmatrix}',
        'Ma trận 3×3'
      ),
      tpl(`\\begin{matrix}${B}&${B}\\\\${B}&${B}\\end{matrix}`, '\\begin{matrix}#?&#?\\\\#?&#?\\end{matrix}', 'Bảng 2×2 không ngoặc'),
      tpl(`\\begin{pmatrix}${B}\\\\${B}\\end{pmatrix}`, '\\begin{pmatrix}#?\\\\#?\\end{pmatrix}', 'Cột 2 hàng'),
      tpl(
        `\\begin{aligned}${B}&=${B}\\\\&=${B}\\end{aligned}`,
        '\\begin{aligned}#?&=#?\\\\&=#?\\end{aligned}',
        'Biến đổi nhiều dòng, thẳng hàng dấu ='
      ),
      tpl(
        `\\begin{aligned}${B}&\\Leftrightarrow ${B}\\\\&\\Leftrightarrow ${B}\\end{aligned}`,
        '\\begin{aligned}#?&\\Leftrightarrow #?\\\\&\\Leftrightarrow #?\\end{aligned}',
        'Biến đổi tương đương nhiều dòng'
      )
    ]
  },
  {
    name: 'Dấu và kiểu chữ',
    items: [
      tpl(`\\hat{${B}}`, '\\hat{#@}', 'Dấu mũ'),
      tpl(`\\bar{${B}}`, '\\bar{#@}', 'Gạch ngang trên'),
      tpl(`\\vec{${B}}`, '\\vec{#@}', 'Mũi tên vectơ'),
      tpl(`\\dot{${B}}`, '\\dot{#@}', 'Một chấm trên'),
      tpl(`\\ddot{${B}}`, '\\ddot{#@}', 'Hai chấm trên'),
      tpl(`\\tilde{${B}}`, '\\tilde{#@}', 'Dấu ngã'),
      tpl(`${B}'`, "#@'", 'Dấu phẩy (phẩy trên)'),
      tpl(`\\underline{${B}}`, '\\underline{#@}', 'Gạch dưới'),
      tpl(`\\overbrace{${B}}^{${B}}`, '\\overbrace{#@}^{#?}', 'Ngoặc ôm phía trên'),
      tpl(`\\underbrace{${B}}_{${B}}`, '\\underbrace{#@}_{#?}', 'Ngoặc ôm phía dưới'),
      tpl(`\\boxed{${B}}`, '\\boxed{#@}', 'Đóng khung kết quả'),
      tpl(`\\cancel{${B}}`, '\\cancel{#@}', 'Gạch bỏ (rút gọn)'),
      tpl('\\text{abc}', '\\text{#?}', 'Chữ thường (lời văn)'),
      tpl('\\mathbf{abc}', '\\mathbf{#@}', 'Chữ đậm'),
      tpl('\\mathrm{abc}', '\\mathrm{#@}', 'Chữ đứng'),
      tpl('\\mathbb{ABC}', '\\mathbb{#@}', 'Chữ rỗng (tập hợp số)'),
      tpl('\\mathcal{ABC}', '\\mathcal{#@}', 'Chữ hoa viết tay')
    ]
  },
  {
    name: 'Ngoặc và nhãn',
    items: [
      tpl(`\\lfloor ${B}\\rfloor`, '\\left\\lfloor #?\\right\\rfloor', 'Phần nguyên (làm tròn xuống)'),
      tpl(`\\lceil ${B}\\rceil`, '\\left\\lceil #?\\right\\rceil', 'Làm tròn lên'),
      tpl(`\\langle ${B}\\rangle`, '\\left\\langle #?\\right\\rangle', 'Ngoặc góc'),
      tpl(`\\|${B}\\|`, '\\left\\|#?\\right\\|', 'Chuẩn, độ dài'),
      tpl(`\\left(${B};${B}\\right]`, '\\left(#?;#?\\right]', 'Nửa khoảng (a; b]'),
      tpl(`\\left[${B};${B}\\right)`, '\\left[#?;#?\\right)', 'Nửa khoảng [a; b)'),
      tpl(`\\left(${B};${B}\\right)`, '\\left(#?;#?\\right)', 'Khoảng hoặc tọa độ điểm'),
      tpl(`\\left[${B};${B}\\right]`, '\\left[#?;#?\\right]', 'Đoạn [a; b]'),
      tpl(`\\left.${B}\\right|_{${B}}`, '\\left.#?\\right|_{#?}', 'Gạch đứng bên phải có chỉ số'),
      tpl(`\\binom{${B}}{${B}}`, '\\binom{#?}{#?}', 'Tổ hợp (ngoặc tròn)'),
      tpl(`\\xrightarrow{${B}}`, '\\xrightarrow{#?}', 'Mũi tên phải có nhãn'),
      tpl(`\\xleftarrow{${B}}`, '\\xleftarrow{#?}', 'Mũi tên trái có nhãn'),
      tpl(`\\overset{${B}}{${B}}`, '\\overset{#?}{#@}', 'Ghi chú phía trên'),
      tpl(`\\underset{${B}}{${B}}`, '\\underset{#?}{#@}', 'Ghi chú phía dưới'),
      tpl(`\\overset{?}{=}`, '\\overset{?}{=}', 'Dấu bằng cần chứng minh'),
      tpl(`${B}_{${B}}^{${B}}`, '#@_{#?}^{#?}', 'Chỉ số trên và dưới'),
      tpl(`{}_{${B}}^{${B}}${B}`, '{}_{#?}^{#?}#?', 'Chỉ số phía trước')
    ]
  },
  {
    name: 'Tổng và giới hạn',
    items: [
      tpl(`\\sum_{${B}}^{${B}}`, '\\sum_{#?}^{#?}', 'Tổng có cận'),
      tpl('\\sum', '\\sum_{#?}', 'Tổng'),
      tpl(`\\prod_{${B}}^{${B}}`, '\\prod_{#?}^{#?}', 'Tích có cận'),
      tpl(`\\lim_{${B}\\to ${B}}`, '\\lim_{#?\\to #?}', 'Giới hạn'),
      tpl(`\\int_{${B}}^{${B}}`, '\\int_{#?}^{#?}#?\\,\\mathrm{d}x', 'Tích phân xác định'),
      tpl('\\int', '\\int #?\\,\\mathrm{d}x', 'Nguyên hàm'),
      tpl(`\\frac{\\mathrm{d}}{\\mathrm{d}x}`, '\\frac{\\mathrm{d}}{\\mathrm{d}x}#?', 'Đạo hàm theo x'),
      tpl(`f'(x)`, "f'(x)", 'Đạo hàm f′(x)'),
      tpl(`\\log_{${B}}${B}`, '\\log_{#?}#?', 'Lôgarit cơ số a'),
      tpl(`\\ln ${B}`, '\\ln #?', 'Lôgarit tự nhiên'),
      tpl(`${B}!`, '#@!', 'Giai thừa'),
      tpl(`C_{${B}}^{${B}}`, 'C_{#?}^{#?}', 'Tổ hợp chập k của n'),
      tpl(`A_{${B}}^{${B}}`, 'A_{#?}^{#?}', 'Chỉnh hợp chập k của n'),
      tpl(`\\bigcup_{${B}}^{${B}}`, '\\bigcup_{#?}^{#?}', 'Hợp nhiều tập'),
      tpl(`\\bigcap_{${B}}^{${B}}`, '\\bigcap_{#?}^{#?}', 'Giao nhiều tập'),
      tpl(`\\max_{${B}}`, '\\max_{#?}', 'Giá trị lớn nhất'),
      tpl(`\\min_{${B}}`, '\\min_{#?}', 'Giá trị nhỏ nhất')
    ]
  },
  {
    name: 'Khoảng cách',
    items: [
      tpl(`${B}\\,${B}`, '\\,', 'Khoảng cách hẹp'),
      tpl(`${B}\\:${B}`, '\\:', 'Khoảng cách vừa'),
      tpl(`${B}\;${B}`, '\;', 'Khoảng cách rộng'),
      tpl(`${B}\\quad ${B}`, '\\quad ', 'Khoảng cách 1 em'),
      tpl(`${B}\\qquad ${B}`, '\\qquad ', 'Khoảng cách 2 em'),
      tpl(`${B}\\!${B}`, '\\!', 'Kéo sát lại'),
      tpl(`\\displaystyle ${B}`, '\\displaystyle #@', 'Cỡ lớn (phân số, tổng đầy đủ)'),
      tpl(`\\textstyle ${B}`, '\\textstyle #@', 'Cỡ trong dòng'),
      tpl(`\\scriptstyle ${B}`, '\\scriptstyle #@', 'Cỡ chỉ số'),
      tpl(`\\dfrac{${B}}{${B}}`, '\\dfrac{#?}{#?}', 'Phân số luôn cỡ lớn'),
      tpl(`\\tfrac{${B}}{${B}}`, '\\tfrac{#?}{#?}', 'Phân số cỡ nhỏ')
    ]
  },
  {
    name: 'Hóa học',
    wide: true,
    items: [
      sym('\\ce{H2O}', 'Nước'),
      sym('\\ce{CO2}', 'Cacbon đioxit'),
      sym('\\ce{H2SO4}', 'Axit sunfuric'),
      sym('\\ce{NaOH}', 'Natri hiđroxit'),
      sym('\\ce{Ca(OH)2}', 'Canxi hiđroxit'),
      sym('\\ce{Fe^3+}', 'Ion dương'),
      sym('\\ce{SO4^2-}', 'Ion âm'),
      sym('\\ce{A + B -> C}', 'Phương trình phản ứng'),
      sym('\\ce{A + B ->[t^o] C}', 'Phản ứng có nhiệt độ'),
      sym('\\ce{A + B ->[t^o][xt] C}', 'Phản ứng có nhiệt độ và xúc tác'),
      sym('\\ce{A + B <=> C}', 'Phản ứng thuận nghịch'),
      sym('\\ce{2H2 + O2 ->[t^o] 2H2O}', 'Ví dụ: đốt hiđro'),
      sym('\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}', 'Chất khí bay lên'),
      sym('\\ce{BaCl2 + H2SO4 -> BaSO4 v + 2HCl}', 'Chất kết tủa'),
      sym('\\ce{CaCO3 ->[t^o] CaO + CO2 ^}', 'Ví dụ: nung đá vôi'),
      sym('\\ce{^{12}_{6}C}', 'Kí hiệu nguyên tử')
    ]
  },
  {
    name: 'Công thức THCS',
    wide: true,
    items: [
      sym('(a+b)^2=a^2+2ab+b^2', 'Bình phương của một tổng'),
      sym('(a-b)^2=a^2-2ab+b^2', 'Bình phương của một hiệu'),
      sym('a^2-b^2=(a-b)(a+b)', 'Hiệu hai bình phương'),
      sym('(a+b)^3=a^3+3a^2b+3ab^2+b^3', 'Lập phương của một tổng'),
      sym('(a-b)^3=a^3-3a^2b+3ab^2-b^3', 'Lập phương của một hiệu'),
      sym('a^3+b^3=(a+b)(a^2-ab+b^2)', 'Tổng hai lập phương'),
      sym('a^3-b^3=(a-b)(a^2+ab+b^2)', 'Hiệu hai lập phương'),
      sym('\\frac{a}{b}=\\frac{c}{d}', 'Tỉ lệ thức'),
      sym('ax^2+bx+c=0', 'Phương trình bậc hai'),
      sym('\\Delta=b^2-4ac', 'Biệt thức'),
      sym('x=\\frac{-b\\pm\\sqrt{\\Delta}}{2a}', 'Công thức nghiệm'),
      sym('\\begin{cases}x_1+x_2=-\\frac{b}{a}\\\\x_1x_2=\\frac{c}{a}\\end{cases}', 'Hệ thức Viète'),
      sym('BC^2=AB^2+AC^2', 'Định lý Pythagore'),
      sym('\\frac{AM}{AB}=\\frac{AN}{AC}', 'Định lý Thalès'),
      sym('\\sin^2\\alpha+\\cos^2\\alpha=1', 'Hệ thức lượng giác'),
      sym('C=2\\pi R', 'Chu vi đường tròn'),
      sym('S=\\pi R^2', 'Diện tích hình tròn'),
      sym('V=\\pi R^2h', 'Thể tích hình trụ'),
      sym('V=\\frac{1}{3}\\pi R^2h', 'Thể tích hình nón'),
      sym('V=\\frac{4}{3}\\pi R^3', 'Thể tích hình cầu')
    ]
  }
]
