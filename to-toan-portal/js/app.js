/*
 * app.js — khởi động: trạng thái, bộ định tuyến (hash), vẽ giao diện, ủy quyền sự kiện.
 *
 * Định tuyến bằng hash (#/...) để chạy được trên mọi hosting tĩnh (Vercel, GitHub Pages)
 * mà không cần cấu hình rewrite.
 */
(function () {
  'use strict';
  const TT = window.TT;
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

  /* ----------------------------- Định tuyến ----------------------------- */
  const dec = (s) => { try { return decodeURIComponent(s); } catch (e) { return s; } };

  function parseRoute() {
    const segs = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(dec);
    const a = segs[0], b = segs[1], c = segs[2];
    if (!a) return { name: 'home' };
    switch (a) {
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
  }

  function currentView() {
    const r = state.route;
    if (!isReady()) return V.loading();
    if (isAdminRoute(r)) return TT.admin.view(r);
    switch (r.name) {
      case 'home': return V.home();
      case 'about': return V.about();
      case 'contact': return V.contact();
      case 'group': return V.group(r.key);
      case 'post': return V.post(r.id);
      case 'search': return V.search(r.q);
      default: return V.notFound();
    }
  }

  function renderView() {
    const main = $('view');
    let v;
    try {
      v = currentView();
      state.shown = isReady();
      main.innerHTML = V.chrome.errorBanner(state.errors).s + v.body.s;
      document.title = v.title || 'Tổ Toán';
      if (v.mount) v.mount(main);
    } catch (e) {
      console.error(e);
      main.innerHTML = '<div class="container-x py-16 text-center"><p class="text-lg font-bold text-red-700">Đã xảy ra lỗi khi hiển thị trang.</p>' +
        '<p class="mt-2 text-slate-600">Hãy tải lại trang. Nếu vẫn lỗi, mở Console (F12) để xem chi tiết.</p></div>';
    }
  }

  let pending = null;
  // Gom nhiều cập nhật liền nhau thành 1 lần vẽ. force=true: vẽ cả view tĩnh (trang soạn bài).
  function schedule(force) {
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
    const menu = $('mobile-menu');
    renderChrome();
    renderView();
    if (menu) menu.classList.add('hidden');
    window.scrollTo(0, 0);
    const main = $('view');
    if (main) main.focus({ preventScroll: true });
  }

  /* ----------------------------- Dữ liệu ----------------------------- */
  Store.onSettings((s) => {
    state.settings = s;
    state.loaded.settings = true;
    renderChrome();
    schedule(false);
  });
  Store.onPosts((list) => {
    state.posts = list;
    state.loaded.posts = true;
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
    const open = menu.classList.toggle('hidden') === false;
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
  onRoute();
})();
