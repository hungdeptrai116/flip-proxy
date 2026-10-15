/*
 * motion.js — hiệu ứng chuyển động, bật dần dần (progressive enhancement).
 *
 * Nguyên tắc:
 *  - Mọi hiệu ứng chỉ chạy khi <html> có class "motion-ok". Class này CHỈ được thêm khi:
 *      · thiết bị không yêu cầu "giảm chuyển động" (prefers-reduced-motion), VÀ
 *      · người dùng chưa tắt bằng nút "Hiệu ứng" ở chân trang, VÀ
 *      · trình duyệt có IntersectionObserver.
 *    Không có class này (hoặc JS lỗi) → trang hiện ĐẦY ĐỦ, tĩnh, không có gì bị ẩn.
 *  - Chỉ hoạt họa transform / opacity (không làm xê dịch bố cục).
 *  - Nội dung ẩn chờ cuộn chỉ được đánh dấu ngay trong lúc vẽ trang (cùng một tác vụ),
 *    nên không có hiện tượng nháy hiện → ẩn → hiện.
 */
(function () {
  'use strict';
  const TT = window.TT;
  const root = document.documentElement;
  const KEY = 'totoan.motion';
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const hasIO = 'IntersectionObserver' in window;

  const osReduced = () => !!(mq && mq.matches);
  const userOff = () => TT.lsGet(KEY, 'on') === 'off';
  const enabled = () => hasIO && !osReduced() && !userOff();
  const active = () => root.classList.contains('motion-ok');

  /* ----------------------------- Bật / tắt ----------------------------- */
  function syncToggle() {
    const btn = document.querySelector('[data-action="toggle-motion"]');
    if (!btn) return;
    const on = active();
    btn.setAttribute('aria-pressed', String(on));
    btn.disabled = osReduced();
    const label = btn.querySelector('[data-motion-label]');
    if (label) label.textContent = osReduced() ? 'Tắt (theo cài đặt thiết bị)' : (on ? 'Bật' : 'Tắt');
  }
  function apply() {
    root.classList.toggle('motion-ok', enabled());
    syncToggle();
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);
  apply();

  TT.actions = TT.actions || {};
  TT.actions['toggle-motion'] = () => {
    TT.lsSet(KEY, active() ? 'off' : 'on');
    apply();
  };

  /* ----------------------------- Hiện dần khi cuộn ----------------------------- */
  let revealIO = null;
  let countIO = null;

  function ensureObservers() {
    if (revealIO || !hasIO) return;
    revealIO = new IntersectionObserver((entries) => {
      let i = 0;                                         // các phần tử cùng hiện một lượt → so le nhau
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--d', Math.min(i++, 6) * 70 + 'ms');
        e.target.classList.add('is-in');
        revealIO.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    countIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        countIO.unobserve(e.target);
        countUp(e.target);
      });
    }, { threshold: 0.6 });
  }

  /* ----------------------------- Đếm số ----------------------------- */
  // "7,5" → { n: 7.5, dec: 1, comma: true }; "98%" → hậu tố "%"
  function parseNum(txt) {
    const m = /^(\D*?)(\d+(?:[.,]\d+)?)(\D*)$/.exec(String(txt).trim());
    if (!m) return null;
    const raw = m[2];
    return { pre: m[1], n: parseFloat(raw.replace(',', '.')), dec: (raw.split(/[.,]/)[1] || '').length, comma: raw.indexOf(',') !== -1, post: m[3] };
  }
  function fmt(p, v) {
    let s = v.toFixed(p.dec);
    if (p.comma) s = s.replace('.', ',');
    return p.pre + s + p.post;
  }
  function countUp(el) {
    const final = el.dataset.final;
    const p = parseNum(final);
    if (!p || !(p.n > 0)) return;
    const dur = 1100;
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = k < 1 ? fmt(p, p.n * (1 - Math.pow(1 - k, 3))) : final;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* Gọi ngay sau khi chèn HTML của một trang / một khối.
   * full=true: vẽ lại cả trang → bỏ theo dõi các phần tử cũ. */
  function afterRender(scope, full) {
    scope = scope || document;
    if (!active()) return;
    ensureObservers();
    if (full && revealIO) { revealIO.disconnect(); countIO.disconnect(); }
    scope.querySelectorAll('[data-reveal]').forEach((el) => {
      el.classList.add('reveal');
      revealIO.observe(el);
    });
    scope.querySelectorAll('[data-count]').forEach((el) => {
      el.dataset.final = el.dataset.final || el.textContent;
      countIO.observe(el);
    });
  }

  /* ----------------------------- Chuyển trang ----------------------------- */
  function routeStart() {
    if (!active()) return;
    const main = document.getElementById('view');
    const bar = document.getElementById('route-bar');
    if (main) { main.classList.remove('view-enter'); void main.offsetWidth; main.classList.add('view-enter'); }
    if (bar) { bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); }
  }

  /* ----------------------------- Cuộn trang: đổ bóng header, thanh đọc, nút lên đầu ----------------------------- */
  let toTop = null;
  let readBar = null;
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY || root.scrollTop || 0;
      const header = document.getElementById('header');
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (toTop) toTop.classList.toggle('is-shown', y > 700);
      if (readBar) {
        const r = TT.app && TT.app.route;
        const max = root.scrollHeight - window.innerHeight;
        const on = !!(r && r.name === 'post' && max > 200);
        readBar.classList.toggle('is-on', on);
        if (on) readBar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, y / max)) + ')';
      }
    });
  }

  function init() {
    readBar = document.getElementById('read-bar');
    toTop = document.getElementById('to-top');
    if (toTop) {
      toTop.innerHTML = TT.icon('chevronUp', 'h-5 w-5').s;
      toTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: active() ? 'smooth' : 'auto' });
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  /* ----------------------------- Dải thông báo chạy ----------------------------- */
  // Tốc độ cuộn cố định ~55px/giây, dù dài hay ngắn
  function setupTicker() {
    const track = document.querySelector('[data-ticker-track]');
    if (!track) return;
    const list = track.querySelector('.ticker-list');
    const w = list ? list.scrollWidth : 0;
    if (w) track.style.setProperty('--ticker-dur', Math.max(20, Math.round(w / 55)) + 's');
  }
  TT.actions['toggle-ticker'] = (el) => {
    const box = el.closest('.ticker');
    if (!box) return;
    const paused = box.classList.toggle('is-paused');
    el.setAttribute('aria-pressed', String(paused));
    el.setAttribute('aria-label', paused ? 'Tiếp tục chạy thông báo' : 'Tạm dừng thông báo chạy');
    el.innerHTML = TT.icon(paused ? 'play' : 'pause', 'h-4 w-4').s;
  };

  TT.motion = {
    isOn: active,
    isOsReduced: osReduced,
    afterRender: afterRender,
    routeStart: routeStart,
    setupTicker: setupTicker,
    syncToggle: syncToggle,
    init: init
  };
})();
