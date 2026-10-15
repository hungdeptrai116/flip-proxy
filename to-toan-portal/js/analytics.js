/*
 * analytics.js — bộ đếm lượt truy cập ẩn danh (GoatCounter): KHÔNG cookie, KHÔNG thu thông tin cá nhân.
 *
 * Chỉ chạy khi có "Mã GoatCounter" hợp lệ (Quản trị → Cài đặt, hoặc `goatcounter` trong config.js).
 * Chưa có mã = KHÔNG tải script nào, KHÔNG gửi gì ra ngoài.
 *
 * Đếm:
 *   1. Lượt xem từng trang. Site dùng "#/..." nên script gốc của GoatCounter không thấy đổi trang → ta gọi count() tay mỗi lần.
 *   2. Lượt bấm Gọi (tel:), Zalo, Chỉ đường (Google Maps), Mở tài liệu (Drive/PDF) — gần nhất với "ứng viên thật".
 *   3. Kênh dẫn vào: GoatCounter đọc sẵn ?ref=… (và utm_source, src, source) trên địa chỉ. Ví dụ …/?ref=zalo-nhom-1
 * Không đếm: trang quản trị, người đang đăng nhập quản trị, trình duyệt bật Do Not Track / Global Privacy Control.
 *
 * Căn cứ kỹ thuật (đọc từ mã nguồn GoatCounter): count.js nhận {path, title, referrer, event, no_session}, luôn gửi kèm
 * location.search để máy chủ lấy ref/utm_*; sự kiện (event:true) KHÔNG đọc ref từ địa chỉ nên ta gắn kênh vào `referrer` của sự kiện.
 * Mã site: 2–50 ký tự a–z 0–9 và '-', không bắt đầu bằng '-'.
 */
