const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const BOOKS = {
  toan: "https://online.fliphtml5.com/ickgb/divg",
};

app.get('/view/:bookId', async (req, res) => {
  const { bookId } = req.params;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Không tìm thấy sách");

  try {
    const { data } = await axios.get(flipUrl + "/");
    const $ = cheerio.load(data);

    // Ẩn các phần chia sẻ / nhúng
    $('[class*="share"], [class*="Social"], [href*="fliphtml5"]').remove();
    $('[src*="qrcode"], iframe[src*="share"], .qr, .qr-code, .share-btn').remove();
    $('[style*="position:fixed"]').remove();

    // Chuyển tất cả resource về proxy
    $('script[src], link[href], iframe[src]').each((_, el) => {
      const attr = el.name === 'link' ? 'href' : 'src';
      const original = $(el).attr(attr);
      if (original && !original.startsWith('http')) {
        const clean = original.startsWith('/') ? original.slice(1) : original;
        $(el).attr(attr, `/asset/${bookId}/${clean}`);
      }
    });

    // Thêm overlay bảo vệ
    $('body').prepend(`
      <div style="position:fixed;top:10px;left:10px;background:#111;color:#fff;padding:6px 10px;z-index:9999;font-size:12px;border-radius:5px;">
        🛡️ Bạn đang đọc sách trong môi trường an toàn
      </div>
    `);

    res.send($.html());
  } catch (err) {
    console.error("❌ Proxy fetch failed:", err.message);
    res.status(500).send("Lỗi khi tải sách.");
  }
});

app.get('/asset/:bookId/*', async (req, res) => {
  const { bookId } = req.params;
  const assetPath = req.params[0];
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Sách không tồn tại");

  try {
    const fullUrl = `${flipUrl}/${assetPath}`;
    const response = await axios.get(fullUrl, { responseType: 'arraybuffer' });

    Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
    res.send(response.data);
  } catch (err) {
    console.error(`❌ Asset load fail: ${assetPath}`, err.message);
    res.status(404).send("Không tìm thấy tài nguyên.");
  }
});

app.listen(PORT, () => {
  console.log(`🟢 Proxy server running at http://localhost:${PORT}`);
});
