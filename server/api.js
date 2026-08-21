/* API dùng chung cho cả lớp:
   - Học sinh: xem đề (GET /api/exams) và nộp kết quả (POST /api/results)
   - Giáo viên: đăng nhập bằng mật khẩu rồi sửa đề, xem và tải kết quả về Excel
   Mật khẩu lấy từ biến môi trường TEACHER_PASSWORD. Nếu chưa đặt, máy chủ tự
   sinh một mật khẩu ngẫu nhiên và in ra log lúc khởi động. */
const express = require('express');
const crypto = require('crypto');
const { buildXlsx } = require('./xlsx');

const MAX_NAME = 60;
const MAX_TITLE = 200;

function tokenFor(password) {
  return crypto.createHash('sha256').update('lms-promax:' + password).digest('hex');
}

function sameToken(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const clean = (v, max) => String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const int = (v, min, max) => {
  const n = Math.round(Number(v));
  return isFinite(n) ? Math.min(max, Math.max(min, n)) : 0;
};

/* Kiểm tra đề thi gửi lên, cắt bớt những gì thừa. Không tin dữ liệu từ trình duyệt. */
function sanitizeExams(input) {
  if (!Array.isArray(input)) throw new Error('Danh sách đề không hợp lệ');
  if (input.length > 500) throw new Error('Quá nhiều đề (tối đa 500)');
  return input.map((e, i) => {
    if (!e || typeof e !== 'object' || !Array.isArray(e.questions)) throw new Error('Đề thứ ' + (i + 1) + ' sai định dạng');
    if (e.questions.length > 500) throw new Error('Đề "' + clean(e.title, 40) + '" có quá nhiều câu');
    return {
      id: clean(e.id, 60) || 'exam_' + Date.now() + '_' + i,
      title: clean(e.title, MAX_TITLE) || 'Đề không tên',
      subject: clean(e.subject, 50) || 'Khác',
      timeLimit: int(e.timeLimit, 1, 600) || 15,
      shuffle: e.shuffle !== false,
      questions: e.questions.map((q) => ({
        q: String(q && q.q || '').slice(0, 4000),
        a: (Array.isArray(q && q.a) ? q.a : []).slice(0, 4).map((x) => String(x === null || x === undefined ? '' : x).slice(0, 2000)),
        correct: int(q && q.correct, -1, 3),
        explain: String(q && q.explain || '').slice(0, 4000)
      }))
    };
  });
}

function createApi(store, options) {
  const opts = options || {};
  const password = opts.password;
  const token = tokenFor(password);
  const router = express.Router();
  const fails = new Map();          // chặn dò mật khẩu: đếm số lần sai theo IP

  router.use(express.json({ limit: '8mb' }));

  function isTeacher(req) {
    const header = req.get('authorization') || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    return sameToken(bearer || req.query.token || '', token);
  }
  function requireTeacher(req, res, next) {
    if (!isTeacher(req)) return res.status(401).json({ error: 'Cần đăng nhập bằng tài khoản giáo viên' });
    next();
  }

  router.get('/health', async (req, res) => {
    const [exams, results] = [await store.getExams(), await store.getResults()];
    res.json({
      ok: true,
      storage: store.kind,
      persistent: store.persistent,
      exams: exams.length,
      results: results.length,
      passwordFromEnv: !!opts.passwordFromEnv
    });
  });

  router.post('/login', (req, res) => {
    const ip = req.ip || 'x';
    const rec = fails.get(ip) || { n: 0, until: 0 };
    if (rec.until > Date.now()) {
      return res.status(429).json({ error: 'Sai mật khẩu nhiều lần, thử lại sau vài phút' });
    }
    const given = String((req.body && req.body.password) || '');
    if (given && given.length === password.length && sameToken(given, password)) {
      fails.delete(ip);
      return res.json({ token: token });
    }
    rec.n++;
    if (rec.n >= 8) { rec.until = Date.now() + 10 * 60 * 1000; rec.n = 0; }
    fails.set(ip, rec);
    res.status(401).json({ error: 'Mật khẩu giáo viên không đúng' });
  });

  router.get('/exams', async (req, res) => {
    try { res.json(await store.getExams()); }
    catch (err) { res.status(500).json({ error: 'Không đọc được kho đề: ' + err.message }); }
  });

  router.put('/exams', requireTeacher, async (req, res) => {
    try {
      const list = sanitizeExams(req.body && req.body.exams);
      const n = await store.setExams(list);
      console.log('📝 Giáo viên cập nhật kho đề: ' + n + ' đề');
      res.json({ ok: true, count: n });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/results', async (req, res) => {
    try {
      const b = req.body || {};
      const total = int(b.total, 0, 1000);
      const score = int(b.score, 0, total);
      const row = {
        student: clean(b.student, MAX_NAME) || 'Không tên',
        examTitle: clean(b.examTitle, MAX_TITLE) || 'Không rõ đề',
        mode: b.mode === 'exam' ? 'exam' : 'practice',
        score: score,
        total: total,
        percent: total ? Math.round(score / total * 100) : 0,
        timeSpent: int(b.timeSpent, 0, 24 * 3600),
        at: Date.now()
      };
      await store.addResult(row);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Không lưu được kết quả: ' + err.message });
    }
  });

  router.get('/results', requireTeacher, async (req, res) => {
    res.json(await store.getResults());
  });

  router.delete('/results', requireTeacher, async (req, res) => {
    await store.clearResults();
    res.json({ ok: true });
  });

  router.get('/results.xlsx', requireTeacher, async (req, res) => {
    const rows = await store.getResults();
    const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const data = [['Họ tên', 'Đề thi', 'Điểm', 'Tổng số câu', 'Phần trăm', 'Thời gian làm', 'Hình thức', 'Nộp lúc']]
      .concat(rows.map((r) => [
        r.student, r.examTitle, r.score, r.total, r.percent, fmt(r.timeSpent || 0),
        r.mode === 'exam' ? 'Thi thử' : 'Luyện tập',
        new Date(r.at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      ]));
    const buf = buildXlsx(data, 'Kết quả');
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ket-qua-hoc-sinh-' + stamp + '.xlsx"');
    res.send(buf);
  });

  return router;
}

module.exports = { createApi, tokenFor, sanitizeExams };
