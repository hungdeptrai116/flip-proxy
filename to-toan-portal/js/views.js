/*
 * views.js — giao diện công khai (trang chủ, chuyên mục, bài viết, tìm kiếm, giới thiệu, liên hệ)
 *
 * Mỗi view trả về { title, body } với body là kết quả của html`...` (đã escape an toàn).
 * Sự kiện dùng ủy quyền (data-action) → đăng ký vào TT.actions, không có onclick nội tuyến.
 */
(function () {
  'use strict';
  const TT = window.TT;
  const { html, raw, esc, icon, fmtDate, CATS } = TT;
  const app = () => TT.app;

  TT.actions = TT.actions || {};

  /* =====================================================================
   * Tiện ích hiển thị
   * =================================================================== */
  const catOf = (id) => CATS[id] || CATS['tin-tuc'];
  const coverOf = (p) => TT.safeUrl(p.cover) || catOf(p.category).cover;
  const postHref = (p) => '#/bai-viet/' + encodeURIComponent(p.id);
  const summaryOf = (p) => p.summary || TT.md.excerpt(p.content, 170);
  const byDate = (a, b) => b.createdAt - a.createdAt;
  const byPinnedDate = (a, b) => (Number(b.pinned) - Number(a.pinned)) || byDate(a, b);
  const telHref = (s) => 'tel:' + String(s).replace(/[^\d+]/g, '');
  const proseHtml = (md) => raw(TT.md.render(md));

  function searchPosts(posts, q) {
    const tokens = TT.fold(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return posts.filter((p) => {
      const hay = TT.fold([p.title, p.summary, p.content, p.author, catOf(p.category).name,
        p.attachments.map((a) => a.title).join(' ')].join(' '));
      return tokens.every((t) => hay.indexOf(t) !== -1);
    }).sort(byDate);
  }
  TT.searchPosts = searchPosts;

  function statValue(stat) {
    if (stat.auto) {
      return String(app().visible().reduce((n, p) => n + p.attachments.length, 0));
    }
    return stat.value || '—';
  }

  /* =====================================================================
   * Thành phần nhỏ
   * =================================================================== */
  function badge(catId) {
    const c = catOf(catId);
    return html`<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.badge}">${c.name}</span>`;
  }

  function pdfFlag(p) {
    const n = p.attachments.length;
    if (!n) return '';
    return html`<span class="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200" title="Có đính kèm file Đề cương PDF">
      ${icon('file', 'h-3.5 w-3.5')} Có đính kèm Đề cương PDF${n > 1 ? ' (' + n + ')' : ''}</span>`;
  }

  function pinFlag(p) {
    if (!p.pinned) return '';
    return html`<span class="inline-flex items-center gap-1 rounded-full bg-accent-light px-2 py-0.5 text-xs font-bold text-accent-dark ring-1 ring-accent/40">${icon('star', 'h-3 w-3')} Tiêu điểm</span>`;
  }

  function metaLine(p) {
    return html`<span class="inline-flex items-center gap-1">${icon('calendar', 'h-3.5 w-3.5')}<time>${fmtDate(p.createdAt)}</time></span>
      ${p.author ? html`<span class="inline-flex items-center gap-1">${icon('user', 'h-3.5 w-3.5')}${p.author}</span>` : ''}`;
  }

  function coverImg(p, cls) {
    return html`<img src="${coverOf(p)}" data-fallback="${catOf(p.category).cover}" alt="" loading="lazy" class="${cls}">`;
  }

  function postCard(p) {
    return html`<article data-reveal class="group flex flex-col overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lift">
      <a href="${postHref(p)}" class="relative block aspect-video overflow-hidden bg-slate-100" tabindex="-1" aria-hidden="true">
        ${coverImg(p, 'h-full w-full object-cover transition duration-300 group-hover:scale-105')}
        <span class="absolute left-3 top-3">${badge(p.category)}</span>
        ${p.hidden ? html`<span class="absolute right-3 top-3 rounded bg-slate-900/80 px-2 py-0.5 text-xs font-semibold text-white">Đang ẩn</span>` : ''}
      </a>
      <div class="flex flex-1 flex-col p-4">
        <div class="mb-1 flex flex-wrap gap-1.5">${pinFlag(p)}</div>
        <h3 class="text-base font-bold leading-snug text-navy-dark group-hover:text-brand">
          <a href="${postHref(p)}" class="line-clamp-2 focus:outline-none focus-visible:underline">${p.title}</a>
        </h3>
        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">${metaLine(p)}</div>
        <p class="mt-2 line-clamp-3 text-sm text-slate-600">${summaryOf(p)}</p>
        <div class="mt-auto pt-3">${pdfFlag(p)}</div>
      </div>
    </article>`;
  }

  function postRow(p) {
    return html`<article data-reveal class="group flex overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-slate-200/70 transition hover:shadow-lift">
      <a href="${postHref(p)}" class="relative block w-32 shrink-0 bg-slate-100 sm:w-72" tabindex="-1" aria-hidden="true">
        ${coverImg(p, 'absolute inset-0 h-full w-full object-cover')}
      </a>
      <div class="flex min-w-0 flex-1 flex-col p-4">
        <div class="mb-1 flex flex-wrap items-center gap-1.5">${badge(p.category)} ${pinFlag(p)}
          ${p.hidden ? html`<span class="rounded bg-slate-900/80 px-2 py-0.5 text-xs font-semibold text-white">Đang ẩn</span>` : ''}</div>
        <h3 class="text-base font-bold leading-snug text-navy-dark group-hover:text-brand sm:text-lg">
          <a href="${postHref(p)}" class="line-clamp-2 focus:outline-none focus-visible:underline">${p.title}</a>
        </h3>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">${metaLine(p)}</div>
        <div class="hidden sm:block"><p class="mt-2 line-clamp-2 text-sm text-slate-600">${summaryOf(p)}</p></div>
        <div class="mt-auto pt-2">${pdfFlag(p)}</div>
      </div>
    </article>`;
  }

  function miniPost(p) {
    return html`<li>
      <a href="${postHref(p)}" class="group flex gap-3 rounded-lg p-1.5 hover:bg-slate-50">
        ${coverImg(p, 'h-14 w-20 shrink-0 rounded-md object-cover')}
        <span class="min-w-0">
          <span class="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 group-hover:text-brand">${p.title}</span>
          <span class="mt-0.5 flex items-center gap-2 text-xs text-slate-500">${fmtDate(p.createdAt)}
            ${p.attachments.length ? html`<span class="inline-flex items-center gap-0.5 font-semibold text-red-700">${icon('file', 'h-3 w-3')}PDF</span>` : ''}</span>
        </span>
      </a>
    </li>`;
  }

  function emptyState(msg) {
    return html`<div class="rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500">
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">${icon('book', 'h-6 w-6')}</div>
      <p class="font-semibold text-slate-700">${msg}</p></div>`;
  }

  function breadcrumb(items) {
    return html`<nav aria-label="Đường dẫn" class="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500">
      ${items.map((it, i) => html`${i ? icon('chevronRight', 'h-3.5 w-3.5 text-slate-400') : ''}
        ${it.href ? html`<a href="${it.href}" class="hover:text-brand hover:underline">${it.label}</a>`
          : html`<span class="line-clamp-1 font-semibold text-slate-700" aria-current="page">${it.label}</span>`}`)}
    </nav>`;
  }

  function pageHead(title, desc) {
    return html`<section class="hero-bg text-white">
      <div class="container-x py-10 md:py-12">
        <h1 class="hero-in text-2xl font-extrabold tracking-tight md:text-4xl">${title}</h1>
        ${desc ? html`<p class="hero-in mt-2 max-w-3xl text-blue-100" style="--d:90ms">${desc}</p>` : ''}
      </div></section>`;
  }

  /* =====================================================================
   * Bộ duyệt bài viết (tab lọc + lưới/danh sách + xem thêm)
   * =================================================================== */
  const PAGE_SIZE = 9;
  const BROWSERS = {};          // key → { tabs, base(), excludePinnedOnAll }
  const browserState = {};      // key → { tab, shown }
  let viewMode = TT.lsGet('totoan.viewmode', 'grid') === 'list' ? 'list' : 'grid';

  function registerBrowser(key, cfg) {
    BROWSERS[key] = cfg;
    if (!browserState[key]) browserState[key] = { tab: cfg.tabs[0].id, shown: PAGE_SIZE };
    if (!cfg.tabs.some((t) => t.id === browserState[key].tab)) browserState[key] = { tab: cfg.tabs[0].id, shown: PAGE_SIZE };
  }

  function browserList(key, tab) {
    const cfg = BROWSERS[key];
    let list = cfg.base();
    if (tab.cats) list = list.filter((p) => tab.cats.indexOf(p.category) !== -1);
    if (cfg.excludePinnedOnAll && tab.id === 'all') list = list.filter((p) => !p.pinned);
    return list.slice().sort(byPinnedDate);
  }

  function browserInner(key) {
    const cfg = BROWSERS[key];
    const st = browserState[key];
    const tab = cfg.tabs.find((t) => t.id === st.tab) || cfg.tabs[0];
    const list = browserList(key, tab);
    const shown = list.slice(0, st.shown);

    return html`
      ${cfg.tabs.length > 1 ? html`<div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Lọc theo chuyên mục">
        ${cfg.tabs.map((t) => {
          const active = t.id === tab.id;
          const n = browserList(key, t).length;
          return html`<button type="button" data-action="tab" data-browser="${key}" data-tab="${t.id}" aria-pressed="${String(active)}"
            class="${active ? 'bg-navy text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'} inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            ${t.label}<span class="${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'} rounded-full px-2 text-xs">${n}</span></button>`;
        })}</div>` : ''}
      <div class="mt-4 flex items-center justify-between gap-3">
        <p class="text-sm text-slate-500">${list.length} bài viết</p>
        <div class="inline-flex overflow-hidden rounded-lg ring-1 ring-slate-300" role="group" aria-label="Kiểu hiển thị">
          <button type="button" data-action="view-mode" data-mode="grid" aria-pressed="${String(viewMode === 'grid')}" title="Dạng lưới"
            class="${viewMode === 'grid' ? 'bg-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} px-3 py-1.5">${icon('grid', 'h-4 w-4')}<span class="sr-only">Dạng lưới</span></button>
          <button type="button" data-action="view-mode" data-mode="list" aria-pressed="${String(viewMode === 'list')}" title="Dạng danh sách"
            class="${viewMode === 'list' ? 'bg-navy text-white' : 'bg-white text-slate-600 hover:bg-slate-50'} px-3 py-1.5">${icon('rows', 'h-4 w-4')}<span class="sr-only">Dạng danh sách</span></button>
        </div>
      </div>
      <div class="mt-4">
        ${shown.length
          ? (viewMode === 'list'
            ? html`<div class="space-y-4">${shown.map(postRow)}</div>`
            : html`<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">${shown.map(postCard)}</div>`)
          : emptyState('Chưa có bài viết trong mục này.')}
      </div>
      ${list.length > shown.length ? html`<div class="mt-6 text-center">
        <button type="button" data-action="more" data-browser="${key}" class="btn btn-outline-navy btn-lg">Xem thêm bài viết (${shown.length}/${list.length})</button></div>` : ''}`;
  }

  function browserShell(key) {
    return html`<div data-browser-root="${key}">${browserInner(key)}</div>`;
  }

  // keep: số thẻ ĐẦU TIÊN đã hiển thị từ trước (bấm "Xem thêm") → không cho mờ đi rồi hiện lại, chỉ thẻ mới mới có hiệu ứng
  function rerenderBrowser(key, focusSelector, keep) {
    const el = document.querySelector('[data-browser-root="' + key + '"]');
    if (!el) return;
    el.innerHTML = browserInner(key).s;
    if (keep) Array.prototype.slice.call(el.querySelectorAll('article[data-reveal]'), 0, keep).forEach((a) => a.removeAttribute('data-reveal'));
    if (TT.motion) TT.motion.afterRender(el, false);
    if (focusSelector) {
      const f = el.querySelector(focusSelector);
      if (f) f.focus({ preventScroll: true });
    }
  }

  TT.actions.tab = (el) => {
    const key = el.dataset.browser;
    if (!browserState[key]) return;
    browserState[key] = { tab: el.dataset.tab, shown: PAGE_SIZE };
    rerenderBrowser(key, '[data-tab="' + el.dataset.tab + '"]');
  };
  TT.actions.more = (el) => {
    const key = el.dataset.browser;
    if (!browserState[key]) return;
    const before = browserState[key].shown;
    browserState[key].shown += PAGE_SIZE;
    rerenderBrowser(key, null, before);
  };
  TT.actions['view-mode'] = (el) => {
    viewMode = el.dataset.mode === 'list' ? 'list' : 'grid';
    TT.lsSet('totoan.viewmode', viewMode);
    Object.keys(BROWSERS).forEach((k) => rerenderBrowser(k, '[data-mode="' + viewMode + '"]'));
  };

  /* =====================================================================
   * Khung bao quanh (chrome): banner demo, thanh trên, menu, chân trang, nút nổi
   * =================================================================== */
  function demoBanner() {
    if (TT.Store.mode !== 'demo') return html``;
    return html`<div class="border-b border-amber-300 bg-amber-100 text-amber-900">
      <div class="container-x flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-xs sm:text-sm">
        <p><strong>CHẾ ĐỘ DEMO</strong> — bài viết, số liệu và liên hệ là <strong>dữ liệu mẫu</strong>, lưu ngay trong trình duyệt này. Điền <code class="rounded bg-amber-200 px-1">firebaseConfig</code> trong <code class="rounded bg-amber-200 px-1">config.js</code> để chạy thật.</p>
        <a href="#/admin" class="font-bold underline hover:no-underline">Thử trang Quản trị →</a>
      </div></div>`;
  }

  function topbar(s) {
    const items = [
      s.hotline && html`<a href="${telHref(s.hotline)}" class="inline-flex items-center gap-1.5 hover:text-white">${icon('phone', 'h-3.5 w-3.5')}${s.hotline}</a>`,
      s.email && html`<a href="mailto:${s.email}" class="inline-flex items-center gap-1.5 hover:text-white">${icon('mail', 'h-3.5 w-3.5')}${s.email}</a>`,
      s.address && html`<span class="hidden items-center gap-1.5 md:inline-flex">${icon('pin', 'h-3.5 w-3.5')}${s.address}</span>`
    ].filter(Boolean);
    if (!items.length) return html``;
    return html`<div class="bg-navy-dark text-xs text-blue-100">
      <div class="container-x flex flex-wrap items-center gap-x-5 gap-y-1 py-1.5">${items}</div></div>`;
  }

  const NAV = [
    { label: 'Trang chủ', href: '#/', on: (r) => r.name === 'home' },
    { label: 'Giới thiệu Tổ Toán', href: '#/gioi-thieu', on: (r) => r.name === 'about' },
    { label: 'Thông tin Tuyển sinh', href: '#/muc/tuyen-sinh', on: (r) => r.name === 'group' && r.key === 'tuyen-sinh' },
    { label: 'Đề cương Ôn tập', href: '#/muc/de-cuong', on: (r) => r.name === 'group' && /^de-cuong/.test(r.key) },
    { label: 'Tin tức & Hoạt động', href: '#/muc/tin-tuc', on: (r) => r.name === 'group' && r.key === 'tin-tuc' },
    { label: 'Liên hệ', href: '#/lien-he', on: (r) => r.name === 'contact' }
  ];

  function searchForm(q, idSuffix) {
    return html`<form data-form="search" role="search" class="relative w-full">
      <label for="q-${idSuffix}" class="sr-only">Tìm bài viết hoặc đề cương</label>
      <input id="q-${idSuffix}" type="search" name="q" value="${q}" placeholder="Tìm bài viết, đề cương…" autocomplete="off" class="field pl-9">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">${icon('search', 'h-4 w-4')}</span>
    </form>`;
  }

  function navbar(s, route) {
    const q = route.name === 'search' ? route.q : '';
    const links = (mobile) => NAV.map((it) => {
      const on = it.on(route);
      const cls = mobile
        ? (on ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10') + ' block rounded-lg px-3 py-2.5 text-sm font-semibold'
        : 'nav-link';
      return html`<li><a href="${it.href}" ${on ? raw('aria-current="page"') : ''} class="${cls}">${it.label}</a></li>`;
    });

    return html`
      <div class="border-b border-slate-200 bg-white">
        <div class="container-x flex items-center gap-4 py-2.5">
          <a href="#/" class="flex min-w-0 items-center gap-3" aria-label="Trang chủ — Tổ Toán ${s.schoolName}">
            <img src="assets/logo.svg" alt="" class="h-11 w-11 shrink-0">
            <span class="min-w-0 leading-tight">
              <span class="block text-lg font-extrabold tracking-wide text-navy">TỔ TOÁN</span>
              <span class="block truncate text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:text-xs">${s.schoolName}</span>
            </span>
          </a>
          <div class="ml-auto hidden w-72 md:block">${searchForm(q, 'd')}</div>
          <button type="button" data-action="toggle-menu" aria-expanded="false" aria-controls="mobile-menu"
            class="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy ring-1 ring-slate-300 hover:bg-slate-50 md:hidden">
            ${icon('menu', 'h-5 w-5')}<span class="sr-only">Mở menu</span></button>
        </div>
      </div>
      <nav class="hidden bg-navy md:block" aria-label="Menu chính">
        <ul class="container-x flex flex-wrap">${links(false)}</ul></nav>
      <nav id="mobile-menu" class="mm bg-navy" aria-label="Menu chính (điện thoại)">
        <div class="mm-inner"><div class="container-x space-y-3 py-3">
          ${searchForm(q, 'm')}
          <ul class="space-y-1">${links(true)}</ul></div></div></nav>`;
  }

  function footer(s) {
    const year = new Date().getFullYear();
    const motionOn = !!(TT.motion && TT.motion.isOn());
    const osReduced = !!(TT.motion && TT.motion.isOsReduced());
    return html`<div class="bg-navy-dark text-blue-100">
      <div class="container-x grid gap-8 py-10 md:grid-cols-3">
        <div>
          <div class="flex items-center gap-3"><img src="assets/logo.svg" alt="" class="h-10 w-10">
            <div class="leading-tight"><p class="font-extrabold tracking-wide text-white">TỔ TOÁN</p>
              <p class="text-xs uppercase text-blue-200">${s.schoolName}</p></div></div>
          <ul class="mt-4 space-y-2 text-sm">
            ${s.address ? html`<li class="flex gap-2">${icon('pin', 'mt-0.5 h-4 w-4 shrink-0')}<span>${s.address}</span></li>` : ''}
            ${s.hotline ? html`<li class="flex gap-2">${icon('phone', 'mt-0.5 h-4 w-4 shrink-0')}<a href="${telHref(s.hotline)}" class="hover:text-white">${s.hotline}</a></li>` : ''}
            ${s.email ? html`<li class="flex gap-2">${icon('mail', 'mt-0.5 h-4 w-4 shrink-0')}<a href="mailto:${s.email}" class="hover:text-white">${s.email}</a></li>` : ''}
          </ul>
        </div>
        <div>
          <h2 class="text-sm font-bold uppercase tracking-wider text-white">Liên kết nhanh</h2>
          <ul class="mt-3 space-y-2 text-sm">${NAV.map((it) => html`<li><a href="${it.href}" class="hover:text-white hover:underline">${it.label}</a></li>`)}</ul>
        </div>
        <div>
          <h2 class="text-sm font-bold uppercase tracking-wider text-white">Chuyên mục</h2>
          <ul class="mt-3 space-y-2 text-sm">
            <li><a href="#/muc/tuyen-sinh" class="hover:text-white hover:underline">Quy chế & Thông báo Tuyển sinh</a></li>
            <li><a href="#/muc/de-cuong-10" class="hover:text-white hover:underline">Đề cương Ôn tập vào 10</a></li>
            <li><a href="#/muc/de-cuong-thpt" class="hover:text-white hover:underline">Đề cương Khối 10 - 11 - 12</a></li>
          </ul>
          ${s.footerNote ? html`<p class="mt-4 text-sm text-blue-200">${s.footerNote}</p>` : ''}
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="container-x flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-blue-200">
          <p>© ${year} Tổ Toán — ${s.schoolName}. Bảo lưu mọi quyền.</p>
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1">
            <button type="button" data-action="toggle-motion" aria-pressed="${String(motionOn)}" ${osReduced ? raw('disabled') : ''}
              class="underline-offset-2 hover:text-white hover:underline disabled:cursor-not-allowed disabled:no-underline">
              Hiệu ứng chuyển động: <span data-motion-label>${osReduced ? 'Tắt (theo cài đặt thiết bị)' : (motionOn ? 'Bật' : 'Tắt')}</span></button>
            <a href="#/admin" class="underline-offset-2 hover:text-white hover:underline">Quản trị viên đăng nhập</a>
          </div>
        </div>
      </div></div>`;
  }

  // Dải "Mới nhất": tiêu đề các bài mới, chạy ngang; tạm dừng được (rê chuột / bàn phím / nút)
  function ticker(list) {
    if (!list.length) return html``;
    const items = (dup) => list.map((p) => html`<li><a href="${postHref(p)}" ${dup ? raw('tabindex="-1"') : ''}>${p.title}</a></li>`);
    return html`<div class="ticker" role="region" aria-label="Thông báo mới nhất">
      <div class="container-x flex items-center gap-3">
        <span class="ticker-label">${icon('star', 'h-3 w-3')} Mới nhất</span>
        <div class="ticker-viewport"><div class="ticker-track" data-ticker-track>
          <ul class="ticker-list">${items(false)}</ul>
          <ul class="ticker-list ticker-dup" aria-hidden="true">${items(true)}</ul>
        </div></div>
        <button type="button" data-action="toggle-ticker" class="ticker-btn" aria-pressed="false" aria-label="Tạm dừng thông báo chạy">${icon('pause', 'h-4 w-4')}</button>
      </div></div>`;
  }

  function floating(s) {
    const btns = [
      s.hotline && html`<a href="${telHref(s.hotline)}" class="float-btn bg-red-600 hover:bg-red-700" aria-label="Gọi hotline ${s.hotline}">
        <span class="float-ring bg-red-600" aria-hidden="true"></span>${icon('phone', 'relative h-6 w-6')}<span class="float-tip">Hotline: ${s.hotline}</span></a>`,
      s.zalo && TT.safeUrl(s.zalo) && html`<a href="${TT.safeUrl(s.zalo)}" target="_blank" rel="noopener noreferrer" class="float-btn bg-brand hover:bg-brand-dark" aria-label="Nhắn Zalo cho Tổ Toán">
        <span class="float-ring bg-brand" aria-hidden="true"></span><span class="relative text-sm font-extrabold">Zalo</span><span class="float-tip">Chat Zalo</span></a>`
    ].filter(Boolean);
    if (!btns.length) return html``;
    return html`<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-3">${btns}</div>`;
  }

  /* =====================================================================
   * Thanh bên + khung liên hệ
   * =================================================================== */
  function contactBox(s, dark) {
    const has = s.hotline || s.email || s.zalo;
    return html`<section class="${dark ? 'bg-navy text-white' : 'card'} rounded-xl p-5">
      <h2 class="text-base font-extrabold ${dark ? 'text-white' : 'text-navy-dark'}">Giải đáp thắc mắc</h2>
      ${has ? html`<p class="mt-1 text-sm ${dark ? 'text-blue-100' : 'text-slate-600'}">Cần hỗ trợ về tuyển sinh hoặc đề cương? Liên hệ Tổ Toán:</p>
        <div class="mt-3 space-y-2">
          ${s.hotline ? html`<a href="${telHref(s.hotline)}" class="btn btn-accent w-full">${icon('phone', 'h-4 w-4')} Gọi ${s.hotline}</a>` : ''}
          ${s.zalo && TT.safeUrl(s.zalo) ? html`<a href="${TT.safeUrl(s.zalo)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary w-full">${icon('chat', 'h-4 w-4')} Nhắn Zalo</a>` : ''}
          ${s.email ? html`<a href="mailto:${s.email}" class="btn btn-outline w-full">${icon('mail', 'h-4 w-4')} ${s.email}</a>` : ''}
        </div>`
        : html`<p class="mt-1 text-sm ${dark ? 'text-blue-100' : 'text-slate-600'}">Thông tin liên hệ đang được cập nhật.</p>`}
    </section>`;
  }

  function sidebar(excludeId) {
    const latest = app().visible().filter((p) => p.id !== excludeId).sort(byDate).slice(0, 5);
    return html`<aside class="space-y-6" aria-label="Thông tin bên lề">
      <section class="card p-5">
        <h2 class="border-b-2 border-accent pb-2 text-base font-extrabold text-navy-dark">Đề cương / thông báo mới nhất</h2>
        ${latest.length ? html`<ul class="mt-3 space-y-1">${latest.map(miniPost)}</ul>`
          : html`<p class="mt-3 text-sm text-slate-500">Chưa có bài viết.</p>`}
      </section>
      ${contactBox(app().settings, true)}
    </aside>`;
  }

  /* =====================================================================
   * TRANG CHỦ
   * =================================================================== */
  // [ký hiệu, x, y, cỡ chữ, thời gian trôi, độ trễ]
  const SYMBOLS = [
    ['∑', '6%', '14%', '4.5rem', '26s', '0s'], ['π', '22%', '62%', '3.5rem', '30s', '-6s'],
    ['∫', '46%', '8%', '5rem', '34s', '-3s'], ['√', '62%', '70%', '4rem', '28s', '-9s'],
    ['∞', '80%', '18%', '4rem', '32s', '-12s'], ['Δ', '90%', '64%', '3.2rem', '27s', '-4s'],
    ['x²', '35%', '82%', '3rem', '31s', '-8s'], ['θ', '72%', '40%', '3.4rem', '29s', '-14s']
  ];

  function hero(s) {
    const h = s.hero;
    const icons = ['calendar', 'file', 'target'];
    return html`<section class="hero-bg relative overflow-hidden text-white">
      <div class="hero-symbols" aria-hidden="true">${SYMBOLS.map((m) =>
        html`<span style="--x:${m[1]};--y:${m[2]};--s:${m[3]};--t:${m[4]};--dl:${m[5]}">${m[0]}</span>`)}</div>
      <div class="container-x relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-5 lg:py-20">
        <div class="lg:col-span-3">
          ${h.badge ? html`<span class="hero-in inline-block rounded-full bg-accent px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-navy-dark">${h.badge}</span>` : ''}
          <h1 class="hero-in mt-4 text-3xl font-extrabold leading-[1.3] tracking-tight md:text-4xl md:leading-[1.3] lg:text-[2.6rem]" style="--d:90ms">${h.title}</h1>
          ${h.subtitle ? html`<p class="hero-in mt-4 max-w-2xl text-base text-blue-100 md:text-lg" style="--d:180ms">${h.subtitle}</p>` : ''}
          <div class="hero-in mt-7 flex flex-wrap gap-3" style="--d:270ms">
            ${h.cta1 ? html`<a href="#/muc/tuyen-sinh" class="btn btn-lg btn-accent">${icon('clipboard', 'h-5 w-5')} ${h.cta1}</a>` : ''}
            ${h.cta2 ? html`<a href="#/muc/de-cuong" class="btn btn-lg btn-ghost-light">${icon('download', 'h-5 w-5')} ${h.cta2}</a>` : ''}
          </div>
        </div>
        <div class="lg:col-span-2">
          <ul class="space-y-3 rounded-2xl bg-white/10 p-5 ring-1 ring-white/25 backdrop-blur">
            ${h.points.map((p, i) => html`<li class="hero-in hero-in-right flex gap-3 rounded-xl bg-white/10 p-3.5" style="--d:${300 + i * 110}ms">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-navy-dark">${icon(icons[i] || 'check', 'h-5 w-5')}</span>
              <span class="min-w-0"><span class="block text-xs font-bold uppercase tracking-wider text-blue-200">${p.label}</span>
                <span class="block text-sm font-semibold text-white">${p.value}</span></span></li>`)}
          </ul>
        </div>
      </div></section>`;
  }

  function featured(pinned) {
    return html`<section class="border-b border-slate-200 bg-white" aria-labelledby="h-featured">
      <div class="container-x py-8">
        <h2 id="h-featured" data-reveal class="mb-4 flex items-center gap-2 text-xl font-extrabold text-navy-dark">
          <span class="text-accent">${icon('star', 'h-6 w-6')}</span> Bài tiêu điểm</h2>
        ${pinned.length === 1
          ? postRow(pinned[0])
          : html`<div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">${pinned.map(postCard)}</div>`}
      </div></section>`;
  }

  function aboutStats(s) {
    return html`<section class="container-x grid items-center gap-8 py-12 lg:grid-cols-2" aria-labelledby="h-about">
      <div data-reveal="left">
        <p class="text-sm font-bold uppercase tracking-wider text-accent-dark">Về chúng tôi</p>
        <h2 id="h-about" class="mt-1 text-2xl font-extrabold text-navy-dark md:text-3xl">${s.about.title}</h2>
        <div class="prose-math mt-4">${proseHtml(s.about.text)}</div>
        <a href="#/gioi-thieu" class="btn btn-outline-navy mt-5">Xem thêm giới thiệu ${icon('arrowRight', 'nudge h-4 w-4')}</a>
      </div>
      ${statGrid(s)}
    </section>`;
  }

  function statGrid(s) {
    return html`<div class="grid grid-cols-2 gap-4">${s.stats.map((st) => {
      const v = statValue(st);
      return html`<div class="card border-t-4 border-accent p-5 text-center" data-reveal="zoom">
        <p class="text-3xl font-extrabold tabular-nums text-navy md:text-4xl"><span data-count aria-hidden="true">${v}</span><span class="sr-only">${v}</span></p>
        <p class="mt-1 text-sm font-semibold text-slate-600">${st.label}</p></div>`;
    })}</div>`;
  }

  function featureCards() {
    const count = (cats) => app().visible().filter((p) => cats.indexOf(p.category) !== -1).length;
    const cards = [
      { key: 'tuyen-sinh', ic: 'clipboard', color: 'bg-navy', title: 'Quy chế & Thông báo Tuyển sinh',
        desc: 'Thông tin chính thức về kỳ tuyển sinh vào lớp 10.', bullets: ['Chỉ tiêu và điều kiện dự tuyển', 'Lịch thi và hồ sơ cần chuẩn bị', 'Cấu trúc đề thi'], cats: ['tuyen-sinh'] },
      { key: 'de-cuong-10', ic: 'layers', color: 'bg-accent text-navy-dark', title: 'Đề cương Ôn tập Tuyển sinh vào 10',
        desc: 'Tổng hợp chuyên đề ôn thi, xem trực tiếp và tải PDF.', bullets: ['Chuyên đề Đại số', 'Chuyên đề Hình học', 'Toán thực tế'], cats: ['de-cuong-10'] },
      { key: 'de-cuong-thpt', ic: 'cap', color: 'bg-brand', title: 'Đề cương Ôn tập Khối 10 - 11 - 12',
        desc: 'Đề cương theo từng khối lớp, bám chương trình.', bullets: ['Đề cương giữa kỳ', 'Đề cương cuối kỳ', 'Ôn thi Tốt nghiệp THPT'], cats: ['de-cuong-k10', 'de-cuong-k11', 'de-cuong-k12'] }
    ];
    return html`<section class="bg-white" aria-labelledby="h-features">
      <div class="container-x py-12">
        <div class="mb-8 text-center" data-reveal>
          <p class="text-sm font-bold uppercase tracking-wider text-accent-dark">Chuyên mục trọng tâm</p>
          <h2 id="h-features" class="mt-1 text-2xl font-extrabold text-navy-dark md:text-3xl">Tra cứu nhanh theo nhu cầu</h2></div>
        <div class="grid gap-6 md:grid-cols-3">
          ${cards.map((c) => html`<a href="#/muc/${c.key}" data-reveal class="group flex flex-col rounded-2xl bg-paper p-6 ring-1 ring-slate-200 transition hover:-translate-y-1 hover:bg-white hover:shadow-lift">
            <span class="flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${c.color}">${icon(c.ic, 'h-6 w-6')}</span>
            <h3 class="mt-4 text-lg font-extrabold text-navy-dark group-hover:text-brand">${c.title}</h3>
            <p class="mt-1 text-sm text-slate-600">${c.desc}</p>
            <ul class="mt-3 space-y-1.5 text-sm text-slate-700">${c.bullets.map((b) => html`<li class="flex items-start gap-2"><span class="mt-0.5 text-accent-dark">${icon('check', 'h-4 w-4')}</span>${b}</li>`)}</ul>
            <span class="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold text-brand">
              <span>${count(c.cats)} bài viết</span><span class="inline-flex items-center gap-1">Xem chuyên mục ${icon('arrowRight', 'nudge h-4 w-4')}</span></span>
          </a>`)}
        </div></div></section>`;
  }

  function homeView() {
    const a = app();
    const s = a.settings;
    const pinned = a.visible().filter((p) => p.pinned).sort(byDate).slice(0, 3);
    registerBrowser('home', { tabs: TT.HOME_TABS, base: () => a.visible(), excludePinnedOnAll: pinned.length > 0 });
    return {
      title: 'Tổ Toán — Cổng thông tin Tuyển sinh & Đề cương Ôn tập',
      body: html`${hero(s)}${pinned.length ? featured(pinned) : ''}${aboutStats(s)}${featureCards()}
        <section id="bai-dang" class="container-x py-12" aria-labelledby="h-latest">
          <div class="mb-5" data-reveal>
            <p class="text-sm font-bold uppercase tracking-wider text-accent-dark">Cập nhật liên tục</p>
            <h2 id="h-latest" class="mt-1 text-2xl font-extrabold text-navy-dark md:text-3xl">Bài đăng & Đề cương mới nhất</h2></div>
          ${browserShell('home')}
        </section>`
    };
  }

  /* =====================================================================
   * TRANG CHUYÊN MỤC
   * =================================================================== */
  function groupView(key) {
    const g = TT.GROUPS[key];
    if (!g) return notFoundView('Không tìm thấy chuyên mục này.');
    const a = app();
    const bk = 'g:' + key;
    const tabs = g.cats.length > 1
      ? [{ id: 'all', label: 'Tất cả', cats: g.cats }].concat(g.cats.map((c) => ({ id: c, label: catOf(c).tab, cats: [c] })))
      : [{ id: 'all', label: 'Tất cả', cats: g.cats }];
    registerBrowser(bk, { tabs: tabs, base: () => a.visible(), excludePinnedOnAll: false });
    return {
      title: g.title + ' — Tổ Toán',
      body: html`${pageHead(g.title, g.desc)}
        <section class="container-x py-8">
          ${breadcrumb([{ label: 'Trang chủ', href: '#/' }, { label: g.title }])}
          ${browserShell(bk)}
        </section>`
    };
  }

  /* =====================================================================
   * TRANG CHI TIẾT BÀI VIẾT + KHUNG XEM ĐỀ CƯƠNG
   * =================================================================== */
  function attachment(a, i, total) {
    const L = TT.parseLink(a.url);
    if (!L) return html``;
    const isFolder = L.kind === 'folder';
    const open = i === 0;
    const frameCls = isFolder ? 'att-iframe att-iframe-folder' : 'att-iframe';
    return html`<div class="overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-slate-200" data-att="${i}">
      <button type="button" data-action="toggle-att" data-i="${i}" aria-expanded="${String(open)}" aria-controls="att-frame-${i}"
        class="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">${icon('file', 'h-5 w-5')}</span>
        <span class="min-w-0 flex-1"><span class="block font-bold text-navy-dark">${a.title}</span>
          <span class="block text-xs text-slate-500">${L.label}</span></span>
        <span class="att-chevron text-slate-500 ${open ? 'rotate-180' : ''}">${icon('chevronDown', 'h-5 w-5')}</span>
      </button>
      <div class="flex flex-wrap gap-3 border-t border-slate-200 px-4 py-3">
        ${isFolder
          ? html`<a href="${L.open}" target="_blank" rel="noopener noreferrer" class="btn btn-lg btn-accent">${icon('external', 'h-5 w-5')} Mở thư mục trên Google Drive</a>`
          : html`<a href="${L.download}" download target="_blank" rel="noopener" class="btn btn-lg btn-accent">${icon('download', 'h-5 w-5')} Tải Đề Cương Về Máy (PDF)</a>`}
        <button type="button" data-action="fullscreen-att" data-i="${i}" class="btn btn-lg btn-outline-navy">${icon('maximize', 'h-5 w-5')} Mở toàn màn hình</button>
      </div>
      <div id="att-frame-${i}" class="att-frame" data-i="${i}" data-src="${L.preview}" data-title="${a.title}" data-cls="${frameCls}" data-open-url="${L.open}" ${open ? '' : raw('hidden')}>
        ${open ? html`<iframe src="${L.preview}" title="Xem trực tiếp: ${a.title}" class="${frameCls}" loading="lazy" allow="fullscreen"></iframe>` : ''}
        <button type="button" data-action="exit-fullscreen" class="att-exit">Thoát toàn màn hình</button>
      </div>
      <p class="px-4 pb-3 text-xs text-slate-500">Không thấy nội dung trong khung? <a href="${L.open}" target="_blank" rel="noopener noreferrer" class="font-semibold text-brand underline">Mở trong tab mới</a>.
        ${app().isAdmin && (L.kind === 'drive' || L.kind === 'gdoc' || L.kind === 'folder')
          ? html`<span class="font-semibold text-amber-800"> (Quản trị: nếu khung báo cần quyền truy cập, hãy chia sẻ file ở chế độ "Bất kỳ ai có đường liên kết".)</span>` : ''}</p>
    </div>`;
  }

  function ensureFrame(i) {
    const box = document.getElementById('att-frame-' + i);
    if (!box) return null;
    if (!box.querySelector('iframe')) {
      const f = document.createElement('iframe');
      f.src = box.dataset.src;
      f.title = 'Xem trực tiếp: ' + box.dataset.title;
      f.className = box.dataset.cls || 'att-iframe';
      f.setAttribute('allow', 'fullscreen');
      box.insertBefore(f, box.firstChild);
    }
    return box;
  }

  TT.actions['toggle-att'] = (el) => {
    const i = el.dataset.i;
    const box = ensureFrame(i);
    if (!box) return;
    const nowOpen = box.hidden;               // đang ẩn → sắp mở
    box.hidden = !nowOpen;
    el.setAttribute('aria-expanded', String(nowOpen));
    const chev = el.querySelector('.att-chevron');
    if (chev) chev.classList.toggle('rotate-180', nowOpen);
  };
  TT.actions['fullscreen-att'] = (el) => {
    const i = el.dataset.i;
    const box = ensureFrame(i);
    if (!box) return;
    box.hidden = false;
    const btn = document.querySelector('[data-action="toggle-att"][data-i="' + i + '"]');
    if (btn) { btn.setAttribute('aria-expanded', 'true'); const c = btn.querySelector('.att-chevron'); if (c) c.classList.add('rotate-180'); }
    const req = box.requestFullscreen || box.webkitRequestFullscreen;
    if (req) {
      try {
        const r = req.call(box);
        if (r && r.catch) r.catch(() => window.open(box.dataset.openUrl, '_blank', 'noopener'));
        return;
      } catch (e) { /* rơi xuống mở tab mới */ }
    }
    // iPhone/Safari không hỗ trợ fullscreen cho khung → mở tab mới
    window.open(box.dataset.openUrl, '_blank', 'noopener');
  };
  TT.actions['exit-fullscreen'] = () => {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  };

  function postView(id) {
    const a = app();
    const p = a.all().find((x) => x.id === id);
    if (!p || (p.hidden && !a.isAdmin)) return notFoundView('Bài viết không tồn tại hoặc đã bị ẩn.');
    const c = catOf(p.category);
    const group = ({ 'tuyen-sinh': 'tuyen-sinh', 'tin-tuc': 'tin-tuc', 'de-cuong-10': 'de-cuong-10' })[p.category] || 'de-cuong-thpt';
    const explicitCover = TT.safeUrl(p.cover);
    return {
      title: p.title + ' — Tổ Toán',
      body: html`<section class="container-x py-8">
        ${breadcrumb([{ label: 'Trang chủ', href: '#/' }, { label: c.name, href: '#/muc/' + group }, { label: p.title }])}
        <div class="grid gap-8 lg:grid-cols-3">
          <article class="min-w-0 lg:col-span-2">
            <div class="card overflow-hidden" data-reveal>
              ${explicitCover ? html`<img src="${explicitCover}" data-fallback="${c.cover}" alt="" class="max-h-80 w-full object-cover">` : ''}
              <div class="p-5 sm:p-8">
                ${p.hidden ? html`<p class="mb-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Bài viết đang ẩn — chỉ quản trị viên nhìn thấy.</p>` : ''}
                <div class="flex flex-wrap items-center gap-2">${badge(p.category)} ${pinFlag(p)}</div>
                <h1 class="mt-3 text-2xl font-extrabold leading-tight text-navy-dark sm:text-3xl">${p.title}</h1>
                <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 pb-4 text-sm text-slate-500">
                  ${metaLine(p)}
                  ${a.isAdmin ? html`<a href="#/admin/sua/${encodeURIComponent(p.id)}" class="ml-auto inline-flex items-center gap-1 font-semibold text-brand hover:underline">${icon('edit', 'h-4 w-4')} Sửa bài này</a>` : ''}
                </div>
                ${p.content ? html`<div class="prose-math mt-5">${proseHtml(p.content)}</div>` : ''}
              </div>
            </div>
            ${p.attachments.length ? html`<section class="mt-6" aria-labelledby="h-att" data-reveal>
              <h2 id="h-att" class="mb-3 flex items-center gap-2 text-xl font-extrabold text-navy-dark">
                <span class="text-red-700">${icon('file', 'h-6 w-6')}</span> Đề cương đính kèm (${p.attachments.length})</h2>
              <div class="space-y-4">${p.attachments.map((x, i) => attachment(x, i, p.attachments.length))}</div>
            </section>` : ''}
          </article>
          <div class="lg:col-span-1" data-reveal="right">${sidebar(p.id)}</div>
        </div></section>`
    };
  }

  /* =====================================================================
   * TÌM KIẾM, GIỚI THIỆU, LIÊN HỆ, 404, ĐANG TẢI
   * =================================================================== */
  function searchView(q) {
    const results = searchPosts(app().visible(), q);
    return {
      title: 'Tìm kiếm: ' + q + ' — Tổ Toán',
      body: html`${pageHead('Kết quả tìm kiếm', q ? 'Từ khóa: “' + q + '” — ' + results.length + ' kết quả' : 'Nhập từ khóa vào ô tìm kiếm.')}
        <section class="container-x py-8">
          ${breadcrumb([{ label: 'Trang chủ', href: '#/' }, { label: 'Tìm kiếm' }])}
          ${results.length ? html`<div class="space-y-4">${results.map(postRow)}</div>`
            : emptyState(q ? 'Không tìm thấy bài viết phù hợp. Thử từ khóa ngắn hơn (có dấu hoặc không dấu đều được).' : 'Chưa có từ khóa.')}
        </section>`
    };
  }

  function aboutView() {
    const s = app().settings;
    return {
      title: s.about.title + ' — Tổ Toán',
      body: html`${pageHead(s.about.title, s.schoolName)}
        <section class="container-x py-8">
          ${breadcrumb([{ label: 'Trang chủ', href: '#/' }, { label: 'Giới thiệu Tổ Toán' }])}
          <div class="grid gap-8 lg:grid-cols-3">
            <div class="card p-5 sm:p-8 lg:col-span-2"><div class="prose-math">${proseHtml(s.about.text)}</div></div>
            <div class="lg:col-span-1">${statGrid(s)}<div class="mt-6">${contactBox(s, true)}</div></div>
          </div></section>`
    };
  }

  function contactView() {
    const s = app().settings;
    const items = [
      s.hotline && { ic: 'phone', label: 'Hotline', value: s.hotline, href: telHref(s.hotline) },
      s.email && { ic: 'mail', label: 'Email Tổ Toán', value: s.email, href: 'mailto:' + s.email },
      s.address && { ic: 'pin', label: 'Địa chỉ nhà trường', value: s.address, href: '' },
      s.zalo && TT.safeUrl(s.zalo) && { ic: 'chat', label: 'Zalo', value: 'Nhắn tin Zalo cho Tổ Toán', href: TT.safeUrl(s.zalo), ext: true }
    ].filter(Boolean);
    return {
      title: 'Liên hệ — Tổ Toán',
      body: html`${pageHead('Liên hệ Tổ Toán', s.schoolName)}
        <section class="container-x py-8">
          ${breadcrumb([{ label: 'Trang chủ', href: '#/' }, { label: 'Liên hệ' }])}
          ${items.length ? html`<div class="grid gap-5 sm:grid-cols-2">${items.map((it) => html`<div class="card flex gap-4 p-5">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-white">${icon(it.ic, 'h-6 w-6')}</span>
            <div class="min-w-0"><p class="text-sm font-bold uppercase tracking-wider text-slate-500">${it.label}</p>
              ${it.href ? html`<a href="${it.href}" ${it.ext ? raw('target="_blank" rel="noopener noreferrer"') : ''} class="break-words text-lg font-bold text-brand hover:underline">${it.value}</a>`
                : html`<p class="break-words text-lg font-bold text-navy-dark">${it.value}</p>`}</div></div>`)}</div>`
            : emptyState('Thông tin liên hệ đang được cập nhật.')}
          ${app().isAdmin && !items.length ? html`<p class="mt-4 text-sm"><a href="#/admin/cai-dat" class="font-semibold text-brand underline">Nhập thông tin liên hệ trong Quản trị → Cài đặt</a></p>` : ''}
        </section>`
    };
  }

  function notFoundView(msg) {
    return {
      title: 'Không tìm thấy — Tổ Toán',
      body: html`<section class="container-x py-20 text-center">
        <p class="text-6xl font-extrabold text-navy/20">404</p>
        <h1 class="mt-2 text-2xl font-extrabold text-navy-dark">${msg || 'Không tìm thấy trang này.'}</h1>
        <a href="#/" class="btn btn-primary btn-lg mt-6">Về trang chủ</a></section>`
    };
  }

  function loadingView() {
    const card = html`<div class="card overflow-hidden"><div class="skel aspect-video !rounded-none"></div>
      <div class="space-y-3 p-4"><div class="skel h-5 w-4/5"></div><div class="skel h-3 w-2/5"></div><div class="skel h-3 w-full"></div><div class="skel h-3 w-3/4"></div></div></div>`;
    return {
      title: 'Đang tải… — Tổ Toán',
      body: html`<div role="status"><span class="sr-only">Đang tải dữ liệu…</span>
        <section class="hero-bg" aria-hidden="true"><div class="container-x py-14 md:py-20">
          <div class="skel h-6 w-40 !rounded-full"></div><div class="skel mt-5 h-10 w-full max-w-2xl"></div>
          <div class="skel mt-3 h-10 w-2/3 max-w-xl"></div><div class="skel mt-7 h-12 w-72 max-w-full"></div></div></section>
        <section class="container-x py-10" aria-hidden="true"><div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">${card}${card}${card}</div></section></div>`
    };
  }

  function errorBanner(errors) {
    if (!errors.length) return html``;
    return html`<div class="border-b border-red-300 bg-red-50 text-red-800" role="alert">
      <div class="container-x flex items-start gap-3 py-2.5 text-sm">
        <span class="mt-0.5 shrink-0">${icon('alert', 'h-5 w-5')}</span>
        <div class="min-w-0 flex-1 space-y-1">${errors.map((e) => html`<p>${e}</p>`)}</div>
        <button type="button" data-action="clear-errors" class="shrink-0 rounded p-1 hover:bg-red-100" aria-label="Đóng thông báo lỗi">${icon('x', 'h-4 w-4')}</button>
      </div></div>`;
  }

  TT.views = {
    home: homeView,
    group: groupView,
    post: postView,
    search: searchView,
    about: aboutView,
    contact: contactView,
    notFound: notFoundView,
    loading: loadingView,
    chrome: { demoBanner: demoBanner, topbar: topbar, navbar: navbar, ticker: ticker, footer: footer, floating: floating, errorBanner: errorBanner },
    // dùng chung cho trang quản trị
    parts: { badge: badge, postCard: postCard, pageHead: pageHead, breadcrumb: breadcrumb, emptyState: emptyState, catOf: catOf, summaryOf: summaryOf, byDate: byDate }
  };
})();
