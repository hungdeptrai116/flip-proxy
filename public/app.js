/* =========================================================================
   LMS ProMax - ứng dụng luyện thi chạy hoàn toàn trong trình duyệt.
   Không cần build, không cần mạng: mọi thư viện nằm trong public/vendor.
   Dữ liệu lưu ở localStorage của chính trình duyệt đang mở.
   ========================================================================= */
(function () {
'use strict';

/* ---------- Khoá lưu trữ ---------- */
const K_USER = 'promax_user', K_EXAMS = 'promax_exams', K_HISTORY = 'promax_history';
const K_TOKEN = 'promax_token';

/* ---------- Tiện ích DOM ---------- */
function h(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;           // chỉ dùng cho HTML do mình tạo
      else if (k === 'math') renderMath(node, v);          // nội dung của người dùng -> an toàn
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (k === 'checked' || k === 'disabled' || k === 'selected') node[k] = !!v;
      else if (k === 'value') node.value = v;
      else node.setAttribute(k, v);
    }
  }
  (Array.isArray(children) ? children : [children]).forEach(function (c) {
    if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  });
  return node;
}
const $ = function (sel, root) { return (root || document).querySelector(sel); };

/* Chèn văn bản có công thức $...$ vào node.
   Văn bản người dùng luôn đi qua createTextNode nên không thể chèn HTML lạ. */
function renderMath(node, text) {
  node.textContent = '';
  if (text === null || text === undefined || text === '') return;
  const parts = String(text).split(/(\$[^$]*\$)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.length > 2 && part[0] === '$' && part[part.length - 1] === '$' && window.katex) {
      const span = document.createElement('span');
      try {
        span.innerHTML = katex.renderToString(part.slice(1, -1), { throwOnError: false });
      } catch (e) {
        span.textContent = part;
      }
      node.appendChild(span);
    } else {
      node.appendChild(document.createTextNode(part));
    }
  }
}

function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60), sec = s % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function toast(msg, type) {
  const box = $('#toast');
  const t = h('div', { class: 'toast ' + (type || 'success'), text: msg });
  box.appendChild(t);
  setTimeout(function () { t.remove(); }, 3200);
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const val = JSON.parse(raw);
    return val === null || val === undefined ? fallback : val;
  } catch (e) { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); }
  catch (e) { toast('Không lưu được dữ liệu (bộ nhớ trình duyệt đã đầy)', 'error'); }
}


/* =========================================================================
   GIAO TIẾP VỚI MÁY CHỦ
   Có máy chủ  -> kho đề dùng chung cho cả lớp, học sinh nộp kết quả về cho GV.
   Không có    -> chạy hoàn toàn trong máy (mở file lms.html trực tiếp, hoặc mất mạng).
   ========================================================================= */
const server = { on: false, persistent: false, needsSetup: false, token: load(K_TOKEN, '') };

async function apiFetch(path, opts) {
  const o = Object.assign({ headers: {} }, opts || {});
  if (server.token) o.headers['Authorization'] = 'Bearer ' + server.token;
  if (o.body !== undefined && typeof o.body !== 'string') {
    o.headers['Content-Type'] = 'application/json';
    o.body = JSON.stringify(o.body);
  }
  const res = await fetch('api/' + path, o);
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.error) || ('Máy chủ báo lỗi ' + res.status));
    err.status = res.status;
    throw err;
  }
  return data;
}

/* Token hết hiệu lực (đổi mật khẩu, máy chủ khởi động lại...) -> bắt đăng nhập lại */
function handleAuthError(err) {
  if (err && err.status === 401) {
    server.token = '';
    save(K_TOKEN, '');
    localStorage.removeItem(K_USER);
    state.user = null;
    render();
    toast('Phiên đăng nhập đã hết hạn, mời đăng nhập lại', 'error');
    return true;
  }
  return false;
}

/* Lấy kho đề từ máy chủ. Có máy chủ thì đó là nguồn duy nhất: trống nghĩa là
   trống, không chèn đề minh hoạ trong máy vào, tránh vô tình đăng đề demo cho
   cả lớp. Phải gọi sau mọi lần đổi tư cách người dùng (đăng nhập, thiết lập). */
async function syncExams() {
  try {
    const list = await apiFetch('exams');
    state.exams = Array.isArray(list) ? list : [];
    saveExams();                          // lưu tạm để lỡ mất mạng vẫn ôn được
    return true;
  } catch (err) {
    toast('Không lấy được đề từ máy chủ, đang dùng bản lưu trong máy', 'error');
    return false;
  }
}

/* Đẩy toàn bộ kho đề lên máy chủ. Trả về true nếu đã lưu được. */
async function pushExams() {
  if (!server.on) { saveExams(); return true; }
  try {
    await apiFetch('exams', { method: 'PUT', body: { exams: state.exams } });
    saveExams();                            // giữ một bản trong máy để lỡ mất mạng vẫn xem được
    return true;
  } catch (err) {
    if (handleAuthError(err)) return false;
    toast('Không lưu được lên máy chủ: ' + err.message, 'error');
    return false;
  }
}

/* =========================================================================
   BÓC TÁCH ĐỀ THI TỪ VĂN BẢN
   ========================================================================= */
const RE_QUES_KW = /^(?:câu|cau|bài|bai|question)\s*\d+\s*[.:)\]]?/i;
const RE_QUES    = /^(?:(?:câu|cau|bài|bai|question)\s*)?(\d+)\s*[.:)\]]\s*(.*)$/i;
const RE_OPT     = /^([A-Da-d])\s*[.):\]]\s*(.*)$/;
const RE_ANS     = /^(?:đáp\s*án\s*đúng|đáp\s*án|dap\s*an|đ\s*\/\s*a|chọn)\s*[:.\-–]?\s*([A-Da-d])\s*$/i;
const RE_EXP     = /^(?:lời\s*giải\s*chi\s*tiết|lời\s*giải|giải\s*thích|hướng\s*dẫn\s*giải|hướng\s*dẫn|loi\s*giai|giai\s*thich|huong\s*dan)\s*[:.\-–]?\s*(.*)$/i;
const RE_KEYHDR  = /^(?:bảng\s*đáp\s*án|đáp\s*án(?:\s*đề)?|answer\s*key|dap\s*an)\s*[:.\-–]?\s*$/i;
const RE_KEYLINE = /^(?:bảng\s*đáp\s*án|đáp\s*án|answer\s*key)?\s*[:.\-–]?\s*(?:\d+\s*[.\-:)]?\s*[A-Da-d]\b[\s,;.]*){2,}$/i;
const RE_KEYPAIR = /^\d+\s*[.\-:)]?\s*[A-Da-d]\s*$/;

/* Trả các dòng đã chuẩn hoá. Văn bản lấy từ PDF thường mất dấu xuống dòng nên
   phải cắt lại trước "Câu 1.", trước "A." và trước "Đáp án:". */
