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

app.get('/', (req, res) => {
  res.send('🛡️ FlipHTML5 Secure Proxy đang hoạt động!');
});

app.get('/view/:bookId', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Không tìm thấy sách");

  try {
    const response = await axios.get(flipUrl + '/');
    const $ = cheerio.load(response.data);

    // Xóa QR code, share, footer
    $('[class*="share"], [class*="Social"], [href*="fliphtml5"], iframe[src*="share"]').remove();
    $('[src*="qrcode"], .qr, .qr-code').remove();
    $('[style*="position:fixed"]').remove();

    // Fix src/href → chuyển về proxy
    $('script[src], link[href], iframe[src]').each((_, el) => {
      const attr = el.name === 'link' ? 'href' : 'src';
      const original = $(el).attr(attr);
      if (original && !original.startsWith('http')) {
        const clean = original.startsWith('/') ? original : '/' + original;
        $(el).attr(attr, `/asset/${bookId}${clean}`);
      }
    });

    // Banner an toàn
    $('body').prepend(`
      <div style="position:fixed;top:10px;left:10px;background:#000;color:#fff;padding:5px 10px;z-index:9999;font-size:13px;">
        📖 Bạn đang đọc sách trong môi trường an toàn
      </div>
    `);

    res.send($.html());
  } catch (err) {
    console.error('❌ Lỗi lấy nội dung sách:', err.message);
    res.status(500).send("Lỗi tải sách.");
  }
});

app.get('/asset/:bookId/*', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Sách không tồn tại");

  const path = req.params[0];
  const target = `${flipUrl}/${path}`;
  try {
    const response = await axios.get(target, { responseType: 'arraybuffer' });
    for (const [key, value] of Object.entries(response.headers)) {
      res.setHeader(key, value);
    }
    res.send(response.data);
  } catch (err) {
    console.error(`❌ Asset không tải được: ${target}`, err.message);
    res.status(404).send("Không tìm thấy tài nguyên.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy đang chạy tại http://localhost:${PORT}`);
});
