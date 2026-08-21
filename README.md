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

## Công bố cho cả lớp dùng

Khi chạy qua `npm start` (hoặc deploy), đề thi nằm trên **máy chủ** chứ không nằm
trong máy từng người: giáo viên đăng đề một lần, học sinh mở link là thấy ngay,
làm xong điểm tự gửi về cho giáo viên.

### 1. Đặt mật khẩu giáo viên

```bash
TEACHER_PASSWORD=matkhau-cua-ban npm start
```

Chưa đặt thì máy chủ tự sinh một mật khẩu ngẫu nhiên và in ra màn hình lúc khởi động
(mỗi lần chạy lại một mật khẩu khác), nên khi dùng thật hãy đặt cố định.

Học sinh **không cần mật khẩu**, chỉ nhập tên. Không có mật khẩu thì không sửa hay
xoá được đề, cũng không xem được bảng điểm cả lớp.

### 2. Chỗ lưu dữ liệu

| Cách lưu | Khi nào dùng | Dữ liệu có còn sau khi máy chủ khởi động lại? |
|---|---|---|
| File `data/db.json` (mặc định) | chạy ở máy nhà, máy chủ riêng, VPS | Còn (trừ khi hosting dùng ổ đĩa tạm) |
| MongoDB (đặt `MONGODB_URI`) | deploy lên Render, Railway... | Còn |

**Quan trọng khi deploy lên Render bản miễn phí:** ổ đĩa là tạm, mất sạch mỗi lần
dịch vụ khởi động lại (Render tự tắt sau 15 phút không ai truy cập). Nếu không đặt
`MONGODB_URI` thì sáng hôm sau đề thi và điểm của học sinh sẽ biến mất. Màn hình
giáo viên sẽ hiện cảnh báo vàng khi rơi vào tình trạng này.

Lấy `MONGODB_URI` miễn phí: tạo tài khoản ở mongodb.com/atlas → tạo cluster gói
**M0 (miễn phí)** → *Database Access* thêm user và mật khẩu → *Network Access* chọn
`0.0.0.0/0` → bấm **Connect → Drivers** và chép chuỗi dạng
`mongodb+srv://user:matkhau@cluster.xxxxx.mongodb.net/`.

### 3. Deploy lên Render

1. Gộp nhánh này vào `main` (Render đang theo dõi repo này).
2. Trong Render → dịch vụ của bạn → **Environment**, thêm hai biến:
   - `TEACHER_PASSWORD` = mật khẩu bạn chọn
   - `MONGODB_URI` = chuỗi kết nối lấy ở bước 2
3. Bấm **Manual Deploy → Deploy latest commit**, đợi log hiện
   `✅ Kho dữ liệu: MongoDB` và `✅ Proxy server đang chạy tại cổng ...`.
4. Gửi link `https://<tên-dịch-vụ>.onrender.com` cho học sinh.

Kiểm tra nhanh sau khi deploy: mở `https://<link>/api/health`, thấy
`"storage":"mongo","persistent":true` là dữ liệu đã được lưu lâu dài.

Lưu ý bản miễn phí của Render ngủ sau 15 phút không ai vào, nên em nào mở đầu tiên
sẽ phải đợi khoảng 30 giây.

### 4. Xem điểm học sinh

Menu **📋 Kết quả học sinh** (chỉ giáo viên thấy) liệt kê từng lượt làm bài kèm nút
**⬇️ Tải Excel** — file `.xlsx` gồm các cột: họ tên, đề thi, điểm, tổng số câu,
phần trăm, thời gian làm, hình thức (thi thử / luyện tập), thời điểm nộp.

## Lưu ý

- **Điểm do máy học sinh tự chấm rồi gửi về.** Hệ thống hợp để theo dõi việc luyện
  tập ở nhà, không nên dùng để chấm điểm chính thức: học sinh rành máy tính có thể
  xem trước đáp án hoặc gửi điểm giả.
- **Lịch sử làm bài của từng em** vẫn lưu trong trình duyệt của em đó; phần gửi về
  cho giáo viên chỉ gồm tên, tên đề, điểm và thời gian.
- Khi mở thẳng `public/lms.html` (không chạy máy chủ), ứng dụng quay về chế độ
  offline: đề lưu trong trình duyệt, không có mật khẩu và không gửi điểm đi đâu.
- Nên bấm **⬇️ Sao lưu** định kỳ để giữ một bản đề thi ngoài máy chủ.