function normalizeLines(raw) {
  let text = String(raw || '').replace(/\r\n?/g, '\n').replace(/[   ]/g, ' ');
  text = text
    .replace(/[ \t]+(?=(?:câu|cau|bài|bai|question)\s*\d+\s*[.:)\]])/gi, '\n')
    .replace(/[ \t]+(?=[A-D]\s*[.):]\s)/g, '\n')
    .replace(/[ \t]+(?=(?:đáp\s*án|dap\s*an|lời\s*giải|giải\s*thích|hướng\s*dẫn)\s*[:.\-–])/gi, '\n');
  return text.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
}

/* Một số đề để riêng bảng đáp án ở cuối: "1A 2C 3B 4D".
   Hàm này gom các cặp số-chữ đó lại theo số thứ tự câu. */
function parseAnswerKey(lines) {
  const key = {};
  let inKeySection = false;
  for (const line of lines) {
    if (RE_KEYHDR.test(line)) { inKeySection = true; continue; }   // dòng tiêu đề "ĐÁP ÁN"
    const isPairLine = RE_KEYLINE.test(line) || (inKeySection && RE_KEYPAIR.test(line));
    if (!isPairLine) { inKeySection = false; continue; }
    inKeySection = true;
    const re = /(\d+)\s*[.\-:)]?\s*([A-Da-d])\b/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      key[Number(m[1])] = m[2].toUpperCase().charCodeAt(0) - 65;
    }
  }
  return key;
}

/* Bóc tách đề. Trả về { questions, dropped } - dropped là số câu bị bỏ vì
   không đủ 2 phương án, để còn báo cho người dùng biết. */
function parseExam(rawText) {
  const lines = normalizeLines(rawText);
  const answerKey = parseAnswerKey(lines);
  const questions = [];
  let dropped = 0;
  let cur = null, inExplain = false, inKeyBlock = false;

  function flush() {
    if (cur) {
      const opts = cur.a.filter(function (o) { return o.trim() !== ''; });
      if (cur.q.trim() && opts.length >= 2) {
        while (cur.a.length < 4) cur.a.push('');
        questions.push({
          num: cur.num,
          q: cur.q.replace(/\s+/g, ' ').trim(),
          a: cur.a.slice(0, 4).map(function (o) { return o.replace(/\s+/g, ' ').trim(); }),
          correct: cur.correct,
          explain: cur.explain.replace(/\s+/g, ' ').trim()
        });
      } else if (cur.q.trim()) {
        dropped++;
      }
    }
    cur = null; inExplain = false;
  }

  for (const line of lines) {
    if (RE_KEYHDR.test(line)) { inKeyBlock = true; continue; }   // tiêu đề "ĐÁP ÁN"
    if (RE_KEYLINE.test(line) && !RE_OPT.test(line)) { inKeyBlock = true; continue; }
    if (inKeyBlock && RE_KEYPAIR.test(line)) continue;            // 1C, 2A... mỗi dòng một cặp
    inKeyBlock = false;

    const mAns = line.match(RE_ANS);
    if (mAns && cur) {                       // chỉ gán cho câu đang xử lý, không đụng câu trước
      cur.correct = mAns[1].toUpperCase().charCodeAt(0) - 65;
      inExplain = false;
      continue;
    }

    const mExp = line.match(RE_EXP);
    if (mExp && cur) {
      cur.explain = mExp[1] || '';
      inExplain = true;
      continue;
    }

    const mOpt = line.match(RE_OPT);
    if (mOpt && cur && !inExplain && cur.a.length < 4) {
      cur.a.push(mOpt[2] || '');
      continue;
    }

    const mQ = line.match(RE_QUES);
    const startsNew = mQ && (!inExplain || RE_QUES_KW.test(line));
    if (startsNew) {
      flush();
      cur = { num: Number(mQ[1]), q: mQ[2] || '', a: [], correct: -1, explain: '' };
      continue;
    }

    /* dòng nối tiếp: thuộc về lời giải, phương án cuối, hoặc đề bài */
    if (!cur) continue;
    if (inExplain) cur.explain += (cur.explain ? ' ' : '') + line;
    else if (cur.a.length) cur.a[cur.a.length - 1] += ' ' + line;
    else cur.q += ' ' + line;
  }
  flush();

  /* áp bảng đáp án cuối đề cho những câu chưa có đáp án */
  questions.forEach(function (q, i) {
    if (q.correct === -1) {
      const byNum = answerKey[q.num];
      const byPos = answerKey[i + 1];
      const idx = byNum !== undefined ? byNum : byPos;
      if (idx !== undefined && idx >= 0 && idx <= 3) q.correct = idx;
    }
    delete q.num;
  });

  return { questions: questions, dropped: dropped };
}

/* Trộn câu hỏi và trộn cả phương án (có ánh xạ lại đáp án đúng) */
function buildAttempt(exam) {
  let qs = exam.questions.map(function (q) {
    return { q: q.q, a: q.a.slice(), correct: q.correct, explain: q.explain || '' };
  });
  if (!exam.shuffle) return qs;
  qs = shuffleArray(qs);
  return qs.map(function (q) {
    if (q.a.some(function (o) { return !o || !o.trim(); })) return q;   // có ô trống thì giữ nguyên
    const order = shuffleArray(q.a.map(function (_, i) { return i; }));
    return {
      q: q.q,
      a: order.map(function (i) { return q.a[i]; }),
      correct: order.indexOf(q.correct),
      explain: q.explain
    };
  });
}

function scoreAttempt(questions, answers) {
  let n = 0;
  questions.forEach(function (q, i) { if (answers[i] === q.correct) n++; });
  return n;
}

/* =========================================================================
   DỮ LIỆU MẶC ĐỊNH
   ========================================================================= */
const DEFAULT_EXAMS = [{
  id: 'exam_demo_1',
  title: 'Đề minh hoạ - Toán 12',
  subject: 'Toán học',
  timeLimit: 15,
  shuffle: true,
  questions: [
    { q: 'Cho hàm số $y = x^3 - 3x^2 + 1$. Hàm số đồng biến trên khoảng nào?',
      a: ['$(-\\infty;0)$ và $(2;+\\infty)$', '$(0;2)$', '$(-\\infty;2)$', '$(0;+\\infty)$'],
      correct: 0, explain: '$y\' = 3x^2 - 6x = 3x(x-2) > 0$ khi $x<0$ hoặc $x>2$.' },
    { q: 'Nghiệm của phương trình $2^x = 8$ là:',
      a: ['$x=2$', '$x=3$', '$x=4$', '$x=1$'],
      correct: 1, explain: '$2^x = 2^3 \\Rightarrow x = 3$.' },
    { q: 'Đạo hàm của $f(x)=\\sin x$ là:',
      a: ['$-\\sin x$', '$\\cos x$', '$-\\cos x$', '$\\tan x$'],
      correct: 1, explain: '$(\\sin x)\' = \\cos x$.' }
  ]
}];

/* =========================================================================
   TRẠNG THÁI
   ========================================================================= */
const state = {
  user: load(K_USER, null),
  exams: load(K_EXAMS, DEFAULT_EXAMS),
  history: load(K_HISTORY, []),
  view: 'dashboard',
  draft: null,
  run: null,
  lastResult: null
};
let timerId = null;

