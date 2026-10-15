/*
 * util.js — tiện ích dùng chung (namespace toàn cục: window.TT)
 *
 * Quy ước an toàn: MỌI giá trị nội suy trong html`...` đều bị escape,
 * trừ khi được bọc bằng raw() / là kết quả của html`...` khác.
 * Không nối chuỗi HTML bằng tay ở nơi khác.
 */
(function () {
  'use strict';
  var TT = (window.TT = window.TT || {});

  /* ---------------------------------------------------------------
   * 1. Escape + template an toàn
   * ------------------------------------------------------------- */
  function Raw(s) { this.s = s; }
  Raw.prototype.toString = function () { return this.s; };

  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }
  function raw(s) { return new Raw(String(s == null ? '' : s)); }

  function part(v) {
    if (v instanceof Raw) return v.s;
    if (Array.isArray(v)) return v.map(part).join('');
    if (v === null || v === undefined || v === false || v === true) return '';
    return esc(String(v));
  }
  // html`<p>${userText}</p>` → Raw (userText đã escape)
  function html(strings) {
    var out = strings[0];
    for (var i = 1; i < arguments.length; i++) out += part(arguments[i]) + strings[i];
    return new Raw(out);
  }

  /* ---------------------------------------------------------------
   * 2. Icon (SVG nét, 24x24, theo phong cách Feather)
   * ------------------------------------------------------------- */
  var ICONS = {
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    star: '<polygon fill="currentColor" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    bold: '<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>',
    italic: '<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    rows: '<rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    cap: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
    quote: '<path d="M10 7H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3"/><path d="M19 7h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3"/>',
    hr: '<line x1="3" y1="12" x2="21" y2="12"/>'
  };
  function icon(name, cls) {
    return raw('<svg class="' + esc(cls || 'w-5 h-5') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') + '</svg>');
  }

  /* ---------------------------------------------------------------
   * 3. Ngày tháng, chuỗi
   * ------------------------------------------------------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(ms) {
    var d = new Date(Number(ms) || 0);
    if (isNaN(d)) return '';
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function dateInputValue(ms) {
    var d = new Date(Number(ms) || Date.now());
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  // Giữ nguyên giờ cũ nếu ngày không đổi (để bài cùng ngày vẫn xếp đúng thứ tự)
  function parseDateInput(str, fallbackMs) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
    if (!m) return fallbackMs || Date.now();
    if (fallbackMs && dateInputValue(fallbackMs) === str) return fallbackMs;
    var now = new Date();
    var d = new Date(+m[1], +m[2] - 1, +m[3], now.getHours(), now.getMinutes(), now.getSeconds());
    return isNaN(d) ? (fallbackMs || Date.now()) : d.getTime();
  }
  // Bỏ dấu tiếng Việt + hạ chữ thường → tìm kiếm không phân biệt dấu
  function fold(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }
  function genId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function clip(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) : s;
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var self = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* ---------------------------------------------------------------
   * 4. URL an toàn + nhận diện link Google Drive
   * ------------------------------------------------------------- */
  // Trả '' nếu không hợp lệ. Chỉ cho http(s) hoặc đường dẫn tương đối cùng site.
  function safeUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (!u || u.length > 2000) return '';
    if (/[\u0000-\u001f\u007f\s<>"'`\\]/.test(u)) return '';
    if (/^https?:\/\//i.test(u)) {
      try { new URL(u); return u; } catch (e) { return ''; }
    }
    if (/^[a-z][a-z0-9+.\-]*:/i.test(u)) return '';   // javascript:, data:, vbscript: ...
    if (u.indexOf('//') === 0) return '';
    return u;
  }
  // Dùng cho liên kết trong bài viết: cho thêm mailto:, tel:
  function safeLinkUrl(u) {
    u = String(u == null ? '' : u).trim();
    if (/^(mailto:|tel:)[^\s<>"'`\\]+$/i.test(u)) return u;
    return safeUrl(u);
  }

  var KIND_LABEL = {
    drive: 'Google Drive',
    gdoc: 'Google Docs / Sheets / Slides',
    folder: 'Thư mục Google Drive',
    office: 'Tài liệu Office (xem qua Google Viewer)',
    file: 'Liên kết trực tiếp'
  };

  // Từ link người dùng dán → link xem trước / tải xuống / mở
  function parseLink(input) {
    var url = safeUrl(input);
    if (!url) return null;
    var m;

    m = /^https?:\/\/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]{10,})/i.exec(url);
    if (m) {
      var base = 'https://docs.google.com/' + m[1].toLowerCase() + '/d/' + m[2];
      return {
        kind: 'gdoc', label: KIND_LABEL.gdoc, id: m[2],
        preview: base + '/preview',
        download: m[1].toLowerCase() === 'presentation' ? base + '/export/pdf' : base + '/export?format=pdf',
        open: base + '/preview'
      };
    }

    m = /^https?:\/\/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|embeddedfolderview\?(?:[^#]*&)?id=)([\w-]{10,})/i.exec(url);
    if (m) {
      return {
        kind: 'folder', label: KIND_LABEL.folder, id: m[1],
        preview: 'https://drive.google.com/embeddedfolderview?id=' + m[1] + '#list',
        download: '',
        open: 'https://drive.google.com/drive/folders/' + m[1]
      };
    }

    m = /^https?:\/\/drive\.google\.com\/(?:file\/(?:u\/\d+\/)?d\/|open\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=)([\w-]{10,})/i.exec(url);
    if (m) {
      return {
        kind: 'drive', label: KIND_LABEL.drive, id: m[1],
        preview: 'https://drive.google.com/file/d/' + m[1] + '/preview',
        download: 'https://drive.google.com/uc?export=download&id=' + m[1],
        open: 'https://drive.google.com/file/d/' + m[1] + '/view'
      };
    }

    if (/^https?:\/\//i.test(url) && /\.(docx?|pptx?|xlsx?)(?:$|[?#])/i.test(url)) {
      return {
        kind: 'office', label: KIND_LABEL.office, id: '',
        preview: 'https://docs.google.com/viewer?embedded=true&url=' + encodeURIComponent(url),
        download: url, open: url
      };
    }

    return { kind: 'file', label: KIND_LABEL.file, id: '', preview: url, download: url, open: url };
  }

  /* ---------------------------------------------------------------
   * 5. Làm sạch dữ liệu bài viết (dùng chung cho cả 2 backend)
   *    Danh sách khóa PHẢI khớp validPost() trong firestore.rules.
   * ------------------------------------------------------------- */
  var POST_KEYS = ['title', 'category', 'author', 'cover', 'summary', 'content',
    'attachments', 'pinned', 'hidden', 'createdAt', 'updatedAt'];

  function cleanPost(p) {
    p = p || {};
    var now = Date.now();
    var cats = TT.CATS || {};
    var atts = (Array.isArray(p.attachments) ? p.attachments : []).map(function (a, i) {
      a = a || {};
      return {
        title: clip(String(a.title || '').trim(), 200) || ('Tài liệu ' + (i + 1)),
        url: safeUrl(a.url)
      };
    }).filter(function (a) { return a.url; }).slice(0, 20);

    return {
      title: clip(String(p.title || '').trim(), 300),
      category: cats[p.category] ? p.category : 'tin-tuc',
      author: clip(String(p.author || '').trim(), 120),
      cover: safeUrl(p.cover),
      summary: clip(String(p.summary || '').trim(), 600),
      content: clip(String(p.content || ''), 200000),
      attachments: atts,
      pinned: p.pinned === true,
      hidden: p.hidden === true,
      createdAt: Number(p.createdAt) || now,
      updatedAt: Number(p.updatedAt) || now
    };
  }

  /* ---------------------------------------------------------------
   * 6. localStorage an toàn (có thể bị chặn / đầy)
   * ------------------------------------------------------------- */
  function lsGet(key, fallback) {
    try {
      var v = window.localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function lsRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* bỏ qua */ }
  }

  /* ---------------------------------------------------------------
   * 7. Toast thông báo
   * ------------------------------------------------------------- */
  function toast(message, type) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = message;               // textContent: không bao giờ là HTML
    root.appendChild(el);
    setTimeout(function () { el.classList.add('toast-out'); }, type === 'error' ? 5200 : 3200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, type === 'error' ? 5600 : 3600);
  }

  /* ---------------------------------------------------------------
   * 8. Hộp thoại trong trang — thay cho confirm()/prompt() của trình duyệt
   *    (nhiều khung nhúng / ứng dụng di động chặn các hộp thoại gốc và trả về "hủy" ngay)
   * ------------------------------------------------------------- */
  function dialog(opts) {
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      var id = 'dlg-' + Math.random().toString(36).slice(2, 7);
      var wrap = document.createElement('div');
      wrap.className = 'dlg-backdrop';
      wrap.innerHTML = html`<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="${id}-t" aria-describedby="${id}-m">
        <h2 id="${id}-t" class="dlg-title">${opts.title || ''}</h2>
        <p id="${id}-m" class="dlg-msg">${opts.message || ''}</p>
        ${opts.input ? html`<input class="field mt-3" data-dialog="input" value="${opts.value || ''}" aria-labelledby="${id}-m" autocomplete="off" inputmode="url">` : ''}
        <div class="dlg-actions">
          <button type="button" class="btn btn-outline" data-dialog="cancel">Hủy</button>
          <button type="button" class="btn ${opts.danger ? 'bg-red-700 text-white hover:bg-red-800' : 'btn-navy'}" data-dialog="ok">${opts.okLabel || 'Đồng ý'}</button>
        </div></div>`.s;
      document.body.appendChild(wrap);
      var input = wrap.querySelector('[data-dialog="input"]');
      var ok = wrap.querySelector('[data-dialog="ok"]');
      var cancel = wrap.querySelector('[data-dialog="cancel"]');

      function close(accepted) {
        document.removeEventListener('keydown', onKey, true);
        wrap.remove();
        if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* bỏ qua */ } }
        resolve(accepted ? (opts.input ? input.value : true) : (opts.input ? null : false));
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); return; }
        if (e.key === 'Enter' && input && document.activeElement === input) { e.preventDefault(); close(true); return; }
        if (e.key === 'Tab') {                                   // giữ tiêu điểm trong hộp thoại
          var items = [input, cancel, ok].filter(Boolean);
          var i = items.indexOf(document.activeElement);
          e.preventDefault();
          items[(i + (e.shiftKey ? items.length - 1 : 1)) % items.length].focus();
        }
      }
      ok.addEventListener('click', function () { close(true); });
      cancel.addEventListener('click', function () { close(false); });
      wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(false); });
      document.addEventListener('keydown', onKey, true);
      (input || (opts.danger ? cancel : ok)).focus();
      if (input) input.select();
    });
  }

  /* ---------------------------------------------------------------
   * Xuất ra namespace
   * ------------------------------------------------------------- */
  TT.Raw = Raw;
  TT.esc = esc;
  TT.raw = raw;
  TT.html = html;
  TT.icon = icon;
  TT.fmtDate = fmtDate;
  TT.dateInputValue = dateInputValue;
  TT.parseDateInput = parseDateInput;
  TT.fold = fold;
  TT.genId = genId;
  TT.clip = clip;
  TT.debounce = debounce;
  TT.safeUrl = safeUrl;
  TT.safeLinkUrl = safeLinkUrl;
  TT.parseLink = parseLink;
  TT.POST_KEYS = POST_KEYS;
  TT.cleanPost = cleanPost;
  TT.lsGet = lsGet;
  TT.lsSet = lsSet;
  TT.lsRemove = lsRemove;
  TT.toast = toast;
  TT.dialog = dialog;
  TT.confirm = function (message, opts) { return dialog(Object.assign({ message: message }, opts || {})); };
  TT.ask = function (message, value, opts) { return dialog(Object.assign({ message: message, input: true, value: value || '' }, opts || {})); };
})();
