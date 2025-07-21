const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Map bookId to FlipHTML5 URLs (add more as needed)
const BOOKS = {
  toan: "https://online.fliphtml5.com/ickgb/divg",
  // Add more books like:
  // hoa: "https://online.fliphtml5.com/xyz456/abc2"
};

app.use(cors());

// View specific book: /view/:bookId
app.get('/view/:bookId', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Không tìm thấy sách");

  try {
    const response = await axios.get(flipUrl + "/");
    const $ = cheerio.load(response.data);

    // Remove social/QR/share
    $('[class*="share"], [class*="Social"], [href*="fliphtml5"]').remove();
    $('[src*="qrcode"], iframe[src*="share"], .qr, .qr-code, .share-btn').remove();
    $('[style*="position:fixed"]').remove();

    // Re-route internal assets
    $('script[src], link[href], iframe[src]').each((_, el) => {
      const attr = el.name === 'link' ? 'href' : 'src';
      const original = $(el).attr(attr);
      if (original && !original.startsWith('http')) {
        $(el).attr(attr, `/asset/${bookId}${original.startsWith('/') ? '' : '/'}${original}`);
      }
    });

    // Optional banner
    $('body').prepend('<div style="position:fixed;top:10px;left:10px;background:#111;color:#fff;padding:4px 8px;z-index:9999;font-size:12px;">Đang xem sách trong môi trường an toàn 🛡️</div>');

    res.send($.html());
  } catch (err) {
    console.error("❌ Proxy fetch failed:", err);
    res.status(500).send("Lỗi khi tải sách.");
  }
});

// Serve all other assets: /asset/:bookId/...
app.get('/asset/:bookId/*', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Sách không tồn tại");

  const assetPath = req.params[0];
  const targetUrl = `${flipUrl}/${assetPath}`;
  try {
    const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });

    // Preserve content-type and other headers
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
  console.log(`🚀 Proxy chạy tại http://localhost:${PORT}/view/:bookId`);
});