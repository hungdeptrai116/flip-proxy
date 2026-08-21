const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Giao diện LMS ProMax (thư mục public) - mở http://localhost:PORT là dùng được ngay
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'lms.html')));

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

// Khởi động server
app.listen(PORT, () => {
  console.log(`✅ Proxy server đang chạy tại cổng ${PORT}`);
  console.log(`📚 Mở trình duyệt: http://localhost:${PORT}`);
});
