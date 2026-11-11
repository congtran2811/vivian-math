# Danh sách chức năng

Người dùng mục tiêu: giáo viên và học sinh THCS (lớp 6 đến lớp 9). Sau này mở rộng cho THPT.
Nền tảng: Windows trước, sau đó macOS (cùng một mã nguồn Electron).

## Bản đầu (Bước 2): trình soạn công thức

- [x] Soạn công thức trực quan (MathLive)
- [x] Bảng mẫu nhanh: phân số, căn, lũy thừa, hệ phương trình, góc, tam giác
- [x] Sửa trực tiếp bằng LaTeX
- [x] Sao chép LaTeX và MathML (dán vào Word)
- [x] Bảng ký hiệu đầy đủ theo nhóm như MathType (đại số, hình học, tập hợp, chữ Hy Lạp, mũi tên)
- [x] Mẫu theo chương trình THCS: tỉ lệ thức, hằng đẳng thức, căn bậc ba, hệ thức lượng, tỉ số lượng giác, định lý Pythagore, Thalès, Viète
- [x] Lưu và mở file (.vmath)
- [x] Danh sách công thức gần đây và thanh yêu thích (lưu biểu thức hay dùng)
- [x] Xuất ảnh PNG, SVG (nền trong suốt, chọn cỡ chữ và màu)
- [x] Sao chép dạng ảnh để dán vào Word, PowerPoint, Zalo
- [x] Hoàn tác, làm lại, phím tắt Ctrl+N, Ctrl+O, Ctrl+S
- [x] Phím tắt chèn mẫu giống MathType (Ctrl+F, Ctrl+R, Ctrl+H, Ctrl+L...)
- [x] Ma trận (thêm, xóa hàng và cột), biến đổi nhiều dòng thẳng hàng
- [x] Dấu trên chữ, đóng khung, gạch bỏ, kiểu chữ (đậm, đứng, lời văn)
- [x] Tô màu từng phần công thức, phóng to và thu nhỏ vùng soạn
- [x] Dán công thức từ Word (MathML) để sửa lại
- [x] Công thức và phương trình hóa học
- [x] Tìm ký hiệu theo tên trong mọi nhóm
- [x] Nhóm ký hiệu: ngoặc và nhãn (phần nguyên, khoảng, mũi tên có nhãn), tổng, tích phân, giới hạn, khoảng cách và cỡ chữ toán
- [x] Xuất ảnh JPG, chọn nền trắng hoặc trong suốt, chọn độ nét (1, 2, 4 lần)
- [x] Sao chép LaTeX kèm dấu $ để dán vào tài liệu LaTeX, Markdown
- [x] Bộ nút trong Word (Word 2007 trở lên, Windows): chèn, chèn có đánh số, sửa lại công thức; chèn và sửa lại đồ thị, hình phẳng, hình 3D. Xem `word-addin/README.md`
- [ ] Bộ nút trong Word cho macOS
- [ ] Nhập bằng chữ viết tay
- [ ] Giao diện tiếng Việt và tiếng Anh

## Bước 3: hình 3D và video giải thích

- [x] Đồ thị hàm số y = ax + b, y = ax², y = a/x, tìm giao điểm, xuất PNG và SVG
- [x] Hình học phẳng kèm lời giải: tam giác vuông, tam giác thường (nội tiếp, ngoại tiếp), chữ nhật, bình hành, thang cân, thoi, đường tròn và hình quạt
- [ ] Hình học phẳng nâng cao: góc nội tiếp, tiếp tuyến, tam giác đồng dạng
- [x] Hình không gian 3D xoay được: hình hộp, lập phương, lăng trụ, hình chóp, hình trụ, hình nón, hình cầu (kèm lời giải diện tích, thể tích theo kích thước tự chọn)
- [x] Video giải thích từng bước cho hình không gian, xuất MP4 (720p)
- [ ] Video giải bài cho đề bài bất kỳ
- [ ] AI đọc đề bài, sinh lời giải và kịch bản minh họa (để sau, cần khóa API)

## Bước 4: đóng gói

- [ ] Bản cài Windows (.exe)
- [ ] Bản cài macOS (.dmg)