function saveExams() { save(K_EXAMS, state.exams); }
function saveHistory() { save(K_HISTORY, state.history); }
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
function go(view) { stopTimer(); state.view = view; render(); window.scrollTo(0, 0); }

/* =========================================================================
   KHUNG GIAO DIỆN
   ========================================================================= */
const TITLES = {
  dashboard: function () { return state.user.role === 'teacher' ? 'Bảng điều khiển' : 'Danh sách đề thi'; },
  edit: function () { return state.draft && state.draft.id ? 'Sửa đề thi' : 'Soạn đề thi mới'; },
  bulk: function () { return 'Tự động nhận diện từ file'; },
  results: function () { return state.user.role === 'teacher' ? 'Kết quả học sinh nộp về' : 'Kết quả & lịch sử'; },
  exam: function () { return 'Đang làm bài'; },
  result: function () { return 'Kết quả & lịch sử'; },
  review: function () { return 'Xem lại bài làm'; }
};

function sidebar() {
  const menu = state.user.role === 'teacher'
    ? [{ id: 'dashboard', icon: '📊', label: 'Bảng điều khiển' },
       { id: 'bulk', icon: '⚡', label: 'Nhận diện từ file' }].concat(
         server.on ? [{ id: 'results', icon: '📋', label: 'Kết quả học sinh' }] : [])
    : [{ id: 'dashboard', icon: '📚', label: 'Đề thi' },
       { id: 'result', icon: '🏆', label: 'Lịch sử & kết quả' }];

  return h('aside', { class: 'sidebar' }, [
    h('div', { class: 'sidebar-head' }, [
      h('div', { class: 'logo', text: '∑' }),
      h('div', {}, [
        h('div', { class: 'sidebar-name', text: 'LMS ProMax' }),
        h('div', { class: 'sidebar-sub', text: state.user.name })
      ])
    ]),
    h('nav', { class: 'sidebar-nav' }, menu.map(function (m) {
      return h('button', {
        class: 'nav-item' + (state.view === m.id ? ' active' : ''),
        onclick: function () { go(m.id); }
      }, [h('span', { text: m.icon }), m.label]);
    })),
    h('div', { class: 'sidebar-foot' }, [
      h('button', { class: 'nav-item danger', onclick: logout }, [h('span', { text: '🚪' }), 'Đăng xuất'])
    ])
  ]);
}

function logout() {
  if (!confirm('Đăng xuất khỏi hệ thống?')) return;
  localStorage.removeItem(K_USER);
  state.user = null; state.view = 'dashboard'; state.run = null; state.draft = null;
  stopTimer(); render();
}

function render() {
  const root = $('#root');
  root.textContent = '';
  if (server.needsSetup) { root.appendChild(viewSetup()); return; }
  if (!state.user) { root.appendChild(viewLogin()); return; }

  const body = state.user.role === 'teacher' ? teacherView() : studentView();
  const actions = state.user.role === 'teacher'
    ? h('div', { class: 'row' }, [
        h('button', { class: 'btn btn-ghost btn-sm', onclick: exportData }, '⬇️ Sao lưu'),
        h('button', { class: 'btn btn-ghost btn-sm', onclick: function () { $('#restore-file').click(); } }, '⬆️ Phục hồi'),
        h('input', { type: 'file', id: 'restore-file', class: 'hidden', accept: '.json', onchange: importData })
      ])
    : null;

  root.appendChild(h('div', { class: 'app' }, [
    sidebar(),
    h('div', { class: 'main' }, [
      h('header', { class: 'topbar' }, [h('h1', { text: TITLES[state.view] ? TITLES[state.view]() : '' }), actions]),
      h('main', { class: 'content fade-in' }, [body])
    ])
  ]));
}

/* =========================================================================
   THIẾT LẬP LẦN ĐẦU
   Máy chủ vừa dựng xong, chưa có mật khẩu giáo viên. Người mở trang đầu tiên
   đặt mật khẩu, sau đó màn này biến mất vĩnh viễn.
   ========================================================================= */
function viewSetup() {
  const pass1 = h('input', { class: 'input', type: 'password', placeholder: 'Mật khẩu giáo viên (ít nhất 6 ký tự)' });
  const pass2 = h('input', { class: 'input', type: 'password', placeholder: 'Nhập lại mật khẩu', style: 'margin-top:10px' });
  const nameInput = h('input', { class: 'input', type: 'text', placeholder: 'Tên của bạn (VD: Thầy Hùng)', style: 'margin-top:10px' });
  const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit', style: 'margin-top:14px' }, 'Đặt mật khẩu & bắt đầu');

  const form = h('form', {
    onsubmit: async function (e) {
      e.preventDefault();
      const pw = pass1.value;
      if (pw.length < 6) { toast('Mật khẩu phải từ 6 ký tự trở lên', 'error'); pass1.focus(); return; }
      if (pw !== pass2.value) { toast('Hai ô mật khẩu chưa giống nhau', 'error'); pass2.focus(); return; }
      const name = nameInput.value.trim() || 'Giáo viên';

      btn.disabled = true;
      try {
        const res = await apiFetch('setup', { method: 'POST', body: { password: pw } });
        server.token = res.token;
        save(K_TOKEN, server.token);
        server.needsSetup = false;
        state.user = { role: 'teacher', name: name };
        save(K_USER, state.user);
        state.view = 'dashboard';
        await syncExams();               // kho đề của lớp còn trống, đừng dùng đề demo trong máy
        render();
        toast('Xong! Giờ bạn có thể tải đề lên cho học sinh.');
      } catch (err) {
        btn.disabled = false;
        toast(err.message, 'error');
      }
    }
  }, [pass1, pass2, nameInput, btn]);

  return h('div', { class: 'login-wrap' }, [
    h('div', { class: 'login-box fade-in' }, [
      h('div', { style: 'text-align:center;margin-bottom:20px' }, [
        h('div', { class: 'login-logo', text: '∑' }),
        h('h1', { style: 'font-size:22px', text: 'Thiết lập lần đầu' }),
        h('p', { class: 'muted', text: 'Đặt mật khẩu giáo viên cho lớp học của bạn' })
      ]),
      h('div', { class: 'note', style: 'background:#fef3c7' }, [
        h('b', { style: 'color:#b45309', text: '⚠️ Làm ngay bây giờ' }),
        h('p', { style: 'margin:6px 0 0' },
          'Ai mở trang này đầu tiên cũng đặt được mật khẩu. Hãy đặt xong rồi mới gửi link cho học sinh.')
      ]),
      form
    ])
  ]);
}

/* =========================================================================
   ĐĂNG NHẬP
   ========================================================================= */
