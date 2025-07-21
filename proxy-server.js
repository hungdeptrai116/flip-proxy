const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Base FlipHTML5 URL
const FLIP_BASE = "https://online.fliphtml5.com/ickgb/divg";

app.use(cors());

// Route to sanitize main page
app.get('/view', async (req, res) => {
  try {
    const response = await axios.get(FLIP_BASE + "/");
    const $ = cheerio.load(response.data);

    // Remove QR code, social share, link copy
    $('[class*="share"], [class*="Social"], [href*="fliphtml5"]').remove();
    $('[src*="qrcode"], iframe[src*="share"], .qr, .qr-code, .share-btn').remove();
    $('[style*="position:fixed"]').remove();

    // Rewrite src/href links to go through proxy
    $('script[src], link[href], iframe[src]').each((_, el) => {
      const attr = el.name === 'link' ? 'href' : 'src';
      const original = $(el).attr(attr);
      if (original && !original.startsWith('http')) {
        $(el).attr(attr, `/proxy${original.startsWith('/') ? '' : '/'}${original}`);
      }
    });

    // Add banner
    $('body').prepend('<div style="position:fixed;top:10px;left:10px;background:#111;color:#fff;padding:4px 8px;z-index:9999;font-size:12px;">Đang xem sách trong môi trường an toàn 🛡️</div>');

    res.send($.html());
  } catch (err) {
    console.error("❌ Proxy fetch failed:", err);
    res.status(500).send("Lỗi khi tải sách.");
  }
});

// Serve all additional assets
app.get('/proxy/*', async (req, res) => {
  try {
    const assetPath = req.params[0];
    const targetUrl = `${FLIP_BASE}/${assetPath}`;
    const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });

    // Forward headers (especially content-type)
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.send(response.data);
  } catch (err) {
    console.error(`❌ Failed to fetch asset: ${req.url}`, err.message);
    res.status(404).send("Tài nguyên không tồn tại");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Flip proxy chạy tại http://localhost:${PORT}/view`);
});