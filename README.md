# LMS ProMax + flip-proxy

Hai thứ trong một repo:

- **LMS ProMax** (`public/`) — hệ thống luyện thi trắc nghiệm chạy trong trình duyệt:
  giáo viên tải đề PDF/DOCX/TXT lên, hệ thống tự bóc tách câu hỏi; học sinh luyện tập
  hoặc thi thử, có bấm giờ, chấm điểm, lịch sử và xem lại bài làm.
- **flip-proxy** (`proxy-server.js`) — proxy đọc sách flipbook, ẩn nút chia sẻ và QR
  của trang gốc (`/view/:bookId`).

## Dùng nhanh

```bash
npm start
```

Rồi mở **http://localhost:10000** — xong, không cần cài thêm gì.

Không muốn chạy lệnh? Mở thẳng file `public/lms.html` bằng trình duyệt cũng chạy được
(mọi thư viện đã nằm sẵn trong `public/vendor`, không cần mạng).

## Hướng dẫn dùng

**Giáo viên**

1. Đăng nhập, chọn tab 👨‍🏫 *Giáo viên*, nhập tên bất kỳ.
2. Vào **Nhận diện từ file** → chọn file PDF/DOCX/TXT hoặc dán thẳng nội dung đề.
3. Bấm **Nhận diện** → hệ thống bóc tách câu hỏi, phương án, đáp án, lời giải.
4. Kiểm tra lại, tick đáp án đúng cho những câu còn thiếu, rồi **Lưu đề thi**.

Định dạng đề mà hệ thống hiểu:

```
Câu 1. Tính 2 + 3 × 4 bằng bao nhiêu?
A. 20
B. 14
C. 24
D. 9
Đáp án: B
Lời giải: Nhân trước cộng sau nên 2 + 12 = 14.
```

Đáp án cũng có thể để thành bảng ở cuối đề (`1B 2A 3C 4C`). Đề không kèm đáp án vẫn
bóc tách được, chỉ cần tick tay ở bước sau. Công thức toán đặt trong `$...$`
(ví dụ `$x^2 + 1$`) sẽ được hiển thị đẹp.

**Học sinh**

- **Luyện tập**: làm từng câu, xem đáp án và lời giải ngay sau mỗi câu.
- **Thi thử**: bấm giờ theo thời lượng đề, hết giờ tự nộp, chấm điểm cuối bài.
- Kết quả và bài làm cũ lưu ở mục **Lịch sử & kết quả**.

## Lưu ý

Dữ liệu (đề thi, lịch sử) lưu trong `localStorage` của **chính trình duyệt đang mở**.
Nghĩa là đề giáo viên soạn trên máy mình thì học sinh ở máy khác không tự thấy được.
Cách chuyển đề sang máy khác: bấm **⬇️ Sao lưu** để tải file `.json`, rồi ở máy kia
bấm **⬆️ Phục hồi** và chọn file đó. Muốn dùng chung thật sự cho cả lớp thì cần thêm
máy chủ lưu dữ liệu — hiện repo chưa có phần này.

Xoá dữ liệu trình duyệt cũng xoá luôn đề thi, nên hãy sao lưu định kỳ.
