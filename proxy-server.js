const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const BOOKS = {
  toan: 'https://online.fliphtml5.com/ickgb/divg'
};

// Giao diện chính
app.get('/', (req, res) => {
  res.send('FlipHTML5 Proxy đang chạy');
});

// Proxy trang HTML chính
app.get('/view/:bookId', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Không tìm thấy sách");

  try {
    const response = await axios.get(flipUrl + '/');
    const $ = cheerio.load(response.data);

    // Xóa QR, nút chia sẻ, đường dẫn về fliphtml5
    $('[class*="share"], [class*="Social"], [href*="fliphtml5"]').remove();
    $('[src*="qrcode"], iframe[src*="share"], .qr, .qr-code, .share-btn').remove();
    $('[style*="position:fixed"]').remove();

    // Fix đường dẫn tài nguyên
    $('script[src], link[href], iframe[src]').each((_, el) => {
      const attr = el.name === 'link' ? 'href' : 'src';
      const original = $(el).attr(attr);
      if (original && !original.startsWith('http')) {
        const cleanPath = original.startsWith('/') ? original : '/' + original;
        $(el).attr(attr, `/asset/${bookId}${cleanPath}`);
      }
    });

    // Thêm dòng thông báo
    $('body').prepend(`
      <div style="position:fixed;top:10px;left:10px;background:#111;color:#fff;padding:4px 8px;z-index:9999;font-size:12px;">
        Đang xem sách trong môi trường an toàn 🛡️
      </div>
    `);

    res.send($.html());
  } catch (err) {
    console.error("❌ Proxy fetch failed:", err);
    res.status(500).send("Lỗi khi tải sách.");
  }
});

// Proxy tài nguyên tĩnh
app.get('/asset/:bookId/*', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Sách không tồn tại");

  const assetPath = req.params[0];
  const targetUrl = `${flipUrl}/${assetPath}`;
  try {
    const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });

    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.send(response.data);
  } catch (err) {
    console.error(`❌ Failed to proxy asset: ${targetUrl}`, err.message);
    res.status(404).send("Không tìm thấy tài nguyên.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server is running at http://localhost:${PORT}`);
});

