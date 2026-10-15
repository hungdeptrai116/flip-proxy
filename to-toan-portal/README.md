# Website Tổ GDTX — Tuyển sinh học nghề & Ôn văn hóa

Site tĩnh (HTML + Tailwind + JavaScript thuần), **1 quản trị viên đăng bài trực tiếp trên trình duyệt**.
Dữ liệu lưu ở Cloud Firestore (chạy thật) hoặc `localStorage` (chạy thử).

**Vai trò của site:** kênh thông tin giúp ứng viên hiểu ngành nghề, điều kiện, hồ sơ và phân hiệu của Trường Cao đẳng Than - Khoáng sản Việt Nam rồi liên hệ Trường; kèm khu tài liệu **ôn văn hóa**.
Site **không nhận hồ sơ và không thu dữ liệu cá nhân** — hồ sơ và nhập học do Trường tiếp nhận tại các phân hiệu.

## 1. Chạy thử ngay (Chế độ Demo) — không cần cài gì

```bash
cd to-toan-portal
node serve.js          # mở http://localhost:8080
```

- Có sẵn 6 bài mẫu (Tuyển sinh học nghề, Đề cương vào 10, K10, K11, K12, Tin tức) và 3 file PDF mẫu.
- Quản trị: bấm **"Quản trị viên đăng nhập"** ở chân trang (hoặc mở `#/admin`).
  Tài khoản demo đã điền sẵn: `admin@demo.local` / `demo123`.
- Dữ liệu demo nằm trong trình duyệt này; **không có tính bảo mật**. Nút *Cài đặt → Khôi phục dữ liệu mẫu* đưa về ban đầu.
- Đổi cổng: `PORT=3000 node serve.js`. Thử trên điện thoại cùng Wi-Fi: `HOST=0.0.0.0 node serve.js`.

## 2. Chạy thật với Firebase (khoảng 10 phút)

1. Vào <https://console.firebase.google.com> → **Add project**.
2. **Authentication** → *Get started* → *Sign-in method* → bật **Email/Password** → tab *Users* → **Add user** (email + mật khẩu của quản trị viên, email viết thường).
   Sau khi tạo xong, nếu có tuỳ chọn *Settings → User actions → Enable create (sign-up)* thì tắt đi để không ai tự đăng ký thêm tài khoản.
3. **Firestore Database** → *Create database* → chọn vị trí gần Việt Nam → chế độ **Production**.
4. **Project settings (⚙)** → *Your apps* → biểu tượng **Web `</>`** → đăng ký app → copy khối `firebaseConfig`.
   Mở `config.js`, dán vào `firebaseConfig`, và điền `adminEmail` (đúng email ở bước 2).
5. **Firestore → Rules** → thay toàn bộ bằng nội dung file `firestore.rules`, **sửa `ADMIN_EMAIL@example.com` thành email quản trị** → **Publish**.
   (Hoặc dùng CLI: `firebase deploy --only firestore:rules` — đã có sẵn `firebase.json`.)

Tải lại trang: banner Demo biến mất. Vào `#/admin`, đăng nhập, **Cài đặt** để nhập hotline/email/Zalo/banner. Muốn có bài mẫu: *Cài đặt → Nạp 6 bài mẫu vào Firestore*.

## Mục "Tuyển sinh học nghề" (trang `#/hoc-nghe`)

Toàn bộ nội dung trang này nằm trong **Quản trị → Cài đặt → Tuyển sinh học nghề** (lưu ở `settings/site.recruit`), **không phải sửa mã**:
ngành nghề, đối tượng, quyền lợi, lộ trình, hồ sơ, phân hiệu (kèm link Google Maps), hỏi đáp, tên người tư vấn, dòng nhắc ứng viên khi đến nộp hồ sơ.

