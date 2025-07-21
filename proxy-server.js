const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// FlipHTML5 source link
const FLIP_URL = "https://online.fliphtml5.com/ickgb/divg/";

app.use(cors());

app.get('/view', async (req, res) => {
  try {
    const response = await axios.get(FLIP_URL);
    const $ = cheerio.load(response.data);

    // Remove QR code, social share, and link
    $('[class*="share"], [class*="Social"], [href*="fliphtml5"]').remove();
    $('[src*="qrcode"], iframe[src*="share"], .qr, .qr-code, .share-btn').remove();
    $('[style*="position:fixed"]').remove();

    // Optional: Inject notice
    $('body').prepend('<div style="position:fixed;top:10px;left:10px;background:#111;color:#fff;padding:4px 8px;z-index:9999;font-size:12px;">Đang xem sách trong môi trường an toàn 🛡️</div>');

    res.send($.html());
  } catch (error) {
    console.error("❌ Error fetching FlipHTML5 content:", error);
    res.status(500).send("Lỗi proxy server.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server đang chạy tại http://localhost:${PORT}/view`);
});