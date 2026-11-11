# Bộ nút Vivian Math cho Word

Thêm bốn nút vào thẻ **Add-Ins** của Word (Word 2007 trở lên, trên Windows):

| Nút | Tác dụng |
| --- | --- |
| Insert Equation | Mở Vivian Math, soạn xong bấm "Chèn vào Word" để đưa công thức vào vị trí con trỏ |
| Insert Numbered Equation | Công thức nằm giữa dòng riêng, số thứ tự (1), (2)... ở lề phải |
| Edit Equation | Bấm chọn một công thức đã chèn rồi bấm nút này để mở lại và sửa |
| Update Equation Numbers | Đánh số lại sau khi thêm, xóa hoặc đổi chỗ công thức |
| Insert Equation Reference | Nhập số của một công thức đã đánh số để chèn "(n)" vào chỗ con trỏ. Số này tự đổi theo khi bấm Update Equation Numbers |
| Toggle TeX | Gõ LaTeX giữa hai dấu `$`, ví dụ `$x^2+1$`, rồi bấm nút: mọi đoạn `$...$` trong vùng chọn (hoặc cả văn bản nếu không chọn gì) thành công thức. Chọn một công thức rồi bấm nút thì đổi ngược lại thành `$...$` |
| Format Equations | Đổi mọi công thức trong vùng chọn (hoặc cả văn bản) về cùng một cỡ chữ |

Tên nút và thông báo trong Word dùng tiếng Anh, vì hộp thông báo của Word hiển thị sai chữ tiếng Việt có dấu trên nhiều máy.

## Cài đặt

Đóng Word, mở Vivian Math và bấm **Cài vào Word**. Hoặc chạy tay:

```
powershell -ExecutionPolicy Bypass -File install.ps1
```

Gỡ bỏ: chạy `uninstall.ps1`, hoặc xóa file `VivianMath.dotm` trong `%APPDATA%\Microsoft\Word\STARTUP`.

## Cách hoạt động

- `install.ps1` dùng chính Word để tạo `VivianMath.dotm` từ `VivianMath.bas` và lưu vào thư mục STARTUP của Word.
- Khi bấm nút, Word ghi công thức cần sửa và cỡ chữ hiện tại vào một thư mục tạm, rồi mở Vivian Math với tham số `--word-session=<thư mục>`.
- Vivian Math ghi lại ảnh PNG, mã LaTeX và kích thước. Word chèn ảnh thẳng hàng với dòng chữ và lưu LaTeX trong phần mô tả (alt text) của ảnh với tiền tố `VivianMath:`, nhờ đó công thức sửa lại được.
- Số thứ tự là trường `SEQ Equation` của Word, nên dùng được với tham chiếu chéo và mục lục công thức.

Vì sao không dùng add-in web của Office: Word 2016 chạy add-in web bằng nhân Internet Explorer 11, không chạy được trình soạn công thức. Cách dùng macro này chạy trên mọi bản Word cho Windows.