(function () {
  'use strict';
  const TT = window.TT;

  const SCRIPT_SRC = 'https://gc.zgo.at/count.js';
  const endpoint = (code) => 'https://' + code + '.goatcounter.com/count';
  const MAX_QUEUE = 30;
  const SRC_KEY = 'totoan.src';
  const SRC_PARAMS = ['ref', 'utm_source', 'src', 'source'];
  const STRIP_PARAMS = SRC_PARAMS.concat(['utm_medium', 'utm_campaign', 'campaign']);

  let state = 'idle';     // idle (chưa biết có mã không) | loading | ready | off
  let queue = [];         // việc đếm chờ script tải xong
  let lastPath = null;    // trang vừa đếm — tránh đếm lại khi giao diện vẽ lại
  let sent = 0;           // số lượt xem đã gửi; chỉ lượt ĐẦU mang theo nguồn (ref) của địa chỉ
  let source = '';        // thẻ kênh (VD "zalo-nhom-1"), dùng gắn vào sự kiện bấm

  /* ----------------------------- Tiện ích ----------------------------- */
  const safe = (fn) => { try { return fn(); } catch (e) { return undefined; } };

  function readSource() {
    let v = '';
    safe(() => {
      const q = new URLSearchParams(location.search);
      for (let i = 0; i < SRC_PARAMS.length && !v; i++) v = (q.get(SRC_PARAMS[i]) || '').trim();
    });
    if (v) {
      v = TT.channelSlug(v);
      if (v) safe(() => sessionStorage.setItem(SRC_KEY, v));
      return v;
    }
    return safe(() => sessionStorage.getItem(SRC_KEY)) || '';
  }

  function optedOut() {
    return !!safe(() => {
      const n = navigator;
      return n.doNotTrack === '1' || n.doNotTrack === 'yes' || window.doNotTrack === '1' || n.msDoNotTrack === '1' || n.globalPrivacyControl === true;
    });
  }

  // Chỉ đếm khách: không đếm trang quản trị, không đếm chính quản trị viên đang đăng nhập
  function countable() {
    const a = TT.app;
    return !!a && !a.isAdmin && !/^admin/.test(a.route.name);
  }

  // Đường dẫn "ảo" cho từng trang (không chứa nội dung tìm kiếm của khách)
  function pathOf(r) {
    switch (r.name) {
      case 'home': return '/';
      case 'recruit': return '/hoc-nghe';
      case 'about': return '/gioi-thieu';
      case 'contact': return '/lien-he';
      case 'group': return '/muc/' + r.key;
      case 'post': return '/bai-viet/' + r.id;
      case 'search': return '/tim-kiem';
      default: return '/khong-tim-thay';
    }
  }

  // Xóa ?ref=… khỏi thanh địa chỉ SAU khi lượt xem đầu đã gửi: các lượt chuyển trang sau trong cùng lần vào không bị gán lại kênh,
  // và link khách sao chép từ thanh địa chỉ không mang thẻ kênh cũ.
  function stripSource() {
    safe(() => {
      const u = new URL(location.href);
      let changed = false;
      STRIP_PARAMS.forEach((k) => { if (u.searchParams.has(k)) { u.searchParams.delete(k); changed = true; } });
      if (changed) history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    });
  }

  /* ----------------------------- Gửi ----------------------------- */
  function send(job) {
    const gc = window.goatcounter;
    if (!gc || typeof gc.count !== 'function') return false;
    if (job.event) {
      gc.count({ event: true, path: job.name, title: job.title, referrer: source });
    } else {
      const vars = { path: job.path, title: job.title };
      if (sent > 0) vars.referrer = '';   // chuyển trang nội bộ: không gán lại nguồn ngoài
      gc.count(vars);
      if (sent === 0) stripSource();
      sent++;
    }
    return true;
  }

  function flush() {
    if (state !== 'ready') return;
    const jobs = queue;
    queue = [];
    jobs.forEach((j) => safe(() => send(j)));
  }

  function enqueue(job) {
    if (state === 'off') return;
    queue.push(job);
    if (queue.length > MAX_QUEUE) queue.shift();
    flush();
  }

  /* ----------------------------- API ----------------------------- */
  // Gọi khi đã biết cài đặt. Chỉ quyết định MỘT lần mỗi lần tải trang (đổi mã → tải lại trang).
  function configure(raw) {
    if (state !== 'idle') return;
    const code = TT.cleanAnalyticsCode(raw);
    if (!code || optedOut()) { state = 'off'; queue = []; return; }
    source = readSource();
    state = 'loading';
    const s = document.createElement('script');
    s.async = true;
    s.dataset.goatcounter = endpoint(code);
    s.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });   // ta tự đếm từng trang và từng lượt bấm
    s.src = SCRIPT_SRC;
    s.onload = () => { state = 'ready'; flush(); };
    s.onerror = () => { state = 'off'; queue = []; };   // bị chặn (trình chặn quảng cáo, mạng chặn): bỏ qua êm, trang vẫn chạy
    document.head.appendChild(s);
  }

  // Gọi sau mỗi lần vẽ trang thật (đã biết ai đăng nhập). Tự bỏ qua trang quản trị và quản trị viên.
  function pageview() {
    if (state === 'off') return;
    if (!countable()) { lastPath = null; return; }
    const r = TT.app.route;
    const p = pathOf(r);
    if (p === lastPath) return;
    lastPath = p;
    // Tiêu đề trang tìm kiếm chứa từ khóa của khách (có thể là số điện thoại) → KHÔNG gửi đi
    enqueue({ path: p, title: r.name === 'search' ? 'Tìm kiếm — Tổ GDTX' : (document.title || 'Tổ GDTX') });
  }

  const EVENTS = {
    'goi-dien': 'Bấm Gọi',
    'zalo': 'Bấm Zalo',
    'chi-duong': 'Bấm Chỉ đường',
    'mo-tai-lieu': 'Mở tài liệu'
  };

  function classify(a) {
    const custom = a.getAttribute('data-track');
    if (custom && EVENTS[custom]) return custom;
    const h = a.getAttribute('href') || '';
    if (/^tel:/i.test(h)) return 'goi-dien';
    if (/^https?:\/\/(?:[a-z0-9-]+\.)*zalo\.me\//i.test(h)) return 'zalo';
    if (/^https?:\/\/(?:(?:www|maps)\.google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(h)) return 'chi-duong';
    if (/^https?:\/\/(?:drive|docs)\.google\.com\//i.test(h) || /\.pdf(?:$|[?#])/i.test(h)) return 'mo-tai-lieu';
    return '';
  }

  function onClick(e) {
    if (state === 'off' || !countable()) return;
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const name = classify(a);
    if (!name) return;
    enqueue({ event: true, name: name, title: EVENTS[name] + ' — ' + pathOf(TT.app.route) });
  }
  document.addEventListener('click', (e) => safe(() => onClick(e)), true);
  document.addEventListener('auxclick', (e) => safe(() => onClick(e)), true);   // bấm chuột giữa

  TT.analytics = {
    configure: (code) => safe(() => configure(code)),
    pageview: () => safe(() => pageview()),
    // Có đang đếm không (để chân trang nói rõ cho khách)
    enabled: () => state === 'loading' || state === 'ready',
    source: () => source,
    _state: () => state
  };
})();
