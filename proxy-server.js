const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());

const BOOKS = {
  toan: "https://online.fliphtml5.com/ickgb/divg"
};

// Route để proxy trang FlipHTML5 và loại bỏ các thành phần không mong muốn
app.get('/view/:bookId', async (req, res) => {
  const bookId = req.params.bookId;
  const flipUrl = BOOKS[bookId];
  if (!flipUrl) return res.status(404).send("Không tìm thấy sách");

  try {
    const response = await axios.get(flipUrl + "/");
    const $ = cheerio.load(response.data);

    // Xóa các thành phần chia sẻ và theo dõi
    $('[class*="share"], [class*="Social"], [href*="fliphtml5"]').remove();
    $('[src*="qrcode"], iframe[src*="share"], .qr, .qr-code, .share-btn').remove();
    $('[style*="position:fixed"]').remove();

    // Gắn lại các src/href để đi qua proxy
    $('script[src], link[href], iframe[src]').each((_, el) => {
      const attr = el.name === 'link' ? 'href' : 'src';
      const original = $(el).attr(attr);
      if (original && !original.startsWith('http')) {
        $(el).attr(attr, `/asset/${bookId}${original.startsWith('/') ? '' : '/'}${original}`);
      }
    });

    // Thêm thông báo
    $('body').prepend('<div style="position:fixed;top:10px;left:10px;background:#111;color:#fff;padding:4px 8px;z-index:9999;font-size:12px;">📖 Bạn đang đọc sách trong môi trường an toàn</div>');

    res.send($.html());
  } catch (err) {
    console.error("❌ Proxy fetch failed:", err.message);
    res.status(500).send("Lỗi khi tải sách.");
  }
});

// Route để proxy các asset của sách
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
    console.error(`❌ Asset fetch error: ${targetUrl}`, err.message);
    res.status(404).send("Không tìm thấy tài nguyên.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy server running at http://localhost:${PORT}`);
});