- **Mặc định** chép từ *Thông báo tuyển dụng lao động, cử đi học nghề, bố trí việc làm năm 2026* của Trường (ngày 02/01/2026) và các poster hướng dẫn hồ sơ / địa chỉ phân hiệu. Nguồn và ngày luôn hiện đầu trang.
- **Một nguồn dữ liệu:** banner trang chủ (đối tượng, ngành, phân hiệu) và ô số liệu (số ngành, số phân hiệu) tự lấy từ mục này nếu để trống — sửa một chỗ, mọi nơi cập nhật.
- **Khi Trường đổi thông báo:** sửa tại đây và điền ô *Đã đối chiếu với Trường ngày*. Chỉ đăng thông tin đã được Trường xác nhận.
- **Số điện thoại:** nhập số tư vấn của Tổ GDTX ở *Thông tin chung → Hotline* và *Tên người tư vấn* (nên ghi tên thật). Mặc định **chỉ hiện số tư vấn này**; số điện thoại thứ hai (ví dụ số của Trường) để trống thì không hiện — muốn hiện thì điền ở Cài đặt. Nút "Gọi" ở các phân hiệu cũng gọi số tư vấn.
- Không đổi `firestore.rules`: `settings` đã cho admin ghi tự do; bài viết vẫn dùng 6 chuyên mục cũ (nhãn hiển thị đã đổi: `tuyen-sinh` = "Tuyển sinh học nghề", các `de-cuong-*` thuộc "Ôn văn hóa").
- Xem trước khi chia sẻ link (Zalo/Facebook) lấy từ thẻ Open Graph trong `index.html` và ảnh `assets/og.png`. Địa chỉ ảnh đang là `https://to-toan-portal.onrender.com/assets/og.png` — **đổi lại khi chuyển sang tên miền riêng**. Preview chỉ có cho cả trang, không riêng từng bài (site dùng `#`).

### Bài đăng chờ duyệt
Bài tuyển sinh viết sẵn nằm ở `docs/gdtx-portal/` (ngoài thư mục được đưa lên mạng, có chủ đích): `bai-dang-tuyen-sinh-2026.md` để sếp đọc/duyệt (kèm các điểm cần xác nhận) và `bai-dang-tuyen-sinh-2026.json` để nhập.
Nhập: *Quản trị → Cài đặt → Nhập từ file JSON* — bài vào ở trạng thái **ẨN**; sau khi duyệt, vào danh sách bài bấm **Hiện**. Nhập lại cùng file sẽ ghi đè (cùng ID), tiện khi sửa theo góp ý của sếp.

### Trước khi công bố rộng
Các thông báo/poster của Trường còn vài chỗ ghi khác nhau; cần người phụ trách của Trường xác nhận rồi mới sửa ở Cài đặt:
độ tuổi (18–35 hay 18–40) · lương "bình quân 20–25 triệu" tính thế nào và từ giai đoạn nào · khoản nào miễn phí (ăn, ở, xe) · công ty/mỏ/địa điểm làm việc sau đào tạo ·
số ảnh 3x4 (05 hay 06) · giấy khai sinh là bản sao hay photo công chứng · nơi nộp hồ sơ (địa phương hay phân hiệu) · cách Trường ghi nhận người giới thiệu.

## 3. Đưa lên mạng

**Vercel** (thư mục nằm trong repo): *New Project* → chọn repo → **Root Directory = `to-toan-portal`** → Framework Preset **Other**, để trống Build/Output → Deploy.
Nếu muốn repo riêng: copy nội dung thư mục này (trừ `node_modules/`) sang repo mới rồi import như trên.

**GitHub Pages**: copy nội dung thư mục này vào **gốc** của một repo mới → *Settings → Pages → Deploy from a branch → `main` / `(root)`*.
Site dùng định tuyến bằng `#/…` nên không cần cấu hình chuyển hướng.

## 4. Dùng hằng ngày

- **Viết bài mới**: tiêu đề, chuyên mục, ảnh đại diện (bỏ trống = ảnh Toán học mặc định theo chuyên mục), nội dung, đính kèm đề cương.
- **Công thức Toán** (KaTeX): trong dòng `$x^2-5x+6=0$`, riêng một dòng `$$x=\dfrac{-b\pm\sqrt{\Delta}}{2a}$$`. Gõ ký hiệu đô la thường bằng `\$`. Chưa quen LaTeX → dùng ô **Σ Chèn công thức mẫu**.
- **Markdown**: `## Tiêu đề`, `**đậm**`, `*nghiêng*`, danh sách `- ` / `1. `, bảng `| a | b |`, liên kết `[chữ](https://…)`, ảnh `![mô tả](https://…)` (hoặc dùng thanh công cụ).
- **Đề cương PDF**: dán link chia sẻ Google Drive (`…/file/d/ID/view`), hệ thống tự tạo khung **Xem trước** (`/preview`) và nút **Tải** (`uc?export=download`). Có thể thêm nhiều tài liệu trong 1 bài. Cũng nhận link Google Docs/Sheets/Slides, thư mục Drive, link PDF/Word/PowerPoint trực tiếp.
  **Bắt buộc** chia sẻ file Drive ở chế độ *"Bất kỳ ai có đường liên kết"*, nếu không khung xem sẽ báo cần quyền truy cập.
