const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { createStore } = require('./server/store');
const { createApi } = require('./server/api');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

// Danh sách sách
const BOOKS = {
  toan: 'https://flipbookpdf.net/web/site/2f6cc5d4d8c04aff4eb3638db9212990f7670361202507.pdf.html'
};

// Proxy viewer
app.get('/view/:bookId', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Không tìm thấy sách");

  try {
    const response = await axios.get(flipUrl);
    const $ = cheerio.load(response.data);

    // Xoá phần chia sẻ, brand, QR...
    $('[class*="share"], [class*="qr"], [href*="flipbookpdf"]').remove();
    $('[style*="position:fixed"]').remove();

    // Gắn thông báo proxy an toàn
    $('body').prepend(`
      <div style="position:fixed;top:10px;left:10px;background:#111;color:#fff;padding:6px 10px;z-index:9999;font-size:13px;">
        📕 Bạn đang xem sách từ hệ thống proxy an toàn
      </div>
    `);

    res.send($.html());
  } catch (err) {
    console.error('❌ Không tải được sách:', err.message);
    res.status(500).send("Lỗi proxy khi tải sách.");
  }
});

// Khởi động: dựng kho dữ liệu -> gắn API -> phục vụ giao diện LMS
async function start() {
  const store = await createStore();

  const passwordFromEnv = !!process.env.TEACHER_PASSWORD;
  const password = passwordFromEnv
    ? process.env.TEACHER_PASSWORD
    : crypto.randomBytes(4).toString('hex');

  app.use('/api', createApi(store, { password, passwordFromEnv }));

  // Giao diện LMS ProMax - mở http://localhost:PORT là dùng được ngay
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lms.html')));

  app.listen(PORT, () => {
    console.log(`✅ Proxy server đang chạy tại cổng ${PORT}`);
    console.log(`📚 Mở trình duyệt: http://localhost:${PORT}`);
    if (passwordFromEnv) {
      console.log('🔑 Mật khẩu giáo viên: lấy từ biến môi trường TEACHER_PASSWORD');
    } else {
      console.log(`🔑 Chưa đặt TEACHER_PASSWORD. Mật khẩu giáo viên tạm thời lần này: ${password}`);
      console.log('   (Đặt biến môi trường TEACHER_PASSWORD để dùng mật khẩu cố định)');
    }
    if (!store.persistent) {
      console.log('⚠️  Đang lưu ra file. Nếu deploy trên Render bản miễn phí, hãy đặt MONGODB_URI');
      console.log('   nếu không dữ liệu sẽ mất mỗi khi máy chủ khởi động lại.');
    }
  });
}

start().catch((err) => {
  console.error('❌ Không khởi động được máy chủ:', err);
  process.exit(1);
});
