/*
 * recruit.js — trang "Tuyển sinh học nghề" (#/hoc-nghe) và khối giới thiệu nhanh ở trang chủ.
 *
 * Mọi số liệu lấy từ settings.recruit (xem DEFAULT_SETTINGS.recruit trong data.js) — MỘT nguồn dữ liệu,
 * sửa trong Quản trị → Cài đặt. Trang luôn ghi rõ nguồn (thông báo nào, ngày nào) để người đọc tự kiểm chứng.
 *
 * Website là KÊNH THÔNG TIN: không nhận hồ sơ, không thu dữ liệu cá nhân. Mọi nút kêu gọi đều dẫn tới
 * cuộc gọi / Zalo / số của Trường; việc nộp hồ sơ và nhập học do Trường tiếp nhận.
 */
(function () {
  'use strict';
  const TT = window.TT;
  const { html, raw, icon } = TT;
  const V = TT.views;
  const app = () => TT.app;

  TT.actions = TT.actions || {};

  /* ----------------------------- Liên hệ ----------------------------- */
  // Hai số, dán nhãn rõ: số Tổ GDTX (tư vấn) và số ghi trên thông báo của Trường
  function contactCard(s, id) {
    const c = TT.contactInfo(s);
    const who = c.advisor ? c.advisor + ' (Tổ GDTX)' : 'Tổ GDTX';
    const none = !c.hotline && !c.zalo && !c.officialPhone;
    return html`<section class="card border-l-4 border-accent p-5" aria-labelledby="${id}">
      <h2 id="${id}" class="text-lg font-extrabold text-navy-dark">Cần tư vấn? Gọi hoặc nhắn trước khi đến</h2>
      <p class="mt-1 text-sm text-slate-600">Hồ sơ và việc nhập học do <strong>Trường</strong> tiếp nhận tại các phân hiệu. Tổ GDTX giúp bạn hiểu rõ điều kiện, hồ sơ và đường đi trước khi đến.</p>
      ${none ? html`<p class="mt-3 text-sm text-slate-500">Thông tin liên hệ đang được cập nhật.</p>` : html`<div class="mt-4 grid gap-3 sm:grid-cols-2">
        ${c.hotline ? html`<a href="${c.hotlineTel}" class="btn btn-accent btn-lg">${icon('phone', 'h-5 w-5')} Gọi ${who}: ${c.hotline}</a>` : ''}
        ${c.zalo ? html`<a href="${c.zalo}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-lg">${icon('chat', 'h-5 w-5')} Nhắn Zalo cho ${who}</a>` : ''}
        ${c.officialPhone ? html`<a href="${c.officialTel}" class="btn btn-outline-navy btn-lg sm:col-span-2">${icon('phone', 'h-5 w-5')} ${c.officialName}: ${c.officialPhone}</a>` : ''}
      </div>`}
      ${none && app().isAdmin ? html`<p class="mt-2 text-sm"><a href="#/admin/cai-dat" class="font-semibold text-brand underline">Nhập số điện thoại / Zalo trong Quản trị → Cài đặt</a></p>` : ''}
    </section>`;
  }

  /* ----------------------------- Khối nội dung ----------------------------- */
  function sectionHead(id, kicker, title) {
    return html`<div class="mb-5">
      <p class="text-sm font-bold uppercase tracking-wider text-accent-dark">${kicker}</p>
      <h2 id="${id}" class="mt-1 text-2xl font-extrabold text-navy-dark">${title}</h2></div>`;
  }

  function checkList(items, cls) {
    return html`<ul class="${cls || 'space-y-2.5'} text-slate-700">${items.map((t) => html`<li class="flex items-start gap-2.5">
      <span class="mt-1 shrink-0 text-accent-dark">${icon('check', 'h-4 w-4')}</span><span>${t}</span></li>`)}</ul>`;
  }

  function programs(r) {
    if (!r.programs.length) return '';
    return html`<section id="sec-nganh" class="scroll-mt-24" aria-labelledby="h-nganh" data-reveal>
      ${sectionHead('h-nganh', 'Ngành nghề tuyển sinh', 'Chọn nghề phù hợp với trình độ của bạn')}
      <div class="grid gap-5 md:grid-cols-2">
        ${r.programs.map((p) => html`<article class="card flex flex-col p-5">
          ${p.level ? html`<span class="inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-navy-dark">${p.level}</span>` : ''}
          <h3 class="mt-3 text-lg font-extrabold text-navy-dark">${p.name}</h3>
          ${p.require ? html`<p class="mt-2 text-sm text-slate-600"><span class="font-semibold text-slate-800">Trình độ yêu cầu:</span> ${p.require}</p>` : ''}
          <dl class="mt-4 grid grid-cols-2 gap-3 text-center">
            <div class="rounded-lg bg-navy-light/60 p-3"><dt class="text-xs font-bold uppercase tracking-wide text-navy">Học tại trường</dt>
              <dd class="mt-1 text-lg font-extrabold text-navy-dark">${p.train || '—'}</dd></div>
            <div class="rounded-lg bg-accent-light p-3"><dt class="text-xs font-bold uppercase tracking-wide text-accent-dark">Thực tập sản xuất</dt>
              <dd class="mt-1 text-lg font-extrabold text-navy-dark">${p.practice || '—'}</dd></div>
          </dl></article>`)}
      </div></section>`;
  }

  function eligibility(r) {
    if (!r.eligibility) return '';
    return html`<section class="rounded-xl border border-accent/40 bg-accent-light p-5" aria-labelledby="h-doituong" data-reveal>
      <h2 id="h-doituong" class="flex items-center gap-2 text-lg font-extrabold text-navy-dark">${icon('target', 'h-5 w-5 text-accent-dark')} Đối tượng tuyển sinh</h2>
      <p class="mt-2 text-base font-semibold text-slate-800">${r.eligibility}</p></section>`;
  }

  function benefits(r) {
    if (!r.learnBenefits.length && !r.workBenefits.length) return '';
    const col = (title, ic, items) => items.length ? html`<div class="card p-5">
      <h3 class="flex items-center gap-2 text-lg font-extrabold text-navy-dark"><span class="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-white">${icon(ic, 'h-5 w-5')}</span>${title}</h3>
      <div class="mt-4">${checkList(items)}</div></div>` : '';
    return html`<section id="sec-quyenloi" class="scroll-mt-24" aria-labelledby="h-quyenloi" data-reveal>
      ${sectionHead('h-quyenloi', 'Quyền lợi', 'Theo thông báo của Trường')}
      <div class="grid gap-5 lg:grid-cols-2">${col('Khi đi học nghề', 'cap', r.learnBenefits)}${col('Khi đi làm', 'layers', r.workBenefits)}</div></section>`;
  }

  function steps(r, compact) {
    if (!r.steps.length) return '';
    return html`<ol class="${compact ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-1' : 'space-y-4'}">${r.steps.map((t, i) => html`<li class="flex items-start gap-3">
      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-extrabold text-white" aria-hidden="true">${i + 1}</span>
      <span class="pt-1 text-slate-700"><span class="sr-only">Bước ${i + 1}: </span>${t}</span></li>`)}</ol>`;
  }

  function stepsSection(r) {
    if (!r.steps.length) return '';
    return html`<section id="sec-lotrinh" class="scroll-mt-24" aria-labelledby="h-lotrinh" data-reveal>
      ${sectionHead('h-lotrinh', 'Lộ trình', 'Từ lúc liên hệ đến khi đi làm')}
      <div class="card p-5">${steps(r, false)}</div></section>`;
  }

  function documents(r) {
    if (!r.documents.length) return '';
    return html`<section id="sec-hoso" class="scroll-mt-24" aria-labelledby="h-hoso" data-reveal>
      ${sectionHead('h-hoso', 'Hồ sơ', 'Danh sách giấy tờ cần chuẩn bị')}
      <div class="card p-5">
        <p class="text-sm text-slate-600">Đánh dấu từng mục khi đã chuẩn bị xong. Danh sách chỉ dùng để bạn tự theo dõi, <strong>không được lưu</strong> và không gửi đi đâu.</p>
        <ul class="mt-4 space-y-1">${r.documents.map((t, i) => html`<li>
          <label class="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50" for="doc-${i}">
            <input id="doc-${i}" type="checkbox" class="mt-1 h-5 w-5 shrink-0 rounded border-slate-400 text-brand"><span class="text-slate-800">${t}</span></label></li>`)}</ul>
        ${r.documentsNote ? html`<p class="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">${r.documentsNote}</p>` : ''}
        <div class="no-print mt-4"><button type="button" data-action="print-docs" class="btn btn-outline">In danh sách hồ sơ</button></div>
      </div></section>`;
  }

  function branches(r, s) {
    if (!r.branches.length) return '';
    const c = TT.contactInfo(s);
    const tel = c.officialTel || c.hotlineTel;
    return html`<section id="sec-phanhieu" class="scroll-mt-24" aria-labelledby="h-phanhieu" data-reveal>
      ${sectionHead('h-phanhieu', 'Địa điểm', 'Phân hiệu tiếp nhận — chọn nơi gần bạn')}
      <div class="grid gap-5 sm:grid-cols-2">${r.branches.map((b) => html`<article class="card flex flex-col p-5">
        <h3 class="flex items-center gap-2 text-lg font-extrabold text-navy-dark"><span class="text-accent-dark">${icon('pin', 'h-5 w-5')}</span>${b.name}</h3>
        ${b.address ? html`<p class="mt-2 flex-1 text-slate-700">${b.address}</p>` : html`<div class="flex-1"></div>`}
        <div class="mt-4 flex flex-wrap gap-2">
          ${b.map ? html`<a href="${b.map}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-navy btn-sm">${icon('external', 'h-4 w-4')} Chỉ đường (Google Maps)<span class="sr-only"> — ${b.name}</span></a>` : ''}
          ${tel ? html`<a href="${tel}" class="btn btn-outline btn-sm">${icon('phone', 'h-4 w-4')} Gọi<span class="sr-only"> — ${b.name}</span></a>` : ''}
        </div></article>`)}</div></section>`;
  }

  function faq(r) {
    if (!r.faq.length) return '';
    return html`<section id="sec-hoidap" class="scroll-mt-24" aria-labelledby="h-hoidap" data-reveal>
      ${sectionHead('h-hoidap', 'Hỏi đáp', 'Những câu ứng viên và phụ huynh hay hỏi')}
      <div class="space-y-3">${r.faq.map((f) => html`<details class="card group p-0">
        <summary class="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-bold text-navy-dark">
          <span>${f.q}</span><span class="shrink-0 text-slate-400 transition-transform group-open:rotate-180">${icon('chevronDown', 'h-5 w-5')}</span></summary>
        <div class="border-t border-slate-100 px-5 py-4 text-slate-700">${f.a}</div></details>`)}</div></section>`;
  }

  // Dòng nguồn: người đọc luôn biết thông tin lấy từ đâu và đã được đối chiếu chưa
  function sourceNote(r) {
    return html`<p class="mb-5 rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
      <strong class="text-slate-800">Nguồn:</strong> ${r.source}.
      ${r.checked ? html` Đã đối chiếu với Trường ngày ${r.checked}.` : ''}
      Website này là kênh thông tin của Tổ GDTX; hồ sơ và nhập học do Trường tiếp nhận. Nếu có khác biệt, hãy theo hướng dẫn của Trường.</p>`;
  }

  function tocNav(r) {
    const items = [
      r.programs.length && ['sec-nganh', 'Ngành nghề'],
      (r.learnBenefits.length || r.workBenefits.length) && ['sec-quyenloi', 'Quyền lợi'],
      r.steps.length && ['sec-lotrinh', 'Lộ trình'],
      r.documents.length && ['sec-hoso', 'Hồ sơ'],
      r.branches.length && ['sec-phanhieu', 'Phân hiệu'],
      r.faq.length && ['sec-hoidap', 'Hỏi đáp']
    ].filter(Boolean);
    return html`<nav class="no-print no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Nhảy tới mục">
      ${items.map((it) => html`<button type="button" data-action="scroll-to" data-target="${it[0]}"
        class="inline-flex shrink-0 items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">${it[1]}</button>`)}</nav>`;
  }

  /* ----------------------------- Trang đầy đủ ----------------------------- */
  function recruitView() {
    const s = app().settings;
    const r = s.recruit;
    return {
      title: 'Tuyển sinh học nghề mỏ hầm lò — Trường Cao đẳng Than - Khoáng sản Việt Nam',
      body: html`${V.parts.pageHead('Tuyển sinh học nghề', 'Ngành nghề, điều kiện, quyền lợi, hồ sơ và địa điểm — theo thông báo của Trường Cao đẳng Than - Khoáng sản Việt Nam')}
        <section class="container-x py-8">
          ${V.parts.breadcrumb([{ label: 'Trang chủ', href: '#/' }, { label: 'Tuyển sinh học nghề' }])}
          ${sourceNote(r)}
          ${contactCard(s, 'h-lienhe-top')}
          <div class="mt-6">${tocNav(r)}</div>
          <div class="space-y-10">
            ${eligibility(r)}${programs(r)}${benefits(r)}${stepsSection(r)}${documents(r)}${branches(r, s)}${faq(r)}
            ${contactCard(s, 'h-lienhe-bottom')}
          </div>
        </section>`
    };
  }

  /* ----------------------------- Khối giới thiệu nhanh ở trang chủ ----------------------------- */
  function recruitTeaser(s) {
    const r = s.recruit;
    return html`<section class="bg-white" aria-labelledby="h-teaser">
      <div class="container-x grid gap-8 py-12 lg:grid-cols-5">
        <div class="lg:col-span-3" data-reveal="left">
          <p class="text-sm font-bold uppercase tracking-wider text-accent-dark">Học nghề — đi làm</p>
          <h2 id="h-teaser" class="mt-1 text-2xl font-extrabold text-navy-dark md:text-3xl">Từ liên hệ đến khi đi làm, chỉ 5 bước</h2>
          <div class="mt-5">${steps(r, true)}</div>
          <div class="mt-6 flex flex-wrap gap-3">
            <a href="#/hoc-nghe" class="btn btn-accent btn-lg">${icon('clipboard', 'h-5 w-5')} Xem điều kiện & hồ sơ ${icon('arrowRight', 'nudge h-4 w-4')}</a>
          </div>
        </div>
        <div class="lg:col-span-2" data-reveal="right">${contactCard(s, 'h-lienhe-home')}</div>
      </div></section>`;
  }

  /* ----------------------------- Hành động ----------------------------- */
  TT.actions['scroll-to'] = (el) => {
    const t = document.getElementById(el.dataset.target);
    if (!t) return;
    const smooth = !!(TT.motion && TT.motion.isOn());
    t.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };
  TT.actions['print-docs'] = () => { window.print(); };

  V.recruit = recruitView;
  V.recruitTeaser = recruitTeaser;
  V.parts.contactCard = contactCard;
})();