function viewLogin() {
  let role = 'student';
  const nameInput = h('input', { class: 'input', type: 'text', placeholder: 'Nhập tên của bạn', maxlength: '40' });
  const tabStudent = h('button', { type: 'button', class: 'tab active' }, '🎓 Học sinh');
  const tabTeacher = h('button', { type: 'button', class: 'tab' }, '👨‍🏫 Giáo viên');

  const passInput = h('input', { class: 'input', type: 'password', placeholder: 'Mật khẩu giáo viên', style: 'margin-top:10px' });
  const passWrap = h('div', { class: 'hidden' }, [passInput]);
  const submitBtn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Vào hệ thống');

  function setRole(r) {
    role = r;
    const teacher = r === 'teacher';
    tabTeacher.className = teacher ? 'tab active' : 'tab';
    tabStudent.className = teacher ? 'tab' : 'tab active';
    nameInput.placeholder = teacher ? 'Tên giáo viên' : 'Nhập tên của bạn';
    passWrap.className = teacher && server.on ? '' : 'hidden';
  }
  tabStudent.addEventListener('click', function () { setRole('student'); });
  tabTeacher.addEventListener('click', function () { setRole('teacher'); });

  const form = h('form', {
    onsubmit: async function (e) {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) { toast('Vui lòng nhập tên!', 'error'); nameInput.focus(); return; }

      if (role === 'teacher' && server.on) {
        if (!passInput.value) { toast('Nhập mật khẩu giáo viên', 'error'); passInput.focus(); return; }
        submitBtn.disabled = true;
        try {
          const res = await apiFetch('login', { method: 'POST', body: { password: passInput.value } });
          server.token = res.token;
          save(K_TOKEN, server.token);
        } catch (err) {
          submitBtn.disabled = false;
          toast(err.message, 'error');
          passInput.value = '';
          passInput.focus();
          return;
        }
        submitBtn.disabled = false;
      }

      state.user = { role: role, name: name };
      save(K_USER, state.user);
      state.view = 'dashboard';
      render();
      toast('Xin chào ' + name + '!');
      if (server.on) syncExams().then(render);
    }
  }, [
    h('div', { class: 'tabs' }, [tabStudent, tabTeacher]),
    nameInput,
    passWrap,
    h('div', { style: 'height:12px' }),
    submitBtn
  ]);

  return h('div', { class: 'login-wrap' }, [
    h('div', { class: 'login-box fade-in' }, [
      h('div', { style: 'text-align:center;margin-bottom:24px' }, [
        h('div', { class: 'login-logo', text: '∑' }),
        h('h1', { style: 'font-size:22px', text: 'LMS ProMax' }),
        h('p', { class: 'muted', text: 'Hệ thống luyện thi thông minh' })
      ]),
      form,
      h('p', { class: 'muted', style: 'text-align:center;margin:14px 0 0;font-size:12px',
        text: server.on ? 'Đề thi lấy từ máy chủ của lớp' : 'Đang chạy trong máy, dữ liệu lưu tại trình duyệt này' })
    ])
  ]);
}

/* =========================================================================
   SAO LƯU / PHỤC HỒI
   ========================================================================= */
function exportData() {
  const blob = new Blob([JSON.stringify(state.exams, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: 'de-thi-promax.json' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  toast('Đã tải file sao lưu');
}

function validExam(e) {
  return e && typeof e.title === 'string' && Array.isArray(e.questions) &&
    e.questions.every(function (q) {
      return q && typeof q.q === 'string' && Array.isArray(q.a) && q.a.length >= 2 && typeof q.correct === 'number';
    });
}

function importData(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data) || !data.every(validExam)) { toast('File không đúng định dạng đề thi', 'error'); return; }
      const clean = data.map(function (e2, i) {
        return {
          id: e2.id || 'exam_' + Date.now() + '_' + i,
          title: e2.title, subject: e2.subject || 'Khác',
          timeLimit: Number(e2.timeLimit) > 0 ? Number(e2.timeLimit) : 15,
          shuffle: e2.shuffle !== false,
          questions: e2.questions.map(function (q) {
            return { q: q.q, a: q.a.slice(0, 4), correct: q.correct, explain: q.explain || '' };
          })
        };
      });
      if (!confirm('Thay thế toàn bộ ' + state.exams.length + ' đề hiện có bằng ' + clean.length + ' đề trong file?')) return;
      const backup = state.exams.slice();
      state.exams = clean;
      pushExams().then(function (okSaved) {
        if (!okSaved) state.exams = backup;
        render();
        if (okSaved) toast('Đã phục hồi ' + clean.length + ' đề thi');
      });
    } catch (err) { toast('File này không phải bản sao lưu của LMS ProMax (cần file .json xuất từ nút "Sao lưu")', 'error'); }
  };
  reader.readAsText(file);
  ev.target.value = '';
}

/* =========================================================================
   GIÁO VIÊN
   ========================================================================= */
function teacherView() {
  if (state.view === 'edit') return viewExamForm();
  if (state.view === 'bulk') return viewBulk();
  if (state.view === 'results') return viewTeacherResults();
  return viewTeacherDashboard();
}

/* Bảng điểm học sinh nộp về, kèm nút tải Excel */
function viewTeacherResults() {
  const box = h('div', {}, [h('p', { class: 'muted', text: 'Đang tải kết quả...' })]);

  function draw(rows) {
    box.textContent = '';
    const head = h('div', { class: 'row', style: 'margin-bottom:14px' }, [
      h('h2', { style: 'font-size:16px', text: 'Tổng cộng ' + rows.length + ' lượt làm bài' }),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn-ghost btn-sm', onclick: function () { go('results'); } }, '🔄 Tải lại'),
      h('button', {
        class: 'btn btn-ok btn-sm', disabled: !rows.length,
        onclick: function () { window.location.href = 'api/results.xlsx?token=' + encodeURIComponent(server.token); }
      }, '⬇️ Tải Excel'),
      h('button', {
        class: 'btn btn-danger-ghost btn-sm', disabled: !rows.length,
        onclick: async function () {
          if (!confirm('Xoá toàn bộ ' + rows.length + ' kết quả? Nên tải Excel về trước khi xoá.')) return;
          try { await apiFetch('results', { method: 'DELETE' }); go('results'); toast('Đã xoá toàn bộ kết quả'); }
          catch (err) { if (!handleAuthError(err)) toast(err.message, 'error'); }
        }
      }, 'Xoá tất cả')
    ]);

    const table = h('div', { class: 'card' }, [head]);
    if (!rows.length) {
      table.appendChild(h('p', { class: 'empty', text: 'Chưa có học sinh nào nộp bài.' }));
    } else {
      table.appendChild(h('div', { class: 'row', style: 'font-size:12px;font-weight:700;color:var(--muted);padding:0 14px 6px' }, [
        h('span', { style: 'flex:2', text: 'HỌC SINH' }),
        h('span', { style: 'flex:3', text: 'ĐỀ THI' }),
        h('span', { style: 'flex:1;text-align:center', text: 'ĐIỂM' }),
        h('span', { style: 'flex:1;text-align:right', text: 'NỘP LÚC' })
      ]));
      rows.forEach(function (r) {
        table.appendChild(h('div', { class: 'exam-row', style: 'gap:8px' }, [
          h('span', { style: 'flex:2;font-weight:600;min-width:0', text: r.student }),
          h('span', { style: 'flex:3;min-width:0', class: 'muted', text: r.examTitle + ' · ' + (r.mode === 'exam' ? 'Thi thử' : 'Luyện tập') }),
          h('span', { style: 'flex:1;text-align:center;font-weight:700;color:' + (r.percent >= 80 ? 'var(--ok)' : r.percent >= 50 ? '#2563eb' : 'var(--bad)'),
            text: r.score + '/' + r.total }),
          h('span', { style: 'flex:1;text-align:right', class: 'muted',
            text: new Date(r.at).toLocaleString('vi-VN') })
        ]));
      });
    }
    box.appendChild(table);
    box.appendChild(h('p', { class: 'muted', style: 'margin-top:10px;font-size:12px',
      text: 'Điểm do máy của học sinh tự chấm rồi gửi về, phù hợp để theo dõi việc luyện tập ở nhà.' }));
  }

  apiFetch('results')
    .then(draw)
    .catch(function (err) {
      if (handleAuthError(err)) return;
      box.textContent = '';
      box.appendChild(h('p', { class: 'empty', text: 'Không tải được kết quả: ' + err.message }));
    });
  return box;
}