- **Ghim** bài lên đầu trang chủ (tối đa 3 bài mới nhất hiện ở "Bài tiêu điểm"). **Ẩn** = lưu nháp, chỉ quản trị thấy.
- **Sao lưu**: *Cài đặt → Tải bản sao lưu (JSON)*; *Nhập từ file JSON* để khôi phục hoặc chuyển bài từ Demo sang Firebase.

## 5. Cấu trúc thư mục

```
index.html            khung trang
config.js             firebaseConfig + adminEmail  (file duy nhất cần sửa để chạy thật)
firestore.rules       quy tắc bảo mật Firestore
firebase.json         để deploy rules bằng CLI
serve.js              máy chủ tĩnh cục bộ (không cần cài gói)
js/util.js            escape an toàn, icon, kiểm tra URL, nhận diện link Drive, làm sạch dữ liệu
js/markdown.js        Markdown + KaTeX, không chèn HTML thô
js/data.js            chuyên mục, cài đặt mặc định (gồm mục tuyển sinh học nghề), 6 bài demo
js/recruit.js         trang #/hoc-nghe và khối giới thiệu nhanh ở trang chủ
js/store.js           lớp dữ liệu: Demo (localStorage) / Firebase (Firestore + Auth)
js/views.js           giao diện công khai
js/admin.js           trang quản trị
js/app.js             định tuyến, trạng thái, sự kiện
assets/               logo, ảnh bìa mặc định, PDF mẫu, CSS
vendor/katex/         KaTeX 0.16.9 (đã kèm, chạy offline)
assets/fonts/         Be Vietnam Pro (font thiết kế cho dấu tiếng Việt)
```

Sửa giao diện bằng Tailwind: `npm install` rồi `npm run build:css` (file `assets/tailwind.css` đã build sẵn nên chỉ cần khi đổi class).

## 6. Bảo mật và giới hạn — đọc trước khi dùng thật

- **Chỉ tài khoản có email `adminEmail` ghi được** (do `firestore.rules`, không phải do giao diện). Ẩn nút trong giao diện không phải là bảo mật.
- **Khác với `read: if true` thuần**: rules này chặn đọc bài đang **Ẩn** ở tầng máy chủ. Nếu để `read: if true` cho cả collection, ai biết `projectId` đều truy vấn được bài nháp. Giao diện khách đã truy vấn `where('hidden','==',false)` để khớp rules.
- Rules kiểm tra theo **email**. Muốn chặt hơn: so theo UID (có sẵn dòng gợi ý trong `firestore.rules`).
- `apiKey` trong `config.js` là công khai theo thiết kế của Firebase; sức mạnh nằm ở rules.
- Mỗi bài tối đa **khoảng 1 MB** (giới hạn tài liệu Firestore): ảnh dùng link, PDF để trên Drive; đừng dán ảnh base64.
- Ai có link Drive đều xem được — **không đưa tài liệu mật**. File Drive lớn có thể hiện trang cảnh báo quét virus của Google khi bấm Tải.
- PDF link trực tiếp trong khung xem: một số trình duyệt di động (đặc biệt iPhone) thường chỉ hiện trang đầu; dùng link Drive hoặc nút **Mở toàn màn hình / Tải** (mở tab mới).
- Định tuyến bằng `#/…` nên Google khó lập chỉ mục từng bài, và khi chia sẻ link bài lên Zalo/Facebook sẽ không có ảnh/tiêu đề riêng. Cần SEO từng bài thì phải chuyển sang tạo trang tĩnh riêng cho mỗi bài (thay đổi kiến trúc).
- Firebase SDK tải từ `www.gstatic.com`. Mạng nhà trường chặn domain này thì web ở chế độ Firebase sẽ không tải được dữ liệu (sau 15 giây hiện thông báo lỗi). Cách xử lý nâng cao: đóng gói SDK bằng esbuild thành các module ESM và trỏ `firebaseBaseUrl` trong `config.js` tới đó (xem chú thích trong file).
- Dữ liệu và số liệu trong Demo (hotline, số giáo viên, điểm trung bình…) chỉ là **mẫu**. Ở chế độ Firebase, mục chưa nhập hiển thị "—" hoặc bị ẩn, không có số liệu bịa.

KaTeX và Tailwind CSS theo giấy phép MIT. Font **Be Vietnam Pro** (đã kèm trong `assets/fonts/`, chạy offline) theo SIL Open Font License 1.1, xem `assets/fonts/OFL-LICENSE.txt`.
