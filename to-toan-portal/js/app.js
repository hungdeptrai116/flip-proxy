/*
 * app.js — khởi động: trạng thái, bộ định tuyến (hash), vẽ giao diện, ủy quyền sự kiện.
 *
 * Định tuyến bằng hash (#/...) để chạy được trên mọi hosting tĩnh (Vercel, GitHub Pages)
 * mà không cần cấu hình rewrite.
 */
(function () {
  'use strict';
  const TT = window.TT;

  // Đã đổi địa chỉ website: người vào địa chỉ cũ (legacyHosts) tự được chuyển sang siteUrl, giữ nguyên "#/..." đang xem.
  (function () {
    const c = window.SITE_CONFIG || {};
    const base = TT.safeUrl(c.siteUrl);
    if (!base || !Array.isArray(c.legacyHosts) || c.legacyHosts.indexOf(location.hostname) === -1) return;
    location.replace(base.replace(/\/+$/, '') + location.pathname + location.search + location.hash);
  })();

  const Store = TT.Store;
  const V = TT.views;

  /* ----------------------------- Trạng thái ----------------------------- */
  const state = {
    settings: TT.mergeSettings({}),
    posts: [],
    user: null,
    errors: [],
    loaded: { posts: false, settings: false, auth: false },
    route: { name: 'home' },
    shown: false          // true khi trang THẬT (không phải màn hình "Đang tải") đã được vẽ
  };

  TT.app = {
    get settings() { return state.settings; },
    get user() { return state.user; },
    get route() { return state.route; },
    get isAdmin() { return !!state.user && (!Store.adminEmail || state.user.email === Store.adminEmail); },
    all() { return state.posts; },
    visible() { return state.posts.filter((p) => !p.hidden); },
    render() { renderView(); }
  };

  const $ = (id) => document.getElementById(id);
  const isReady = () => state.loaded.posts && state.loaded.settings && state.loaded.auth;
  // Trang CÔNG KHAI hiện ngay khi đã có cài đặt, hoặc sau ~0,7 giây dù chưa có (dùng cài đặt mặc định — đã chứa đủ thông tin tuyển sinh thật).
  // Không bắt khách chờ Firebase (tải SDK + đăng nhập ẩn + Firestore) mới thấy chữ và số điện thoại.
  // Trang cần danh sách bài (bài viết, chuyên mục, tìm kiếm) vẫn đợi bài về, nếu không sẽ báo "không tìm thấy" oan; trang quản trị đợi đủ (cả đăng nhập).
  let grace = false;
  const needsPosts = (r) => r.name === 'post' || r.name === 'group' || r.name === 'search';
  function canShow(r) {
    if (/^admin/.test(r.name)) return isReady();
    if (needsPosts(r)) return state.loaded.posts && (state.loaded.settings || grace);
    return state.loaded.settings || grace || isReady();
  }

  /* ----------------------------- Định tuyến ----------------------------- */
  const dec = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };

  function parseRoute() {
    const segs = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(dec);
    const a = segs[0], b = segs[1], c = segs[2];
    if (!a) return { name: 'home' };
    switch (a) {
      case 'hoc-nghe': return { name: 'recruit' };
      case 'gioi-thieu': return { name: 'about' };
      case 'lien-he': return { name: 'contact' };
      case 'muc': return b ? { name: 'group', key: b } : { name: 'home' };
      case 'bai-viet': return b ? { name: 'post', id: b } : { name: 'home' };
      case 'tim-kiem': return { name: 'search', q: b || '' };
      case 'admin':
        if (b === 'bai-moi') return { name: 'admin-new' };
        if (b === 'sua' && c) return { name: 'admin-edit', id: c };
        if (b === 'cai-dat') return { name: 'admin-settings' };
        return { name: 'admin' };
      default: return { name: 'notfound' };
    }
  }
  const isAdminRoute = (r) => /^admin/.test(r.name);

  /* ----------------------------- Vẽ giao diện ----------------------------- */
  function renderChrome() {
    const s = state.settings;
    const r = state.route;
    $('demo-banner').innerHTML = V.chrome.demoBanner().s;
    $('topbar').innerHTML = V.chrome.topbar(s).s;
    $('header').innerHTML = V.chrome.navbar(s, r).s;
    $('footer').innerHTML = V.chrome.footer(s).s;
    $('floating').innerHTML = isAdminRoute(r) ? '' : V.chrome.floating(s).s;
    renderTicker();
    if (TT.motion) TT.motion.syncToggle();
  }

  // Dải "Mới nhất": chỉ dựng lại khi danh sách bài đổi (để hiệu ứng chạy không bị khởi động lại mỗi lần chuyển trang)
  let tickerSig = null;
  function renderTicker() {
    const box = $('ticker');
    if (!box) return;
    box.hidden = isAdminRoute(state.route);
    const list = TT.app.visible().sort(V.parts.byDate).slice(0, 6);
    const sig = list.map((p) => p.id + '|' + p.title).join('\n');
    if (sig === tickerSig) return;
    tickerSig = sig;
    box.innerHTML = V.chrome.ticker(list).s;
    if (TT.motion) TT.motion.setupTicker();
  }

  function currentView() {
    const r = state.route;
    if (!canShow(r)) return V.loading();
    if (isAdminRoute(r)) return TT.admin.view(r);
    switch (r.name) {
      case 'home': return V.home();
      case 'recruit': return V.recruit();
      case 'about': return V.about();
      case 'contact': return V.contact();
      case 'group': return V.group(r.key);
      case 'post': return V.post(r.id);
      case 'search': return V.search(r.q);
      default: return V.notFound();
    }
  }

  // true khi lần vẽ sắp tới là do CHUYỂN TRANG (cần hiệu ứng vào trang)
  let animateNext = false;

  function renderView() {
    const main = $('view');
    let v;
    try {
      const wasShown = state.shown;
      v = currentView();
      state.shown = canShow(state.route);
      // Hiệu ứng chỉ chạy khi chuyển trang hoặc lần đầu hiện trang thật; cập nhật dữ liệu realtime thì KHÔNG nháy lại.
      const animate = animateNext || (!wasShown && state.shown);
      animateNext = false;
      // Câu lỗi kỹ thuật chỉ dành cho quản trị viên; khách không cần (và không hiểu) chúng
      const errs = (isAdminRoute(state.route) || state.user) ? state.errors : [];
      main.innerHTML = V.chrome.errorBanner(errs).s + v.body.s;
      main.classList.toggle('no-anim', !animate);
      document.title = v.title || 'Tổ GDTX';
      if (v.mount) v.mount(main);
      // Hiệu ứng hỏng thì chỉ tắt hiệu ứng — KHÔNG được làm mất nội dung trang
      if (animate && TT.motion) {
        try { TT.motion.afterRender(main, true); }
        catch (me) { console.error(me); TT.motion.disable(); }
      }
    } catch (e) {
      console.error(e);
      main.innerHTML = '<div class="container-x py-16 text-center"><p class="text-lg font-bold text-red-700">Đã xảy ra lỗi khi hiển thị trang.</p>' +
        '<p class="mt-2 text-slate-600">Hãy tải lại trang. Nếu vẫn lỗi, mở Console (F12) để xem chi tiết.</p></div>';
    }
  }

  let pending = null;
  // Chưa khởi động xong: dữ liệu (Demo) đến đồng bộ lúc đăng ký → KHÔNG vẽ thừa, vì onRoute() ở cuối sẽ vẽ lần đầu.
  // (Vẽ thừa ngay sau đó sẽ thay hết nội dung và xóa mất hiệu ứng vào trang.)
  let booted = false;
  // Gom nhiều cập nhật liền nhau thành 1 lần vẽ. force=true: vẽ cả view tĩnh (trang soạn bài).
  function schedule(force) {
    if (!booted) return;
    if (pending) { pending.force = pending.force || !!force; return; }
    pending = { force: !!force };
    requestAnimationFrame(() => {
      const f = pending.force;
      pending = null;
      const r = state.route;
      // Trang soạn bài / cài đặt / đăng nhập đang hiển thị → không vẽ lại khi dữ liệu đổi (tránh mất chữ đang gõ).
      // Chỉ áp dụng khi trang thật đã vẽ: nếu còn đang "Đang tải" thì PHẢI vẽ, nếu không sẽ kẹt mãi ở màn hình tải.
      if (!f && state.shown && isAdminRoute(r) && TT.admin.isStatic(r)) return;
      renderView();
    });
  }

  function onRoute() {
    state.route = parseRoute();
    animateNext = true;
    renderChrome();
    renderView();
    // Lên đầu trang NGAY (không cuộn mượt), nếu không mỗi lần chuyển trang sẽ thấy trang lướt qua
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const main = $('view');
    if (main) main.focus({ preventScroll: true });
    if (TT.motion) TT.motion.routeStart();
  }

  /* ----------------------------- Dữ liệu ----------------------------- */
  Store.onSettings((s) => {
    state.settings = s;
    state.loaded.settings = true;
    renderChrome();
    schedule(false);
  });
  // Menu/chân trang phụ thuộc việc chuyên mục nào đã có bài → chỉ vẽ lại khung khi "chữ ký" đó đổi
  let navSig = null;
  function navSignature() {
    const cats = {};
    state.posts.forEach((p) => { if (!p.hidden) cats[p.category] = 1; });
    return Object.keys(cats).sort().join(',');
  }
  Store.onPosts((list) => {
    state.posts = list;
    state.loaded.posts = true;
    const sig = navSignature();
    if (sig !== navSig) { navSig = sig; renderChrome(); }
    renderTicker();
    schedule(false);
  });
  Store.onAuth((u) => {
    state.user = u;
    state.loaded.auth = true;
    if (u && Store.adminEmail && u.email !== Store.adminEmail) {
      TT.toast('Tài khoản này không phải quản trị viên của website.', 'error');
      Store.signOut();
      return;
    }
    renderChrome();
    schedule(true);
  });
  Store.onError((msg) => {
    if (state.errors.indexOf(msg) === -1) state.errors.push(msg);
    schedule(true);
  });

  // Chỉ vẽ lại khi trang CHƯA hiện (đang "Đang tải"). Nếu trang đã hiện mà vẽ ép thêm lần nữa, ô đang gõ (đăng nhập, soạn bài) sẽ bị xóa trắng.
  setTimeout(() => { grace = true; if (!state.shown) schedule(true); }, 700);

  // Quá 15 giây vẫn chưa nhận đủ dữ liệu (mất mạng, sai firebaseConfig…) → hiện lỗi + cho xem trang với dữ liệu rỗng
  setTimeout(() => {
    if (isReady()) return;
    const msg = 'Chưa nhận được dữ liệu từ máy chủ sau 15 giây. Kiểm tra kết nối mạng và firebaseConfig trong config.js.';
    if (state.errors.indexOf(msg) === -1) state.errors.push(msg);
    state.loaded.posts = state.loaded.settings = state.loaded.auth = true;
    renderChrome();
    schedule(true);
  }, 15000);

  /* ----------------------------- Sự kiện (ủy quyền) ----------------------------- */
  TT.actions = TT.actions || {};
  TT.forms = TT.forms || {};
  TT.inputs = TT.inputs || {};

  TT.actions['toggle-menu'] = (el) => {
    const menu = $('mobile-menu');
    if (!menu) return;
    const open = menu.classList.toggle('is-open');
    el.setAttribute('aria-expanded', String(open));
  };
  TT.actions['clear-errors'] = () => { state.errors = []; renderView(); };
  TT.actions['skip-main'] = () => { const m = $('view'); if (m) m.focus(); };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = TT.actions[el.dataset.action];
    if (fn) fn(el, e);
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    if (form.dataset.form === 'search') {
      const q = form.elements.q.value.trim();
      if (q) location.hash = '#/tim-kiem/' + encodeURIComponent(q);
      return;
    }
    const fn = TT.forms[form.dataset.form];
    if (fn) fn(form, e);
  });

  // input: mọi ô nhập, kể cả select/checkbox. change: chỉ ô chọn file.
  document.addEventListener('input', (e) => {
    const el = e.target.closest ? e.target.closest('[data-input]') : null;
    if (!el || el.type === 'file') return;
    const fn = TT.inputs[el.dataset.input];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest ? e.target.closest('[data-input]') : null;
    if (!el || el.type !== 'file') return;
    const fn = TT.inputs[el.dataset.input];
    if (fn) fn(el, e);
  });

  // Ảnh lỗi → thay bằng ảnh mặc định của chuyên mục (một lần)
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.dataset.fallback && !t.dataset.fbDone) {
      t.dataset.fbDone = '1';
      t.src = t.dataset.fallback;
    }
  }, true);

  window.addEventListener('hashchange', onRoute);

  /* ----------------------------- Khởi động ----------------------------- */
  if (TT.motion) TT.motion.init();
  onRoute();
  booted = true;
})();