function newDraft() {
  return { title: '', subject: 'Toán học', timeLimit: 15, shuffle: true,
           questions: [{ q: '', a: ['', '', '', ''], correct: -1, explain: '' }] };
}

function viewTeacherDashboard() {
  const totalQ = state.exams.reduce(function (s, e) { return s + e.questions.length; }, 0);
  const warn = server.on && !server.persistent
    ? h('div', { class: 'note', style: 'background:#fef3c7' }, [
        h('b', { style: 'color:#b45309', text: '⚠️ Dữ liệu trên máy chủ chưa được lưu lâu dài' }),
        h('p', { style: 'margin:6px 0 0' }, 'Đề thi và kết quả có thể mất khi máy chủ khởi động lại. ' +
          'Hãy đặt biến môi trường MONGODB_URI trên Render, hoặc bấm "⬇️ Sao lưu" thường xuyên.')
      ])
    : null;
  const rows = state.exams.length
    ? state.exams.map(function (exam) {
        return h('div', { class: 'exam-row' }, [
          h('div', { style: 'min-width:0' }, [
            h('h3', { style: 'font-size:15px', text: exam.title }),
            h('p', { class: 'muted', text: exam.subject + ' · ' + exam.questions.length + ' câu · ' + exam.timeLimit + ' phút' + (exam.shuffle ? ' · có trộn đề' : '') })
          ]),
          h('div', { class: 'row' }, [
            h('button', { class: 'btn btn-soft btn-sm', onclick: function () {
              state.draft = JSON.parse(JSON.stringify(exam)); go('edit');
            } }, 'Sửa'),
            h('button', { class: 'btn btn-danger-ghost btn-sm', onclick: function () {
              if (!confirm('Xoá đề "' + exam.title + '"?')) return;
              const backup = state.exams.slice();
              state.exams = state.exams.filter(function (e) { return e.id !== exam.id; });
              pushExams().then(function (okSaved) {
                if (!okSaved) state.exams = backup;
                render();
                if (okSaved) toast('Đã xoá đề thi');
              });
            } }, 'Xoá')
          ])
        ]);
      })
    : [h('p', { class: 'empty', text: 'Chưa có đề nào. Bấm "Nhận diện từ file" để tải đề lên.' })];

  return h('div', {}, [
    warn,
    h('div', { class: 'grid grid-3', style: 'margin-bottom:20px' }, [
      h('div', { class: 'card' }, [h('div', { class: 'stat-label', text: 'Tổng số đề thi' }), h('div', { class: 'stat-value', style: 'color:var(--brand)', text: state.exams.length })]),
      h('div', { class: 'card' }, [h('div', { class: 'stat-label', text: 'Tổng số câu hỏi' }), h('div', { class: 'stat-value', style: 'color:var(--ok)', text: totalQ })]),
      h('div', { class: 'card', style: 'display:flex;align-items:center' }, [
        h('button', { class: 'btn btn-primary btn-block', onclick: function () { go('bulk'); } }, '⚡ Tải đề lên tự động')
      ])
    ]),
    h('div', { class: 'card' }, [
      h('div', { class: 'row', style: 'margin-bottom:16px' }, [
        h('h2', { style: 'font-size:16px', text: 'Danh sách đề thi' }),
        h('div', { class: 'spacer' }),
        h('button', { class: 'btn btn-soft btn-sm', onclick: function () { state.draft = newDraft(); go('edit'); } }, '+ Tạo thủ công')
      ])
    ].concat(rows))
  ]);
}

/* ---------- Form soạn / sửa đề ---------- */
function viewExamForm() {
  if (!state.draft) state.draft = newDraft();
  const d = state.draft;

  const qList = h('div', { class: 'qlist' }, d.questions.map(function (q, idx) { return questionEditor(q, idx); }));

  return h('div', { class: 'card wrap-narrow' }, [
    h('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:12px' }, [
      h('div', { style: 'grid-column:1/-1' }, [
        h('label', { class: 'label', text: 'Tên đề thi' }),
        h('input', { class: 'input', type: 'text', value: d.title, placeholder: 'VD: Đề kiểm tra giữa kỳ Toán 12',
          oninput: function (e) { d.title = e.target.value; } })
      ]),
      h('div', {}, [
        h('label', { class: 'label', text: 'Môn học' }),
        h('select', { class: 'select', onchange: function (e) { d.subject = e.target.value; } },
          ['Toán học', 'Vật lý', 'Hoá học', 'Sinh học', 'Tiếng Anh', 'Ngữ văn', 'Lịch sử', 'Địa lý', 'Khác'].map(function (s) {
            return h('option', { value: s, selected: d.subject === s }, s);
          }))
      ]),
      h('div', {}, [
        h('label', { class: 'label', text: 'Thời gian (phút)' }),
        h('input', { class: 'input', type: 'number', min: '1', value: d.timeLimit,
          oninput: function (e) { d.timeLimit = Math.max(1, Number(e.target.value) || 1); } })
      ])
    ]),
    h('label', { class: 'row', style: 'margin-bottom:16px;font-size:14px' }, [
      h('input', { type: 'checkbox', checked: d.shuffle, onchange: function (e) { d.shuffle = e.target.checked; } }),
      'Trộn thứ tự câu hỏi và phương án khi học sinh làm bài'
    ]),
    qList,
    h('div', { class: 'row', style: 'margin-top:16px' }, [
      h('button', { class: 'btn btn-ghost', onclick: function () {
        d.questions.push({ q: '', a: ['', '', '', ''], correct: -1, explain: '' });
        render();
        const list = $('.qlist'); if (list) list.scrollTop = list.scrollHeight;
      } }, '+ Thêm câu'),
      h('button', { class: 'btn btn-ghost', onclick: function () { state.draft = null; go('dashboard'); } }, 'Huỷ'),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn btn-ok', style: 'min-width:160px', onclick: saveDraft }, '💾 Lưu đề thi')
    ])
  ]);
}

