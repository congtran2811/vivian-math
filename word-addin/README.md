# Bộ nút Vivian Math cho Word

Thêm bốn nút vào thẻ **Add-Ins** của Word (Word 2007 trở lên, trên Windows):

| Nút | Tác dụng |
| --- | --- |
| Chèn công thức | Mở Vivian Math, soạn xong bấm "Chèn vào Word" để đưa công thức vào vị trí con trỏ |
| Chèn công thức có đánh số | Công thức nằm giữa dòng riêng, số thứ tự (1), (2)... ở lề phải |
| Sửa công thức | Bấm chọn một công thức đã chèn rồi bấm nút này để mở lại và sửa |
| Cập nhật số thứ tự | Đánh số lại sau khi thêm, xóa hoặc đổi chỗ công thức |

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
