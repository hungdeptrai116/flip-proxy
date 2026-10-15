/*
 * admin.js — trang Quản trị dành cho 1 người (#/admin)
 *   #/admin            → danh sách bài đã đăng (Sửa / Xóa / Ẩn-Hiện / Ghim)
 *   #/admin/bai-moi    → soạn bài mới
 *   #/admin/sua/<id>   → sửa bài
 *   #/admin/cai-dat    → cài đặt chung + sao lưu
 *
 * Lưu ý bảo mật: giao diện này chỉ là lớp tiện dụng. Việc CHẶN ghi dữ liệu do firestore.rules đảm nhiệm.
 */
(function () {
  'use strict';
  const TT = window.TT;
  const { html, raw, esc, icon, fmtDate, CATS } = TT;
  const app = () => TT.app;
  const parts = () => TT.views.parts;

  TT.actions = TT.actions || {};
  TT.forms = TT.forms || {};
  TT.inputs = TT.inputs || {};

  const DRAFT_KEY = 'totoan.draft.v1';
  const LAST_AUTHOR_KEY = 'totoan.lastAuthor';
  const listFilter = { q: '', cat: 'all', status: 'all' };

  const fail = (err) => TT.toast((err && err.message) || 'Có lỗi xảy ra.', 'error');

  /* =====================================================================
   * Đăng nhập
   * =================================================================== */
  function authMessage(err) {
    switch (err && err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Email hoặc mật khẩu không đúng.';
      case 'auth/too-many-requests': return 'Đăng nhập sai quá nhiều lần. Hãy đợi vài phút rồi thử lại.';
      case 'auth/network-request-failed': return 'Không kết nối được mạng. Kiểm tra Internet rồi thử lại.';
      case 'auth/user-disabled': return 'Tài khoản này đã bị vô hiệu hóa.';
      case 'auth/operation-not-allowed': return 'Chưa bật phương thức đăng nhập Email/Mật khẩu trong Firebase Authentication.';
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': return 'apiKey trong config.js không đúng.';
      default: return (err && err.message) || 'Đăng nhập thất bại.';
    }
  }

  function loginView() {
    const demo = TT.Store.mode === 'demo';
    const d = (window.SITE_CONFIG || {}).demo || {};
    return {
      title: 'Đăng nhập quản trị — Tổ GDTX',
      body: html`<section class="container-x flex justify-center py-12">
        <div class="card w-full max-w-md p-6 sm:p-8">
          <div class="flex items-center gap-3"><img src="assets/logo.svg" alt="" class="h-12 w-12">
            <div><h1 class="text-xl font-extrabold text-navy-dark">Đăng nhập quản trị</h1>
              <p class="text-sm text-slate-500">Dành cho quản trị viên Tổ GDTX</p></div></div>
          ${demo ? html`<p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            <strong>Chế độ Demo.</strong> Tài khoản mẫu đã điền sẵn: <code>${d.email}</code> / <code>${d.password}</code>.
            Khi chạy thật, đăng nhập bằng tài khoản tạo trong Firebase Authentication.</p>` : ''}
          <form data-form="login" class="mt-5 space-y-4" novalidate>
            <div><label class="label" for="login-email">Email</label>
              <input id="login-email" name="email" type="email" autocomplete="username" required class="field" value="${demo ? d.email : ''}"></div>
            <div><label class="label" for="login-pw">Mật khẩu</label>
              <input id="login-pw" name="password" type="password" autocomplete="current-password" required class="field" value="${demo ? d.password : ''}"></div>
            <p id="login-error" class="hidden rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-200" role="alert"></p>
            <button type="submit" class="btn btn-navy btn-lg w-full">Đăng nhập</button>
          </form>
          <p class="mt-4 text-center text-sm"><a href="#/" class="text-brand hover:underline">← Về trang chủ</a></p>
        </div></section>`
    };
  }

  TT.forms.login = async (form) => {
    const err = document.getElementById('login-error');
    const btn = form.querySelector('button[type="submit"]');
    const show = (msg) => { err.textContent = msg; err.classList.toggle('hidden', !msg); };
    show('');
    if (!form.elements.email.value.trim() || !form.elements.password.value) { show('Vui lòng nhập email và mật khẩu.'); return; }
    btn.disabled = true;
    try {
      await TT.Store.signIn(form.elements.email.value, form.elements.password.value);
      TT.toast('Đăng nhập thành công.', 'success');
    } catch (e) {
      show(authMessage(e));
    } finally {
      btn.disabled = false;
    }
  };

  TT.actions.logout = async () => {
    try { await TT.Store.signOut(); TT.toast('Đã đăng xuất.', 'info'); location.hash = '#/'; }
    catch (e) { fail(e); }
  };

  /* =====================================================================
   * Khung chung của bảng điều khiển
   * =================================================================== */
  function shell(active, inner) {
    const tabs = [
      { id: 'list', label: 'Bài viết', href: '#/admin', ic: 'list' },
      { id: 'new', label: 'Viết bài mới', href: '#/admin/bai-moi', ic: 'plus' },
      { id: 'settings', label: 'Cài đặt', href: '#/admin/cai-dat', ic: 'sliders' }
    ];
    const user = app().user;
    return html`<section class="container-x py-6">
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <h1 class="mr-auto text-xl font-extrabold text-navy-dark sm:text-2xl">Bảng điều khiển quản trị</h1>
        ${user ? html`<span class="hidden text-sm text-slate-500 sm:inline">${user.email}</span>` : ''}
        <a href="#/" class="btn btn-sm btn-outline">${icon('external', 'h-4 w-4')} Xem website</a>
        <button type="button" data-action="logout" class="btn btn-sm btn-outline">${icon('logout', 'h-4 w-4')} Đăng xuất</button>
      </div>
      <nav class="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200 pb-3" aria-label="Quản trị">
        ${tabs.map((t) => html`<a href="${t.href}" ${active === t.id ? raw('aria-current="page"') : ''}
          class="${active === t.id ? 'bg-navy text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'} inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
          ${icon(t.ic, 'h-4 w-4')} ${t.label}</a>`)}
      </nav>
      ${inner}</section>`;
  }

  /* =====================================================================
   * Danh sách bài viết
   * =================================================================== */
  function filteredPosts() {
    const q = TT.fold(listFilter.q).trim();
    return app().all().filter((p) => {
      if (listFilter.cat !== 'all' && p.category !== listFilter.cat) return false;
      if (listFilter.status === 'hidden' && !p.hidden) return false;
      if (listFilter.status === 'visible' && p.hidden) return false;
      if (listFilter.status === 'pinned' && !p.pinned) return false;
      if (q && TT.fold(p.title + ' ' + p.author).indexOf(q) === -1) return false;
      return true;
    }).sort(parts().byDate);
  }

  function rowBtn(action, id, ic, label, extra) {
    return html`<button type="button" data-action="${action}" data-id="${id}" title="${label}" class="btn btn-sm btn-outline ${extra || ''}">
      ${icon(ic, 'h-4 w-4')}<span class="sr-only">${label}</span></button>`;
  }

  function listBody() {
    const list = filteredPosts();
    if (!app().all().length) {
      return html`<div class="rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p class="font-semibold text-slate-700">Chưa có bài viết nào.</p>
        <div class="mt-4 flex flex-wrap justify-center gap-3">
          <a href="#/admin/bai-moi" class="btn btn-accent">${icon('plus', 'h-4 w-4')} Viết bài đầu tiên</a>
          <button type="button" data-action="admin-seed" class="btn btn-outline">Nạp 6 bài mẫu</button></div></div>`;
    }
    if (!list.length) return parts().emptyState('Không có bài viết khớp bộ lọc.');
    return html`<ul class="space-y-3">${list.map((p) => html`<li class="card flex flex-wrap items-center gap-3 p-3 ${p.hidden ? 'opacity-70' : ''}">
      <img src="${TT.safeUrl(p.cover) || parts().catOf(p.category).cover}" data-fallback="${parts().catOf(p.category).cover}" alt="" loading="lazy" class="hidden h-14 w-24 shrink-0 rounded-md object-cover sm:block">
      <div class="min-w-0 flex-1 basis-64">
        <a href="#/bai-viet/${encodeURIComponent(p.id)}" class="line-clamp-2 font-bold text-navy-dark hover:text-brand">${p.title}</a>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          ${parts().badge(p.category)}
          <span>${fmtDate(p.createdAt)}</span>${p.author ? html`<span>${p.author}</span>` : ''}
          ${p.attachments.length ? html`<span class="inline-flex items-center gap-0.5 font-semibold text-red-700">${icon('file', 'h-3 w-3')}${p.attachments.length} tệp</span>` : ''}
          ${p.pinned ? html`<span class="inline-flex items-center gap-0.5 font-semibold text-accent-dark">${icon('star', 'h-3 w-3')}Tiêu điểm</span>` : ''}
          ${p.hidden ? html`<span class="rounded bg-slate-800 px-1.5 py-0.5 font-semibold text-white">Đang ẩn</span>` : ''}
        </div>
      </div>
      <div class="flex shrink-0 gap-1.5">
        <a href="#/admin/sua/${encodeURIComponent(p.id)}" class="btn btn-sm btn-outline" title="Sửa">${icon('edit', 'h-4 w-4')}<span class="sr-only">Sửa bài</span></a>
        ${rowBtn('admin-toggle-hidden', p.id, p.hidden ? 'eye' : 'eyeOff', p.hidden ? 'Hiện bài viết' : 'Ẩn bài viết')}
        ${rowBtn('admin-toggle-pin', p.id, 'star', p.pinned ? 'Bỏ ghim' : 'Ghim lên đầu trang chủ', p.pinned ? '!bg-accent-light !text-accent-dark' : '')}
        ${rowBtn('admin-delete', p.id, 'trash', 'Xóa bài viết', 'text-red-700 hover:!bg-red-50')}
      </div></li>`)}</ul>`;
  }

  function listView() {
    const all = app().all();
    const chip = (n, label) => html`<div class="card px-4 py-3"><p class="text-2xl font-extrabold text-navy">${n}</p><p class="text-xs font-semibold text-slate-500">${label}</p></div>`;
    const atts = all.reduce((n, p) => n + p.attachments.length, 0);
    return {
      title: 'Quản lý bài viết — Tổ GDTX',
      body: shell('list', html`
        <div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          ${chip(all.length, 'Tổng số bài')}${chip(all.filter((p) => !p.hidden).length, 'Đang hiển thị')}
          ${chip(all.filter((p) => p.hidden).length, 'Đang ẩn')}${chip(all.filter((p) => p.pinned).length, 'Bài tiêu điểm')}
          ${chip(atts, 'Tệp đính kèm')}</div>
        <div class="mb-4 grid gap-3 sm:grid-cols-4">
          <div class="sm:col-span-2"><label class="sr-only" for="adm-q">Tìm bài viết</label>
            <input id="adm-q" type="search" data-input="admin-q" placeholder="Tìm theo tiêu đề hoặc người đăng…" class="field" value="${listFilter.q}"></div>
          <div><label class="sr-only" for="adm-cat">Chuyên mục</label>
            <select id="adm-cat" data-input="admin-cat" class="field">
              <option value="all">Tất cả chuyên mục</option>
              ${TT.CAT_ORDER.map((c) => html`<option value="${c}" ${listFilter.cat === c ? raw('selected') : ''}>${CATS[c].name}</option>`)}</select></div>
          <div><label class="sr-only" for="adm-st">Trạng thái</label>
            <select id="adm-st" data-input="admin-status" class="field">
              ${[['all', 'Mọi trạng thái'], ['visible', 'Đang hiển thị'], ['hidden', 'Đang ẩn'], ['pinned', 'Bài tiêu điểm']].map((o) =>
                html`<option value="${o[0]}" ${listFilter.status === o[0] ? raw('selected') : ''}>${o[1]}</option>`)}</select></div>
        </div>
        <div id="admin-list">${listBody()}</div>
        <div class="mt-6"><a href="#/admin/bai-moi" class="btn btn-accent btn-lg">${icon('plus', 'h-5 w-5')} Viết bài mới</a></div>`)
    };
  }

  function refreshList() {
    const el = document.getElementById('admin-list');
    if (el) el.innerHTML = listBody().s;
  }
  TT.inputs['admin-q'] = (el) => { listFilter.q = el.value; refreshList(); };
  TT.inputs['admin-cat'] = (el) => { listFilter.cat = el.value; refreshList(); };
  TT.inputs['admin-status'] = (el) => { listFilter.status = el.value; refreshList(); };

  const findPost = (id) => app().all().find((p) => p.id === id);

  TT.actions['admin-toggle-hidden'] = async (el) => {
    const p = findPost(el.dataset.id);
    if (!p) return;
    try { await TT.Store.patchPost(p.id, { hidden: !p.hidden }); TT.toast(p.hidden ? 'Đã hiện bài viết.' : 'Đã ẩn bài viết.', 'success'); }
    catch (e) { fail(e); }
  };
  TT.actions['admin-toggle-pin'] = async (el) => {
    const p = findPost(el.dataset.id);
    if (!p) return;
    try { await TT.Store.patchPost(p.id, { pinned: !p.pinned }); TT.toast(p.pinned ? 'Đã bỏ ghim.' : 'Đã ghim lên đầu trang chủ.', 'success'); }
    catch (e) { fail(e); }
  };
  TT.actions['admin-delete'] = async (el) => {
    const p = findPost(el.dataset.id);
    if (!p) return;
    if (!(await TT.confirm('Xóa vĩnh viễn bài viết:\n\n“' + p.title + '”\n\nKhông thể hoàn tác.', { title: 'Xóa bài viết?', okLabel: 'Xóa bài', danger: true }))) return;
    try { await TT.Store.deletePost(p.id); TT.toast('Đã xóa bài viết.', 'success'); }
    catch (e) { fail(e); }
  };
  TT.actions['admin-seed'] = async () => {
    const demo = TT.Store.mode === 'demo';
    if (!(await TT.confirm(demo ? 'Khôi phục 6 bài mẫu và cài đặt ban đầu? Mọi thay đổi trong chế độ Demo sẽ mất.' : 'Thêm 6 bài mẫu (đề cương, tuyển sinh) vào Firestore? Các bài mẫu cũ cùng ID sẽ bị ghi đè.', { title: demo ? 'Khôi phục dữ liệu mẫu?' : 'Nạp bài mẫu?', okLabel: demo ? 'Khôi phục' : 'Nạp bài mẫu' }))) return;
    try { const n = await TT.Store.seedDemo(); TT.toast('Đã nạp ' + n + ' bài mẫu.', 'success'); }
    catch (e) { fail(e); }
  };

  /* =====================================================================
   * Soạn / sửa bài
   * =================================================================== */
  const TOOLS = [
    { id: 'bold', ic: 'bold', title: 'In đậm (Ctrl+B)' },
    { id: 'italic', ic: 'italic', title: 'In nghiêng (Ctrl+I)' },
    { id: 'h2', label: 'H2', title: 'Tiêu đề lớn' },
    { id: 'h3', label: 'H3', title: 'Tiêu đề nhỏ' },
    { id: 'ul', ic: 'list', title: 'Danh sách gạch đầu dòng' },
    { id: 'ol', label: '1.', title: 'Danh sách đánh số' },
    { id: 'quote', ic: 'quote', title: 'Khung trích dẫn / lưu ý' },
    { id: 'link', ic: 'link', title: 'Chèn liên kết' },
    { id: 'image', ic: 'image', title: 'Chèn ảnh (dán link ảnh)' },
    { id: 'table', ic: 'table', title: 'Chèn bảng' },
    { id: 'hr', ic: 'hr', title: 'Đường kẻ ngang' },
    { id: 'math', label: '$x$', title: 'Công thức Toán trong dòng' },
    { id: 'mathblock', label: '$$', title: 'Công thức Toán đứng riêng một dòng' }
  ];

  // [nhãn, mã LaTeX, hiển thị dạng khối?]
  const FORMULAS = [
    ['Phân số', '\\dfrac{a}{b}'],
    ['Căn bậc hai', '\\sqrt{x}'],
    ['Lũy thừa', 'x^{2}'],
    ['Chỉ số dưới', 'x_{1}'],
    ['Nghiệm phương trình bậc hai', 'x_{1,2}=\\dfrac{-b\\pm\\sqrt{\\Delta}}{2a}'],
    ['Hệ thức Vi-ét', 'x_1+x_2=-\\dfrac{b}{a},\\quad x_1x_2=\\dfrac{c}{a}'],
    ['Hệ phương trình', '\\begin{cases} x+y=5 \\\\ x-y=1 \\end{cases}', true],
    ['Giới hạn', '\\lim_{x\\to a} f(x)'],
    ['Đạo hàm', 'f\'(x)'],
    ['Tích phân', '\\int_{a}^{b} f(x)\\,dx'],
    ['Tổng', '\\sum_{k=1}^{n} k'],
    ['Vectơ', '\\overrightarrow{AB}'],
    ['Góc', '\\widehat{ABC}'],
    ['Số đo độ', '60^\\circ'],
    ['Tập số thực', '\\mathbb{R}'],
    ['Bằng/khác/nhỏ hơn hoặc bằng', '\\ne \\quad \\le \\quad \\ge']
  ];

  function attRow(a) {
    return html`<div class="rounded-lg border border-slate-200 bg-slate-50 p-3" data-att-row>
      <div class="grid gap-3 sm:grid-cols-5">
        <label class="block sm:col-span-2"><span class="label">Tên tài liệu</span>
          <input name="att_title" class="field" maxlength="200" value="${a.title}" placeholder="VD: Đề cương Đại số 9 - Ôn vào 10"></label>
        <label class="block sm:col-span-3"><span class="label">Link Google Drive hoặc link PDF</span>
          <input name="att_url" class="field" data-input="att-url" value="${a.url}" placeholder="https://drive.google.com/file/d/…/view" inputmode="url" autocomplete="off"></label>
      </div>
      <div class="mt-2 flex items-start justify-between gap-3">
        <p class="text-xs" data-detect>${detectHtml(a.url)}</p>
        <button type="button" data-action="att-remove" class="btn btn-sm btn-outline shrink-0 text-red-700">${icon('trash', 'h-4 w-4')} Gỡ</button>
      </div></div>`;
  }

  function detectHtml(url) {
    url = String(url || '').trim();
    if (!url) return html``;
    const L = TT.parseLink(url);
    if (!L) return html`<span class="font-semibold text-red-700">Link không hợp lệ — chỉ nhận địa chỉ bắt đầu bằng http:// hoặc https://</span>`;
    if (L.kind === 'drive' || L.kind === 'gdoc') {
      return html`<span class="inline-flex items-center gap-1 font-semibold text-emerald-700">${icon('check', 'h-3.5 w-3.5')}Nhận diện ${L.label}</span> <span class="text-slate-500">(ID: ${L.id.slice(0, 8)}…) — tự tạo link Xem trước và Tải xuống. Nhớ chia sẻ file ở chế độ “Bất kỳ ai có đường liên kết”.</span>`;
    }
    if (L.kind === 'folder') return html`<span class="inline-flex items-center gap-1 font-semibold text-emerald-700">${icon('check', 'h-3.5 w-3.5')}Thư mục Google Drive</span> <span class="text-slate-500">— hiển thị danh sách file, không có nút Tải xuống.</span>`;
    if (L.kind === 'office') return html`<span class="inline-flex items-center gap-1 font-semibold text-emerald-700">${icon('check', 'h-3.5 w-3.5')}Tài liệu Office</span> <span class="text-slate-500">— xem qua Google Viewer.</span>`;
    return html`<span class="inline-flex items-center gap-1 font-semibold text-emerald-700">${icon('check', 'h-3.5 w-3.5')}Liên kết trực tiếp</span> <span class="text-slate-500">— một số trang web không cho nhúng khung xem; nút Tải vẫn hoạt động.</span>`;
  }

  function editorView(id) {
    const a = app();
    const s = a.settings;
    let post;
    let draftNotice = false;

    if (id) {
      post = findPost(id);
      if (!post) return { title: 'Không tìm thấy bài', body: shell('list', parts().emptyState('Không tìm thấy bài viết cần sửa.')) };
    } else {
      const draft = TT.lsGet(DRAFT_KEY, null);
      if (draft && (draft.title || draft.content)) { post = draft; draftNotice = true; }
      else {
        post = {
          title: '', category: TT.CAT_ORDER[0], author: TT.lsGet(LAST_AUTHOR_KEY, '') || s.defaultAuthor,
          cover: '', summary: '', content: '', attachments: [], pinned: false, hidden: false, createdAt: Date.now()
        };
      }
    }
    const atts = post.attachments && post.attachments.length ? post.attachments : [];

    return {
      title: (id ? 'Sửa bài' : 'Bài mới') + ' — Quản trị Tổ GDTX',
      mount: (root) => mountEditor(root, id),
      body: shell(id ? 'list' : 'new', html`
        <form id="post-form" data-form="post" data-id="${id || ''}" class="space-y-6" novalidate>
          <h2 class="text-lg font-extrabold text-navy-dark">${id ? 'Chỉnh sửa bài viết' : 'Đăng bài viết mới'}</h2>
          ${draftNotice ? html`<p class="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
            Đã khôi phục bản nháp chưa đăng của lần soạn trước.
            <button type="button" data-action="draft-clear" class="font-bold underline">Xóa bản nháp, soạn mới</button></p>` : ''}

          <div class="card space-y-4 p-5">
            <div><label class="label" for="f-title">Tiêu đề bài viết <span class="text-red-600">*</span></label>
              <input id="f-title" name="title" class="field" maxlength="300" required value="${post.title}" placeholder="VD: Đề cương ôn tập vào 10 — Phương trình bậc hai"></div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div><label class="label" for="f-cat">Chuyên mục</label>
                <select id="f-cat" name="category" class="field">${TT.CAT_ORDER.map((c) =>
                  html`<option value="${c}" ${post.category === c ? raw('selected') : ''}>${CATS[c].name}</option>`)}</select></div>
              <div><label class="label" for="f-author">Tên người đăng</label>
                <input id="f-author" name="author" class="field" maxlength="120" value="${post.author}"></div>
              <div><label class="label" for="f-date">Ngày đăng</label>
                <input id="f-date" name="date" type="date" class="field" value="${TT.dateInputValue(post.createdAt)}"></div>
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div class="sm:col-span-2"><label class="label" for="f-cover">Link ảnh đại diện</label>
                <input id="f-cover" name="cover" class="field" inputmode="url" value="${post.cover}" placeholder="Để trống = dùng ảnh mặc định của chuyên mục">
                <p class="hint">Dán link ảnh (https://…). Bỏ trống thì hệ thống tự dùng ảnh Toán học mặc định theo chuyên mục.</p></div>
              <div><span class="label">Ảnh sẽ hiển thị</span>
                <img id="cover-preview" alt="Ảnh đại diện" class="aspect-video w-full rounded-lg object-cover ring-1 ring-slate-200" src="${TT.safeUrl(post.cover) || CATS[post.category].cover}"></div>
            </div>
            <div><label class="label" for="f-summary">Tóm tắt ngắn <span class="font-normal text-slate-500">(không bắt buộc)</span></label>
              <textarea id="f-summary" name="summary" rows="2" maxlength="600" class="field" placeholder="Để trống = tự lấy đoạn đầu của nội dung">${post.summary}</textarea></div>
          </div>

          <div class="card p-5">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label class="label !mb-0" for="f-content">Nội dung bài viết</label>
              <details class="relative text-sm"><summary class="cursor-pointer font-semibold text-brand">Hướng dẫn gõ công thức Toán</summary>
                <div class="absolute right-0 z-20 mt-2 w-[min(92vw,26rem)] rounded-lg bg-white p-4 text-xs shadow-lift ring-1 ring-slate-200">
                  <p>Công thức trong dòng: <code>$x^2-5x+6=0$</code></p>
                  <p class="mt-1">Công thức riêng một dòng: <code>$$x=\dfrac{-b\pm\sqrt{\Delta}}{2a}$$</code></p>
                  <p class="mt-1">Muốn viết ký hiệu đô la thường: gõ <code>\$</code>.</p>
                  <p class="mt-1">Dùng ô <strong>“Chèn công thức mẫu”</strong> trên thanh công cụ nếu chưa quen LaTeX.</p>
                </div></details>
            </div>
            <div class="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-1.5" role="toolbar" aria-label="Công cụ soạn thảo">
              ${TOOLS.map((t) => html`<button type="button" data-md="${t.id}" title="${t.title}" aria-label="${t.title}"
                class="inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-bold text-slate-700 hover:bg-white hover:ring-1 hover:ring-slate-300">
                ${t.ic ? icon(t.ic, 'h-4 w-4') : t.label}</button>`)}
              <label class="sr-only" for="f-formula">Chèn công thức mẫu</label>
              <select id="f-formula" data-md-formula class="field !w-auto !py-1.5 text-xs">
                <option value="">Σ Chèn công thức mẫu…</option>
                ${FORMULAS.map((f, i) => html`<option value="${i}">${f[0]}</option>`)}</select>
            </div>
            <div class="grid overflow-hidden rounded-b-lg border border-slate-300 lg:grid-cols-2">
              <textarea id="f-content" name="content" rows="18" spellcheck="true" class="block min-h-[22rem] w-full resize-y border-0 p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/40"
                placeholder="Gõ nội dung ở đây. Hỗ trợ Markdown và công thức Toán $x^2$…">${post.content}</textarea>
              <div class="max-h-[34rem] overflow-auto border-t border-slate-300 bg-white p-4 lg:border-l lg:border-t-0">
                <p class="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Xem trước</p>
                <div id="preview" class="prose-math" aria-live="polite"></div></div>
            </div>
          </div>

          <div class="card p-5">
            <h3 class="text-base font-extrabold text-navy-dark">Đính kèm đề cương <span class="font-normal text-slate-500">(1 hoặc nhiều tài liệu)</span></h3>
            <p class="hint mb-3">Dán link chia sẻ Google Drive (…/file/d/ID/view) hoặc link PDF. Hệ thống tự nhận diện ID để tạo khung xem trước và nút tải xuống.</p>
            <div id="att-list" class="space-y-3">${atts.map(attRow)}</div>
            <button type="button" data-action="att-add" class="btn btn-outline mt-3">${icon('plus', 'h-4 w-4')} Thêm tài liệu đính kèm</button>
          </div>

          <div class="card space-y-3 p-5">
            <label class="flex items-start gap-3"><input type="checkbox" name="pinned" class="mt-1 h-4 w-4 rounded border-slate-300 text-brand" ${post.pinned ? raw('checked') : ''}>
              <span><span class="font-semibold text-slate-800">Ghim lên đầu trang chủ (Bài tiêu điểm)</span>
                <span class="hint block">Hiện ở khối “Bài tiêu điểm” ngay dưới banner trang chủ (tối đa 3 bài mới nhất).</span></span></label>
            <label class="flex items-start gap-3"><input type="checkbox" name="hidden" class="mt-1 h-4 w-4 rounded border-slate-300 text-brand" ${post.hidden ? raw('checked') : ''}>
              <span><span class="font-semibold text-slate-800">Ẩn bài viết (lưu nháp)</span>
                <span class="hint block">Bài ẩn chỉ quản trị viên nhìn thấy. Bỏ chọn để công bố.</span></span></label>
          </div>

          <div class="sticky bottom-0 z-30 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
            <button type="submit" class="btn btn-accent btn-lg">${icon('check', 'h-5 w-5')} ${id ? 'Lưu thay đổi' : 'Lưu & Đăng bài'}</button>
            <a href="#/admin" class="btn btn-outline btn-lg">Hủy</a>
            <p id="form-error" class="hidden text-sm font-semibold text-red-700" role="alert"></p>
          </div>
        </form>`)
    };
  }

  /* ---- thao tác trên textarea ---- */
  function fireInput(ta) { ta.dispatchEvent(new Event('input', { bubbles: true })); }

  function wrapSel(ta, before, after, placeholder) {
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    const sel = v.slice(s, e) || placeholder || '';
    ta.value = v.slice(0, s) + before + sel + after + v.slice(e);
    ta.focus();
    ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    fireInput(ta);
  }
  function insertText(ta, text) {
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    ta.value = v.slice(0, s) + text + v.slice(e);
    ta.focus();
    ta.setSelectionRange(s + text.length, s + text.length);
    fireInput(ta);
  }
  function prefixLines(ta, fn) {
    const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    const ls = s === 0 ? 0 : v.lastIndexOf('\n', s - 1) + 1;
    let le = v.indexOf('\n', e);
    if (le === -1) le = v.length;
    const block = v.slice(ls, le).split('\n').map(fn).join('\n');
    ta.value = v.slice(0, ls) + block + v.slice(le);
    ta.focus();
    ta.setSelectionRange(ls, ls + block.length);
    fireInput(ta);
  }

  const LIST_MARK = /^\s*([-*+]|\d+[.)])\s+/;
  async function runTool(ta, id) {
    switch (id) {
      case 'bold': return wrapSel(ta, '**', '**', 'chữ đậm');
      case 'italic': return wrapSel(ta, '*', '*', 'chữ nghiêng');
      case 'h2': return prefixLines(ta, (l) => '## ' + l.replace(/^#{1,4}\s+/, ''));
      case 'h3': return prefixLines(ta, (l) => '### ' + l.replace(/^#{1,4}\s+/, ''));
      case 'ul': return prefixLines(ta, (l) => '- ' + l.replace(LIST_MARK, ''));
      case 'ol': return prefixLines(ta, (l, i) => (i + 1) + '. ' + l.replace(LIST_MARK, ''));
      case 'quote': return prefixLines(ta, (l) => '> ' + l.replace(/^>\s?/, ''));
      case 'math': return wrapSel(ta, '$', '$', 'x^2');
      case 'mathblock': return wrapSel(ta, '\n$$\n', '\n$$\n', '\\dfrac{a}{b}');
      case 'hr': return insertText(ta, '\n\n---\n\n');
      case 'table': return insertText(ta, '\n\n| Cột 1 | Cột 2 | Cột 3 |\n|:--|:--:|--:|\n| a | b | c |\n| d | e | f |\n\n');
      case 'link': {
        const url = await TT.ask('Dán đường link (bắt đầu bằng https://):', 'https://', { title: 'Chèn liên kết', okLabel: 'Chèn' });
        if (url === null) return;
        const safe = TT.safeLinkUrl(url);
        if (!safe) return TT.toast('Link không hợp lệ.', 'error');
        return wrapSel(ta, '[', '](' + safe + ')', 'chữ hiển thị');
      }
      case 'image': {
        const url = await TT.ask('Dán link ảnh (bắt đầu bằng https://):', 'https://', { title: 'Chèn ảnh', okLabel: 'Tiếp' });
        if (url === null) return;
        const safe = TT.safeUrl(url);
        if (!safe) return TT.toast('Link ảnh không hợp lệ.', 'error');
        const alt = (await TT.ask('Mô tả ảnh cho người khiếm thị (không bắt buộc):', '', { title: 'Mô tả ảnh', okLabel: 'Chèn ảnh' })) || '';
        return insertText(ta, '\n\n![' + alt.replace(/[\[\]\n]/g, ' ') + '](' + safe + ')\n\n');
      }
      default:
    }
  }

  function collectPost(form) {
    const el = form.elements;
    const rows = Array.prototype.slice.call(form.querySelectorAll('[data-att-row]'));
    return {
      title: el.title.value,
      category: el.category.value,
      author: el.author.value,
      cover: el.cover.value,
      summary: el.summary.value,
      content: el.content.value,
      pinned: el.pinned.checked,
      hidden: el.hidden.checked,
      attachments: rows.map((r) => ({
        title: r.querySelector('[name="att_title"]').value,
        url: r.querySelector('[name="att_url"]').value
      })),
      _date: el.date.value
    };
  }

  function mountEditor(root, id) {
    const form = root.querySelector('#post-form');
    if (!form) return;
    const ta = form.elements.content;
    const preview = root.querySelector('#preview');
    const coverPrev = root.querySelector('#cover-preview');

    const renderPreview = () => {
      const out = TT.md.render(ta.value);
      preview.innerHTML = out || '<p class="text-slate-500">Xem trước sẽ hiện ở đây…</p>';
    };
    const renderPreviewSoon = TT.debounce(renderPreview, 150);
    renderPreview();

    const updateCover = () => {
      coverPrev.src = TT.safeUrl(form.elements.cover.value) || CATS[form.elements.category.value].cover;
      coverPrev.dataset.fallback = CATS[form.elements.category.value].cover;
    };
    form.elements.cover.addEventListener('input', TT.debounce(updateCover, 250));
    form.elements.category.addEventListener('change', updateCover);

    const saveDraft = TT.debounce(() => {
      if (id) return;                           // chỉ lưu nháp cho bài MỚI
      const d = collectPost(form);
      if (!d.title.trim() && !d.content.trim()) return;
      delete d._date;
      TT.lsSet(DRAFT_KEY, d);
    }, 600);

    ta.addEventListener('input', () => { renderPreviewSoon(); });
    form.addEventListener('input', saveDraft);
    form.addEventListener('change', saveDraft);

    root.querySelectorAll('[data-md]').forEach((b) => {
      b.addEventListener('click', () => runTool(ta, b.dataset.md));
    });
    root.querySelector('[data-md-formula]').addEventListener('change', (e) => {
      const f = FORMULAS[Number(e.target.value)];
      e.target.value = '';
      if (!f) return;
      insertText(ta, f[2] ? '\n$$\n' + f[1] + '\n$$\n' : '$' + f[1] + '$');
    });
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'b') { e.preventDefault(); runTool(ta, 'bold'); }
        else if (k === 'i') { e.preventDefault(); runTool(ta, 'italic'); }
      }
    });
  }

  // Thêm / gỡ / nhận diện link tài liệu đính kèm
  TT.actions['att-add'] = () => {
    const list = document.getElementById('att-list');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', attRow({ title: '', url: '' }).s);
    const rows = list.querySelectorAll('[data-att-row]');
    const last = rows[rows.length - 1];
    if (last) last.querySelector('[name="att_title"]').focus();
  };
  TT.actions['att-remove'] = (el) => {
    const row = el.closest('[data-att-row]');
    const form = el.closest('form');
    if (row) row.remove();
    if (form) form.dispatchEvent(new Event('input', { bubbles: true }));   // kích hoạt lưu nháp
  };
  TT.inputs['att-url'] = (el) => {
    const row = el.closest('[data-att-row]');
    const box = row && row.querySelector('[data-detect]');
    if (box) box.innerHTML = detectHtml(el.value).s;
  };
  TT.actions['draft-clear'] = () => {
    TT.lsRemove(DRAFT_KEY);
    TT.toast('Đã xóa bản nháp.', 'info');
    if (location.hash === '#/admin/bai-moi') app().render(); else location.hash = '#/admin/bai-moi';
  };

  TT.forms.post = async (form) => {
    const errBox = document.getElementById('form-error');
    const showErr = (msg, field) => {
      errBox.textContent = msg;
      errBox.classList.toggle('hidden', !msg);
      if (msg) TT.toast(msg, 'error');
      if (field) field.focus();
    };
    showErr('');
    const id = form.dataset.id || '';
    const d = collectPost(form);

    if (!d.title.trim()) return showErr('Vui lòng nhập tiêu đề bài viết.', form.elements.title);
    if (d.cover.trim() && !TT.safeUrl(d.cover)) return showErr('Link ảnh đại diện không hợp lệ (phải bắt đầu bằng http:// hoặc https://).', form.elements.cover);
    const rows = form.querySelectorAll('[data-att-row]');
    for (let i = 0; i < d.attachments.length; i++) {
      const a = d.attachments[i];
      const urlInput = rows[i].querySelector('[name="att_url"]');
      if (!a.url.trim() && !a.title.trim()) continue;              // dòng trống → bỏ qua
      if (!a.url.trim()) return showErr('Tài liệu #' + (i + 1) + ' chưa có link.', urlInput);
      if (!TT.safeUrl(a.url)) return showErr('Link tài liệu #' + (i + 1) + ' không hợp lệ (phải bắt đầu bằng http:// hoặc https://).', urlInput);
    }

    const existing = id ? findPost(id) : null;
    const payload = {
      title: d.title, category: d.category, author: d.author, cover: d.cover, summary: d.summary,
      content: d.content, pinned: d.pinned, hidden: d.hidden,
      attachments: d.attachments.filter((a) => a.url.trim()),
      createdAt: TT.parseDateInput(d._date, existing ? existing.createdAt : 0)
    };

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await TT.Store.savePost(payload, id || undefined);
      if (payload.author.trim()) TT.lsSet(LAST_AUTHOR_KEY, payload.author.trim());
      if (!id) TT.lsRemove(DRAFT_KEY);
      TT.toast(id ? 'Đã lưu thay đổi.' : (payload.hidden ? 'Đã lưu bài (đang ẩn).' : 'Đã đăng bài viết.'), 'success');
      location.hash = '#/admin';
    } catch (e) {
      showErr((e && e.message) || 'Không lưu được bài viết.');
    } finally {
      btn.disabled = false;
    }
  };

  /* =====================================================================
   * Cài đặt chung + sao lưu
   * =================================================================== */
  function settingsView() {
    const s = app().settings;
    const demo = TT.Store.mode === 'demo';
    const f = (label, name, value, opts) => {
      opts = opts || {};
      return html`<div class="${opts.span || ''}"><label class="label" for="s-${name}">${label}</label>
        ${opts.area
          ? html`<textarea id="s-${name}" name="${name}" rows="${opts.rows || 3}" maxlength="${opts.max || 500}" class="field">${value}</textarea>`
          : html`<input id="s-${name}" name="${name}" class="field" maxlength="${opts.max || 300}" value="${value}" ${opts.type ? raw('type="' + opts.type + '"') : ''} ${opts.ph ? raw('placeholder="' + esc(opts.ph) + '"') : ''}>`}
        ${opts.hint ? html`<p class="hint">${opts.hint}</p>` : ''}</div>`;
    };
    // Danh sách nhiều dòng: mỗi dòng một mục (dòng trống bị bỏ)
    const lines = (label, name, arr, hint) => f(label, name, (arr || []).join('\n'),
      { area: true, rows: Math.max(4, (arr || []).length + 1), max: 4000, span: 'sm:col-span-2', hint: hint || 'Mỗi dòng một mục. Dòng trống sẽ bị bỏ.' });
    // Đủ số ô để thêm mục mới mà không cần nút "thêm": ô để trống sẽ bị bỏ khi lưu
    const slots = (list, min, max) => { const n = Math.min(max, Math.max(min, list.length)); const out = []; for (let i = 0; i < n; i++) out.push(list[i] || {}); return out; };
    const rc = s.recruit;
    const rowBox = (title, inner) => html`<fieldset class="rounded-lg border border-slate-200 p-3 sm:col-span-2">
      <legend class="px-1 text-sm font-bold text-slate-700">${title}</legend><div class="grid gap-3 sm:grid-cols-2">${inner}</div></fieldset>`;
    return {
      title: 'Cài đặt — Quản trị Tổ GDTX',
      body: shell('settings', html`
        <form data-form="settings" class="space-y-6" novalidate>
          <div class="card p-5"><h2 class="text-base font-extrabold text-navy-dark">Thông tin chung</h2>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              ${f('Tên trường (hiện cạnh chữ “TỔ GDTX”)', 'schoolName', s.schoolName, { span: 'sm:col-span-2', max: 200 })}
              ${f('Số điện thoại tư vấn của Tổ GDTX (hotline)', 'hotline', s.hotline, { ph: 'VD: 0912 345 678', max: 40, hint: 'Hiện ở nút gọi nổi và trang Tuyển sinh học nghề, kèm số chính thức của Trường.' })}
              ${f('Email Tổ GDTX', 'email', s.email, { max: 120, type: 'email' })}
              ${f('Địa chỉ nhà trường', 'address', s.address, { span: 'sm:col-span-2' })}
              ${f('Link Zalo', 'zalo', s.zalo, { ph: 'https://zalo.me/số-điện-thoại', hint: 'Để trống để ẩn nút Zalo nổi.', span: 'sm:col-span-2' })}
              ${f('Tên người đăng mặc định', 'defaultAuthor', s.defaultAuthor, { max: 120 })}
              ${f('Ghi chú chân trang', 'footerNote', s.footerNote, { max: 300 })}
            </div></div>

          <div class="card p-5"><h2 class="text-base font-extrabold text-navy-dark">Tuyển sinh học nghề (trang #/hoc-nghe)</h2>
            <p class="hint">Dữ liệu này hiện ở trang <strong>Tuyển sinh học nghề</strong>, banner và ô số liệu trang chủ — sửa ở MỘT chỗ này. Mặc định chép từ Thông báo ngày 02/01/2026 của Trường;
              khi Trường đổi thông báo hãy sửa tại đây và ghi lại ngày đối chiếu. Chỉ đăng thông tin đã được Trường xác nhận.</p>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              ${f('Nguồn thông tin (hiện đầu trang)', 'recruit.source', rc.source, { area: true, rows: 2, max: 300, span: 'sm:col-span-2' })}
              ${f('Đã đối chiếu với Trường ngày', 'recruit.checked', rc.checked, { max: 80, ph: 'VD: 20/10/2026', hint: 'Để trống nếu chưa đối chiếu.' })}
              ${f('Tên người tư vấn (hiện cạnh số của Tổ GDTX)', 'recruit.advisor', rc.advisor, { max: 120, ph: 'VD: Thầy Nguyễn Văn A', hint: 'Nên ghi tên thật — số lạ không tên dễ bị nghi là lừa đảo.' })}
              ${f('Nhãn số điện thoại của Trường', 'recruit.officialName', rc.officialName, { max: 120 })}
              ${f('Số điện thoại của Trường', 'recruit.officialPhone', rc.officialPhone, { max: 40, hint: 'Số ghi trên thông báo chính thức.' })}
              ${f('Đối tượng tuyển sinh', 'recruit.eligibility', rc.eligibility, { area: true, rows: 2, max: 400, span: 'sm:col-span-2' })}
              ${slots(rc.programs, 4, 4).map((p, i) => rowBox('Ngành nghề ' + (i + 1) + (i >= 2 ? ' (để trống nếu không dùng)' : ''), html`
                ${f('Tên ngành nghề', 'recruit.programs.' + i + '.name', p.name || '', { max: 160, span: 'sm:col-span-2' })}
                ${f('Trình độ', 'recruit.programs.' + i + '.level', p.level || '', { max: 60, ph: 'Sơ cấp / Trung cấp' })}
                ${f('Yêu cầu trình độ đầu vào', 'recruit.programs.' + i + '.require', p.require || '', { max: 120 })}
                ${f('Thời gian học tại trường', 'recruit.programs.' + i + '.train', p.train || '', { max: 60, ph: 'VD: 3,2 tháng' })}
                ${f('Thời gian thực tập sản xuất', 'recruit.programs.' + i + '.practice', p.practice || '', { max: 60, ph: 'VD: 3,7 tháng' })}`))}
              ${lines('Quyền lợi khi đi học nghề', 'recruit.learnBenefits', rc.learnBenefits)}
              ${lines('Quyền lợi khi đi làm', 'recruit.workBenefits', rc.workBenefits)}
              ${lines('Lộ trình (các bước)', 'recruit.steps', rc.steps)}
              ${lines('Hồ sơ cần chuẩn bị', 'recruit.documents', rc.documents)}
              ${f('Ghi chú dưới danh sách hồ sơ', 'recruit.documentsNote', rc.documentsNote, { area: true, rows: 2, max: 400, span: 'sm:col-span-2', hint: 'Để trống để ẩn ghi chú.' })}
              ${slots(rc.branches, 6, 8).map((b, i) => rowBox('Phân hiệu ' + (i + 1) + (i >= rc.branches.length ? ' (để trống nếu không dùng)' : ''), html`
                ${f('Tên phân hiệu', 'recruit.branches.' + i + '.name', b.name || '', { max: 120, span: 'sm:col-span-2' })}
                ${f('Địa chỉ', 'recruit.branches.' + i + '.address', b.address || '', { max: 300, span: 'sm:col-span-2' })}
                ${f('Link Google Maps', 'recruit.branches.' + i + '.map', b.map || '', { max: 300, ph: 'https://maps.app.goo.gl/…', span: 'sm:col-span-2' })}`))}
              ${slots(rc.faq, 8, 10).map((q, i) => rowBox('Hỏi đáp ' + (i + 1) + (i >= rc.faq.length ? ' (để trống nếu không dùng)' : ''), html`
                ${f('Câu hỏi', 'recruit.faq.' + i + '.q', q.q || '', { max: 300, span: 'sm:col-span-2' })}
                ${f('Trả lời', 'recruit.faq.' + i + '.a', q.a || '', { area: true, rows: 3, max: 1200, span: 'sm:col-span-2' })}`))}
            </div></div>

          <div class="card p-5"><h2 class="text-base font-extrabold text-navy-dark">Banner trang chủ</h2>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              ${f('Nhãn nhỏ phía trên', 'hero.badge', s.hero.badge, { max: 80 })}
              ${f('Tiêu đề lớn', 'hero.title', s.hero.title, { area: true, rows: 3, max: 300, span: 'sm:col-span-2' })}
              ${f('Mô tả ngắn', 'hero.subtitle', s.hero.subtitle, { area: true, rows: 2, max: 500, span: 'sm:col-span-2' })}
              ${s.hero.points.map((p, i) => html`
                ${f('Thông tin cốt lõi ' + (i + 1) + ' — tiêu đề', 'hero.points.' + i + '.label', p.label, { max: 80 })}
                ${f('Thông tin cốt lõi ' + (i + 1) + ' — nội dung', 'hero.points.' + i + '.value', p.value, { max: 200, hint: 'Để trống = tự lấy từ mục “Tuyển sinh học nghề” (khuyến nghị, để không bị lệch số).' })}`)}
              ${f('Nút 1 (→ trang Tuyển sinh học nghề)', 'hero.cta1', s.hero.cta1, { max: 60 })}
              ${f('Nút 2 (→ gọi số tư vấn; chưa có thì Zalo, rồi số của Trường)', 'hero.cta2', s.hero.cta2, { max: 60 })}
            </div></div>

          <div class="card p-5"><h2 class="text-base font-extrabold text-navy-dark">Giới thiệu & số liệu</h2>
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              ${f('Tiêu đề khối giới thiệu', 'about.title', s.about.title, { span: 'sm:col-span-2', max: 120 })}
              ${f('Nội dung giới thiệu (Markdown)', 'about.text', s.about.text, { area: true, rows: 6, max: 5000, span: 'sm:col-span-2' })}
              ${s.stats.map((st, i) => html`
                ${f('Số liệu ' + (i + 1) + ' — nhãn', 'stats.' + i + '.label', st.label, { max: 80 })}
                <div><label class="label" for="s-stats.${i}.value">Số liệu ${i + 1} — giá trị</label>
                  <input id="s-stats.${i}.value" name="stats.${i}.value" class="field" maxlength="40" value="${st.value}" ${st.auto ? raw('disabled') : ''}>
                  ${i === 0 || i === 2 ? html`<p class="hint">Để trống = tự đếm từ mục “Tuyển sinh học nghề”.</p>` : ''}
                  ${i === 1 ? html`<label class="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="stats.1.auto" data-input="stat-auto" class="h-4 w-4 rounded border-slate-300 text-brand" ${st.auto ? raw('checked') : ''}>
                    Tự đếm số tài liệu đính kèm đang hiển thị</label>` : ''}</div>`)}
            </div></div>

          <div class="sticky bottom-0 z-30 -mx-4 flex items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
            <button type="submit" class="btn btn-accent btn-lg">${icon('check', 'h-5 w-5')} Lưu cài đặt</button>
            <a href="#/admin" class="btn btn-outline btn-lg">Quay lại</a></div>
        </form>

        <div class="card mt-8 p-5"><h2 class="text-base font-extrabold text-navy-dark">Dữ liệu & sao lưu</h2>
          <p class="hint">Chế độ hiện tại: <strong>${demo ? 'DEMO (lưu trong trình duyệt)' : 'Firebase (Cloud Firestore)'}</strong>.</p>
          <div class="mt-4 flex flex-wrap gap-3">
            <button type="button" data-action="export-json" class="btn btn-outline">${icon('download', 'h-4 w-4')} Tải bản sao lưu (JSON)</button>
            <label class="btn btn-outline cursor-pointer">${icon('upload', 'h-4 w-4')} Nhập từ file JSON
              <input type="file" accept="application/json,.json" data-input="import-file" class="sr-only"></label>
            <button type="button" data-action="admin-seed" class="btn btn-outline">${demo ? 'Khôi phục dữ liệu mẫu ban đầu' : 'Nạp 6 bài mẫu vào Firestore'}</button>
          </div>
          <p class="hint mt-3">${demo
            ? 'Mẹo: tải bản sao lưu ở chế độ Demo rồi “Nhập từ file JSON” sau khi chuyển sang Firebase để mang bài đã soạn sang.'
            : 'Nhập JSON sẽ ghi đè các bài trùng ID; không xóa bài khác.'}</p>
        </div>`)
    };
  }

  function setPath(obj, path, val) {
    const keys = path.split('.');
    let o = obj;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) { o[k] = val; return; }
      if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    });
  }

  TT.inputs['stat-auto'] = (el) => {
    const v = document.getElementById('s-stats.1.value');
    if (v) v.disabled = el.checked;
  };

  TT.forms.settings = async (form) => {
    const out = {};
    Array.prototype.forEach.call(form.elements, (el) => {
      if (!el.name || el.type === 'submit') return;
      if (el.type === 'checkbox') setPath(out, el.name, el.checked);
      else setPath(out, el.name, el.value);
    });
    // ô giá trị bị khóa (disabled) không nằm trong dữ liệu → giữ nguyên giá trị cũ
    const cur = app().settings;
    if (out.stats && out.stats[1] && out.stats[1].value === undefined) out.stats[1].value = cur.stats[1].value;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try { await TT.Store.saveSettings(out); TT.toast('Đã lưu cài đặt.', 'success'); }
    catch (e) { fail(e); }
    finally { btn.disabled = false; }
  };

  TT.actions['export-json'] = async () => {
    try {
      const data = await TT.Store.exportAll();
      const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), posts: data.posts, settings: data.settings }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'to-toan-sao-luu-' + TT.dateInputValue(Date.now()) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      TT.toast('Đã tạo file sao lưu.', 'success');
    } catch (e) { fail(e); }
  };

  TT.inputs['import-file'] = async (el) => {
    const file = el.files && el.files[0];
    el.value = '';
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('File quá lớn (tối đa 8 MB).');
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.posts)) throw new Error('File không đúng định dạng sao lưu của website này.');
      if (!(await TT.confirm('Nhập ' + data.posts.length + ' bài viết từ file “' + file.name + '”?\nCác bài trùng ID sẽ bị ghi đè.', { title: 'Nhập từ file JSON?', okLabel: 'Nhập' }))) return;
      const n = await TT.Store.importAll({ posts: data.posts, settings: data.settings });
      TT.toast('Đã nhập ' + n + ' bài viết.', 'success');
    } catch (e) { fail(e instanceof SyntaxError ? new Error('File JSON bị lỗi, không đọc được.') : e); }
  };

  /* =====================================================================
   * Điểm vào
   * =================================================================== */
  TT.admin = {
    view(route) {
      if (!app().isAdmin) return loginView();
      switch (route.name) {
        case 'admin-new': return editorView('');
        case 'admin-edit': return editorView(route.id);
        case 'admin-settings': return settingsView();
        default: return listView();
      }
    },
    // các view mà dữ liệu thay đổi KHÔNG được vẽ lại (tránh mất chữ đang gõ)
    isStatic(route) {
      return !app().isAdmin || route.name === 'admin-new' || route.name === 'admin-edit' || route.name === 'admin-settings';
    }
  };
})();