function questionEditor(q, idx) {
  const warn = h('span', { class: 'pill pill-warn', text: '⚠️ Chưa chọn đáp án đúng' });
  const card = h('div', { class: 'qcard' + (q.correct === -1 ? ' invalid' : '') }, [
    h('div', { class: 'row', style: 'margin-bottom:8px' }, [
      h('span', { style: 'font-weight:700;color:var(--brand)', text: 'Câu ' + (idx + 1) }),
      h('div', { class: 'spacer' }),
      q.correct === -1 ? warn : null,
      h('button', { class: 'btn btn-danger-ghost btn-sm', onclick: function () {
        if (state.draft.questions.length === 1) { toast('Đề phải có ít nhất 1 câu', 'error'); return; }
        state.draft.questions.splice(idx, 1); render();
      } }, 'Xoá câu')
    ]),
    h('textarea', { class: 'textarea', rows: '2', placeholder: 'Nội dung câu hỏi... (công thức đặt trong $...$)', value: q.q,
      oninput: function (e) { q.q = e.target.value; } })
  ]);

  q.a.forEach(function (ans, aIdx) {
    card.appendChild(h('div', { class: 'opt-edit' }, [
      h('input', {
        type: 'radio', name: 'correct-' + idx, checked: q.correct === aIdx, title: 'Đánh dấu đây là đáp án đúng',
        onchange: function () {
          q.correct = aIdx;
          card.className = 'qcard';
          if (warn.parentNode) warn.remove();
        }
      }),
      h('span', { style: 'font-weight:700;width:18px', text: String.fromCharCode(65 + aIdx) + '.' }),
      h('input', { class: 'input', type: 'text', value: ans, placeholder: 'Phương án ' + String.fromCharCode(65 + aIdx),
        oninput: function (e) { q.a[aIdx] = e.target.value; } })
    ]));
  });

  card.appendChild(h('input', { class: 'input', type: 'text', style: 'margin-top:8px', value: q.explain || '',
    placeholder: 'Lời giải (không bắt buộc)', oninput: function (e) { q.explain = e.target.value; } }));
  return card;
}

function saveDraft() {
  const d = state.draft;
  if (!d.title.trim()) { toast('Chưa nhập tên đề thi', 'error'); return; }
  const noAns = d.questions.filter(function (q) { return q.correct === -1; }).length;
  if (noAns) { toast('Còn ' + noAns + ' câu chưa chọn đáp án đúng', 'error'); return; }
  const empty = d.questions.filter(function (q) {
    return !q.q.trim() || q.a.slice(0, 4).some(function (a) { return !a.trim(); });
  }).length;
  if (empty) { toast('Còn ' + empty + ' câu thiếu nội dung hoặc phương án', 'error'); return; }

  const exam = {
    id: d.id || 'exam_' + Date.now(),
    title: d.title.trim(), subject: d.subject, timeLimit: d.timeLimit, shuffle: d.shuffle,
    questions: d.questions.map(function (q) {
      return { q: q.q.trim(), a: q.a.map(function (a) { return a.trim(); }), correct: q.correct, explain: (q.explain || '').trim() };
    })
  };
  const i = state.exams.findIndex(function (e) { return e.id === exam.id; });
  const backup = state.exams.slice();
  if (i >= 0) state.exams[i] = exam; else state.exams.unshift(exam);

  pushExams().then(function (okSaved) {
    if (!okSaved) { state.exams = backup; render(); return; }
    state.draft = null;
    go('dashboard');
    toast('Đã lưu "' + exam.title + '" (' + exam.questions.length + ' câu)' +
      (server.on ? ' - học sinh vào là thấy ngay' : ''));
  });
}

/* =========================================================================
   NHẬN DIỆN ĐỀ TỪ FILE
   ========================================================================= */
/* Dựng lại các dòng của trang PDF: pdf.js trả về từng mảnh chữ rời rạc, phải
   dựa vào cờ hasEOL và toạ độ y để biết chỗ nào xuống dòng. */
function pdfPageToLines(items) {
  const lines = [];
  let line = '', lastY = null, lastRight = null;
  for (const it of items) {
    const str = it.str || '';
    const x = it.transform ? it.transform[4] : null;
    const y = it.transform ? it.transform[5] : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) { lines.push(line); line = ''; lastRight = null; }
    if (line && lastRight !== null && x !== null && x - lastRight > 1 && !/\s$/.test(line) && !/^\s/.test(str)) line += ' ';
    line += str;
    if (x !== null) lastRight = x + (it.width || 0);
    if (y !== null) lastY = y;
    if (it.hasEOL) { lines.push(line); line = ''; lastRight = null; }
  }
  if (line) lines.push(line);
  return lines;
}

async function readFileToText(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) {
    if (!window.pdfjsLib) throw new Error('Chưa tải được thư viện đọc PDF');
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let out = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      out = out.concat(pdfPageToLines(content.items));
    }
    return out.join('\n');
  }
  if (name.endsWith('.docx')) {
    if (!window.mammoth) throw new Error('Chưa tải được thư viện đọc DOCX');
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return res.value;
  }
  return await file.text();
}

function viewBulk() {
  const ta = h('textarea', { class: 'textarea', rows: '14',
    placeholder: 'Dán nội dung đề vào đây, hoặc chọn file PDF / DOCX / TXT ở trên...' });
  const status = h('p', { class: 'muted', style: 'margin:8px 0 0' });

  const fileInput = h('input', {
    type: 'file', accept: '.pdf,.docx,.txt', style: 'font-size:14px',
    onchange: async function (e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      status.textContent = '⏳ Đang đọc "' + f.name + '"...';
      try {
        ta.value = await readFileToText(f);
        status.textContent = '✅ Đã đọc xong. Kiểm tra nội dung rồi bấm "Nhận diện".';
      } catch (err) {
        status.textContent = '❌ Không đọc được file: ' + err.message +
          (location.protocol === 'file:' ? ' (mở bằng "npm start" rồi vào http://localhost:10000 để đọc PDF)' : '');
      }
      e.target.value = '';
    }
  });

  return h('div', { class: 'card wrap-narrow' }, [
    h('h2', { style: 'font-size:17px;margin-bottom:12px', text: '⚡ Tự động nhận diện đề từ file' }),
    h('div', { class: 'note' }, [
      h('b', { text: 'Hệ thống tự nhận diện được:' }),
      h('ul', {}, [
        h('li', { html: 'Câu hỏi mở đầu bằng <code>Câu 1.</code>, <code>Bài 1.</code> hoặc <code>1.</code>' }),
        h('li', { html: 'Phương án <code>A.</code> <code>B.</code> <code>C.</code> <code>D.</code> (chấp nhận cả <code>A)</code>)' }),
        h('li', { html: 'Dòng <code>Đáp án: B</code> đứng ngay dưới câu hỏi' }),
        h('li', { html: 'Bảng đáp án cuối đề dạng <code>1A 2C 3B 4D</code>' }),
        h('li', { html: 'Lời giải sau <code>Lời giải:</code> / <code>Giải thích:</code> / <code>Hướng dẫn:</code>' }),
        h('li', { text: 'Đề không kèm đáp án vẫn bóc tách được, bạn chỉ cần tick chọn đáp án đúng ở bước sau.' })
      ])
    ]),
    fileInput,
    status,
    h('div', { style: 'height:12px' }),
    ta,
    h('button', {
      class: 'btn btn-primary btn-block', style: 'margin-top:14px',
      onclick: function () {
        const res = parseExam(ta.value);
        if (!res.questions.length) {
          toast('Không nhận diện được câu hỏi nào. Kiểm tra lại định dạng đề.', 'error');
          return;
        }
        const missing = res.questions.filter(function (q) { return q.correct === -1; }).length;
        state.draft = {
          title: 'Đề nhận diện ngày ' + new Date().toLocaleDateString('vi-VN'),
          subject: 'Toán học', timeLimit: Math.max(5, res.questions.length), shuffle: true,
          questions: res.questions
        };
        go('edit');
        let msg = 'Đã bóc tách ' + res.questions.length + ' câu';
        if (res.dropped) msg += ', bỏ qua ' + res.dropped + ' câu thiếu phương án';
        msg += missing ? '. Còn ' + missing + ' câu cần chọn đáp án đúng.' : '. Đã có đủ đáp án!';
        toast(msg, missing ? 'info' : 'success');
      }
    }, '🤖 Nhận diện & chuyển sang form')
  ]);
}

/* =========================================================================
   HỌC SINH
   ========================================================================= */
function studentView() {
  if (state.view === 'exam' && state.run) return viewRunner();
  if (state.view === 'result') return viewResult();
  if (state.view === 'review' && state.lastResult) return viewReview();
  return viewStudentDashboard();
}

function startExam(exam, mode) {
  const questions = buildAttempt(exam);
  state.run = {
    title: exam.title, mode: mode, questions: questions,
    answers: new Array(questions.length).fill(null),
    current: 0, showExplain: false,
    time: mode === 'exam' ? exam.timeLimit * 60 : 0,
    limit: exam.timeLimit * 60
  };
  go('exam');
  startTicking();
}

function startTicking() {
  stopTimer();
  timerId = setInterval(function () {
    const run = state.run;
    if (!run) { stopTimer(); return; }
    run.time += run.mode === 'exam' ? -1 : 1;
    const clock = $('#clock');
    if (clock) {
      clock.textContent = fmtTime(run.time);
      clock.className = 'clock' + (run.mode === 'exam' && run.time <= 60 ? ' low' : '');
    }
    if (run.mode === 'exam' && run.time <= 0) { stopTimer(); finishExam(true); }
  }, 1000);
}

function viewStudentDashboard() {
  if (!state.exams.length) {
    return h('div', { class: 'card' }, [h('p', { class: 'empty', text: 'Chưa có đề thi nào. Hãy nhờ giáo viên tải đề lên.' })]);
  }
  return h('div', { class: 'grid grid-cards' }, state.exams.map(function (exam) {
    return h('div', { class: 'card' }, [
      h('div', { style: 'font-size:28px', text: '📝' }),
      h('h3', { style: 'font-size:17px;margin:6px 0', text: exam.title }),
      h('p', { class: 'muted', style: 'margin:0 0 14px', text: exam.subject + ' · ' + exam.questions.length + ' câu · ' + exam.timeLimit + ' phút' }),
      h('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr' }, [
        h('button', { class: 'btn btn-soft', onclick: function () { startExam(exam, 'practice'); } }, 'Luyện tập'),
        h('button', { class: 'btn btn-primary', onclick: function () { startExam(exam, 'exam'); } }, 'Thi thử')
      ])
    ]);
  }));
}

function viewRunner() {
  const run = state.run;
  const q = run.questions[run.current];
  const isExam = run.mode === 'exam';
  const answered = run.answers[run.current];
  const revealed = !isExam && run.showExplain;

  const nav = h('div', { class: 'qnav' }, run.questions.map(function (_, i) {
    return h('button', {
      class: (i === run.current ? 'current' : run.answers[i] !== null ? 'done' : ''),
      onclick: function () { run.current = i; run.showExplain = false; render(); }
    }, String(i + 1));
  }));

  const options = run.questions[run.current].a.map(function (text, idx) {
    let cls = 'opt';
    if (revealed) {
      if (idx === q.correct) cls += ' right';
      else if (idx === answered) cls += ' wrong';
      else cls += ' dim';
    } else if (idx === answered) cls += ' picked';
    return h('button', {
      class: cls, disabled: revealed,
      onclick: function () {
        if (revealed) return;
        run.answers[run.current] = idx;
        render();
      }
    }, [
      h('div', { class: 'key', text: String.fromCharCode(65 + idx) }),
      h('div', { class: 'opt-text math-formula', math: text })
    ]);
  });

  const card = h('div', { class: 'card' }, [
    h('div', { class: 'qtext math-formula', math: (run.current + 1) + '. ' + q.q })
  ].concat(options));

  if (revealed) {
    card.appendChild(h('div', { class: 'explain' }, [
      h('div', { style: 'font-weight:600;color:#1e40af;margin-bottom:4px',
        text: answered === q.correct ? '✅ Chính xác!' : '❌ Chưa đúng - đáp án là ' + String.fromCharCode(65 + q.correct) }),
      h('div', { class: 'math-formula', style: 'font-size:14px', math: q.explain || 'Câu này chưa có lời giải.' })
    ]));
  }

  const isLast = run.current === run.questions.length - 1;
  const actions = h('div', { class: 'row', style: 'margin-top:16px' }, []);

  if (!isExam && !revealed) {
    actions.appendChild(h('button', {
      class: 'btn btn-blue', style: 'flex:1', disabled: answered === null,
      onclick: function () { run.showExplain = true; render(); }
    }, answered === null ? 'Chọn một phương án để kiểm tra' : 'Kiểm tra đáp án'));
  }
  if (!isExam && revealed && !isLast) {
    actions.appendChild(h('button', {
      class: 'btn btn-primary', style: 'flex:1',
      onclick: function () { run.current++; run.showExplain = false; render(); }
    }, 'Câu tiếp theo →'));
  }
  if (!isExam && revealed && isLast) {
    actions.appendChild(h('button', {
      class: 'btn btn-ok', style: 'flex:1', onclick: function () { finishExam(false); }
    }, 'Kết thúc & xem kết quả'));
  }
  if (isExam) {
    const done = run.answers.filter(function (a) { return a !== null; }).length;
    actions.appendChild(h('button', {
      class: 'btn btn-bad', style: 'flex:1',
      onclick: function () {
        const left = run.questions.length - done;
        if (left && !confirm('Còn ' + left + ' câu chưa làm. Vẫn nộp bài?')) return;
        if (!left && !confirm('Nộp bài ngay?')) return;
        finishExam(false);
      }
    }, 'Nộp bài (' + done + '/' + run.questions.length + ')'));
  }
  actions.appendChild(h('button', {
    class: 'btn btn-ghost',
    onclick: function () {
      if (!confirm('Thoát và huỷ bài làm này?')) return;
      state.run = null; go('dashboard');
    }
  }, 'Thoát'));

  return h('div', { class: 'wrap-narrow' }, [
    h('div', { class: 'card row', style: 'margin-bottom:14px' }, [
      h('span', { class: 'pill ' + (isExam ? 'pill-bad' : 'pill-ok'), text: isExam ? '🔒 Thi thử' : '🌱 Luyện tập' }),
      h('span', { class: 'muted', text: run.title }),
      h('div', { class: 'spacer' }),
      h('span', { id: 'clock', class: 'clock' + (isExam && run.time <= 60 ? ' low' : ''), text: fmtTime(run.time) })
    ]),
    nav, card, actions
  ]);
}

function finishExam(timedOut) {
  stopTimer();
  const run = state.run;
  if (!run) return;
  const score = scoreAttempt(run.questions, run.answers);
  const total = run.questions.length;
  const result = {
    examTitle: run.title, mode: run.mode, score: score, total: total,
    percent: total ? Math.round(score / total * 100) : 0,
    timeSpent: run.mode === 'exam' ? run.limit - Math.max(0, run.time) : run.time,
    date: new Date().toLocaleString('vi-VN'),
    questions: run.questions, userAnswers: run.answers.slice()
  };
  state.history = [result].concat(state.history).slice(0, 50);
  saveHistory();
  state.lastResult = result;
  state.run = null;
  go('result');
  toast(timedOut ? 'Hết giờ! Bài đã được nộp tự động.' : 'Nộp bài thành công!', timedOut ? 'info' : 'success');

  if (server.on) {
    apiFetch('results', { method: 'POST', body: {
      student: state.user.name, examTitle: result.examTitle, mode: result.mode,
      score: result.score, total: result.total, timeSpent: result.timeSpent
    } }).catch(function () {
      toast('Không gửi được kết quả về cho giáo viên (kiểm tra mạng)', 'error');
    });
  }
}

function viewResult() {
  const r = state.lastResult;
  const items = state.history.length
    ? state.history.map(function (hh) {
        return h('div', { class: 'exam-row' }, [
          h('div', {}, [
            h('div', { style: 'font-weight:600', text: hh.examTitle }),
            h('div', { class: 'muted', text: hh.date + ' · ' + (hh.mode === 'exam' ? 'Thi thử' : 'Luyện tập') + ' · ' + hh.score + '/' + hh.total + ' câu' })
          ]),
          h('div', { class: 'row' }, [
            h('span', { style: 'font-size:19px;font-weight:700;color:' + (hh.percent >= 80 ? 'var(--ok)' : hh.percent >= 50 ? '#2563eb' : 'var(--bad)'), text: hh.percent + '%' }),
            h('button', { class: 'btn btn-soft btn-sm', onclick: function () { state.lastResult = hh; go('review'); } }, 'Xem lại')
          ])
        ]);
      })
    : [h('p', { class: 'empty', text: 'Chưa có lịch sử làm bài' })];

  const box = h('div', {}, []);
  if (r) {
    box.appendChild(h('div', {
      class: 'card', style: 'background:linear-gradient(to right,var(--brand),var(--brand2));color:#fff;border:none;margin-bottom:16px'
    }, [
      h('h2', { style: 'font-size:17px;margin-bottom:8px', text: 'Kết quả bài làm gần nhất' }),
      h('div', { class: 'row', style: 'align-items:flex-end;gap:14px' }, [
        h('div', { style: 'font-size:46px;font-weight:700;line-height:1', text: r.percent + '%' }),
        h('div', { style: 'opacity:.9;padding-bottom:6px', text: r.score + '/' + r.total + ' câu đúng · ' + fmtTime(r.timeSpent) })
      ]),
      h('button', { class: 'btn', style: 'background:#fff;color:var(--brand);margin-top:14px',
        onclick: function () { go('review'); } }, 'Xem lại bài làm')
    ]));
  }
  box.appendChild(h('div', { class: 'card' }, [h('h2', { style: 'font-size:16px;margin-bottom:14px', text: '📊 Lịch sử làm bài' })].concat(items)));
  return box;
}

function viewReview() {
  const r = state.lastResult;
  const blocks = r.questions.map(function (q, i) {
    const ua = r.userAnswers[i];
    const ok = ua === q.correct;
    const opts = q.a.map(function (text, idx) {
      let style = 'padding:10px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px;font-size:14px';
      if (idx === q.correct) style += ';border-color:#22c55e;background:#f0fdf4;font-weight:600';
      else if (idx === ua) style += ';border-color:#f87171;background:#fef2f2';
      return h('div', { class: 'math-formula', style: style, math: String.fromCharCode(65 + idx) + '. ' + text });
    });
    return h('div', { class: 'card', style: 'margin-bottom:12px' }, [
      h('div', { class: 'row', style: 'align-items:flex-start;margin-bottom:10px' }, [
        h('span', { class: 'pill ' + (ok ? 'pill-ok' : ua === null ? 'pill-muted' : 'pill-bad'),
          text: ok ? 'ĐÚNG' : ua === null ? 'BỎ TRỐNG' : 'SAI' }),
        h('div', { class: 'math-formula', style: 'flex:1;font-weight:600', math: (i + 1) + '. ' + q.q })
      ])
    ].concat(opts, q.explain
      ? [h('div', { class: 'explain math-formula', style: 'font-size:14px', math: '💡 ' + q.explain })]
      : []));
  });
  return h('div', { class: 'wrap-narrow' }, [
    h('div', { class: 'row', style: 'margin-bottom:12px' }, [
      h('button', { class: 'btn btn-ghost btn-sm', onclick: function () { go('result'); } }, '← Quay lại kết quả'),
      h('span', { class: 'muted', text: r.examTitle + ' · ' + r.score + '/' + r.total + ' câu đúng' })
    ])
  ].concat(blocks));
}

/* =========================================================================
   KHỞI ĐỘNG
   ========================================================================= */
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
}
window.addEventListener('beforeunload', function (e) {
  if (state.run && state.run.mode === 'exam') { e.preventDefault(); e.returnValue = ''; }
});

/* để kiểm thử tự động */
window.__lms = { parseExam: parseExam, buildAttempt: buildAttempt, scoreAttempt: scoreAttempt,
                 state: state, render: render, server: server };

/* Dò xem có máy chủ không. Có thì lấy kho đề chung của lớp, không thì chạy
   hoàn toàn trong máy như khi mở thẳng file lms.html. */
async function boot() {
  render();                                   // vẽ ngay bằng dữ liệu trong máy cho đỡ chớp trắng
  try {
    const health = await apiFetch('health');
    server.on = !!health.ok;
    server.persistent = !!health.persistent;
    server.needsSetup = !!health.needsSetup;
  } catch (e) {
    server.on = false;
  }
  if (!server.on) { render(); return; }

  /* Máy chủ mới dựng, chưa ai đặt mật khẩu -> hiện màn thiết lập trước tiên */
  if (server.needsSetup) { render(); return; }

  /* Đang là giáo viên nhưng token không còn giá trị (đổi mật khẩu, xoá dữ liệu
     trình duyệt...) -> bắt đăng nhập lại ngay, đừng để bấm Lưu mới báo lỗi. */
  if (state.user && state.user.role === 'teacher') {
    try {
      await apiFetch('results');
    } catch (err) {
      if (err.status === 401) {
        server.token = ''; save(K_TOKEN, '');
        localStorage.removeItem(K_USER);
        state.user = null;
      }
    }
  }

  await syncExams();
  render();
}

boot();
})();
