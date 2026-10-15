/*
 * markdown.js — Markdown rút gọn + công thức KaTeX, AN TOÀN theo thiết kế.
 *
 * Nguyên tắc: không bao giờ chèn HTML thô của người dùng.
 *  - Mọi văn bản đi qua esc() trước khi gắn thẻ.
 *  - URL của liên kết / ảnh chỉ nhận http(s), mailto, tel hoặc đường dẫn tương đối.
 *  - Công thức do KaTeX dựng (trust:false), phần còn lại chỉ là thẻ do code này sinh ra.
 *
 * Cú pháp hỗ trợ: # tiêu đề, **đậm**, *nghiêng*, ~~gạch~~, `mã`, ``` khối mã ```,
 * danh sách (lồng nhau được), > trích dẫn, ---, bảng |a|b|, [chữ](link), ![ảnh](link),
 * $công thức dòng$ và $$công thức khối$$. Dùng \$ để viết ký hiệu đô la.
 */
(function () {
  'use strict';
  const TT = window.TT;
  const { esc, safeUrl, safeLinkUrl } = TT;

  // Ký tự vùng riêng (private use) làm "chỗ giữ" cho HTML đã dựng sẵn
  const IN_OPEN = '', IN_CLOSE = '';
  const BL_OPEN = '', BL_CLOSE = '';
  const DOLLAR = '\u0001';
  const HAS_TOKEN = /[]\d+[]/;
  const TOKEN_RE = /[](\d+)[]/g;

  function mathHtml(tex, display) {
    const src = String(tex).trim();
    if (!src) return '';
    if (window.katex) {
      try {
        return window.katex.renderToString(src, {
          displayMode: display,
          throwOnError: false,
          strict: 'ignore',
          trust: false,
          macros: { '\\R': '\\mathbb{R}', '\\N': '\\mathbb{N}', '\\Z': '\\mathbb{Z}', '\\Q': '\\mathbb{Q}', '\\C': '\\mathbb{C}' }
        });
      } catch (e) { /* rơi xuống bản dự phòng */ }
    }
    return '<code class="math-fallback">' + esc(src) + '</code>';
  }

  function createStash() {
    const items = [];
    return {
      inline(h) { items.push(h); return IN_OPEN + (items.length - 1) + IN_CLOSE; },
      block(h) { items.push(h); return BL_OPEN + (items.length - 1) + BL_CLOSE; },
      restore(s) {
        // lặp vài lượt vì chỗ giữ có thể lồng nhau (liên kết chứa công thức)
        for (let n = 0; n < 8 && HAS_TOKEN.test(s); n++) {
          s = s.replace(TOKEN_RE, (_, i) => items[Number(i)] || '');
        }
        return s;
      }
    };
  }

  /* ----------------------------- inline ----------------------------- */
  const IMG_RE = /!\[([^\]\n]*)\]\(\s*([^)\s]+)(?:\s+"[^"\n]*")?\s*\)/g;
  const LINK_RE = /\[([^\]\n]+)\]\(\s*([^)\s]+)(?:\s+"[^"\n]*")?\s*\)/g;
  const AUTOLINK_RE = /(^|[\s(>])(https?:\/\/[^\s<>"'`-]+)/g;

  // Nhận chuỗi ĐÃ escape
  function emphasis(s) {
    return s
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
      .replace(/\*(?=\S)([^*\n]*?\S)\*/g, '<em>$1</em>')
      .replace(/(^|[^\w])_(?=\S)([^_\n]*?\S)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
  }

  function inline(src, stash) {
    let s = src;

    s = s.replace(IMG_RE, (m, alt, url) => {
      const u = safeUrl(url);
      return u
        ? stash.inline('<img src="' + esc(u) + '" alt="' + esc(alt) + '" loading="lazy" referrerpolicy="no-referrer">')
        : alt;
    });

    s = s.replace(LINK_RE, (m, text, url) => {
      const u = safeLinkUrl(url);
      if (!u) return text;
      const external = /^https?:/i.test(u);
      return stash.inline('<a href="' + esc(u) + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + emphasis(esc(text)) + '</a>');
    });

    s = s.replace(AUTOLINK_RE, (m, pre, url) => {
      let trail = '';
      while (/[.,;:!?)\]]$/.test(url)) { trail = url.slice(-1) + trail; url = url.slice(0, -1); }
      const u = safeUrl(url);
      if (!u) return m;
      return pre + stash.inline('<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>') + trail;
    });

    s = esc(s).replace(/\u0001/g, '$');
    s = emphasis(s);
    return s.replace(/\n/g, '<br>');
  }

  /* ----------------------------- block ------------------------------ */
  const RE = {
    blank: /^\s*$/,
    heading: /^\s{0,3}(#{1,4})\s+(.*?)(?:\s+#+)?\s*$/,
    hr: /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/,
    quote: /^\s{0,3}>\s?(.*)$/,
    list: /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/,
    block: /^(\d+)$/,
    tableSep: /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/
  };

  const indentOf = (l) => l.replace(/\t/g, '    ').match(/^ */)[0].length;
  const joinBlocks = (bl) => bl.map((b) => (b.t === 'p' ? '<p>' + b.html + '</p>' : b.html)).join('\n');

  function startsBlock(lines, i) {
    const l = lines[i];
    return RE.heading.test(l) || RE.hr.test(l) || RE.quote.test(l) || RE.list.test(l) ||
      RE.block.test(l.trim()) || isTableStart(lines, i);
  }
  function isTableStart(lines, i) {
    return lines[i].includes('|') && i + 1 < lines.length &&
      lines[i + 1].includes('|') && RE.tableSep.test(lines[i + 1]);
  }

  function splitRow(line) {
    let r = line.trim();
    if (r[0] === '|') r = r.slice(1);
    if (r.endsWith('|') && r[r.length - 2] !== '\\') r = r.slice(0, -1);
    const cells = [];
    let cur = '';
    for (let i = 0; i < r.length; i++) {
      const c = r[i];
      if (c === '\\' && r[i + 1] === '|') { cur += '|'; i++; }
      else if (c === '|') { cells.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  }

  function table(lines, i, stash, out) {
    const head = splitRow(lines[i]);
    const aligns = splitRow(lines[i + 1]).map((c) => {
      const l = c.startsWith(':'), r = c.endsWith(':');
      return l && r ? 'center' : r ? 'right' : l ? 'left' : '';
    });
    i += 2;
    const rows = [];
    while (i < lines.length && !RE.blank.test(lines[i]) && lines[i].includes('|')) {
      rows.push(splitRow(lines[i]));
      i++;
    }
    const cell = (tag, txt, k) =>
      '<' + tag + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(txt || '', stash) + '</' + tag + '>';
    const n = head.length;
    const thead = '<thead><tr>' + head.map((c, k) => cell('th', c, k)).join('') + '</tr></thead>';
    const tbody = '<tbody>' + rows.map((r) => {
      const cells = [];
      for (let k = 0; k < n; k++) cells.push(cell('td', r[k], k));
      return '<tr>' + cells.join('') + '</tr>';
    }).join('') + '</tbody>';
    out.push({ t: 'table', html: '<div class="table-wrap"><table>' + thead + tbody + '</table></div>' });
    return i;
  }

  function list(lines, i, stash, out) {
    const first = RE.list.exec(lines[i]);
    const base = indentOf(lines[i]);
    const ordered = /\d/.test(first[2]);
    const start = ordered ? parseInt(first[2], 10) : 1;
    const items = [];
    let cur = null;

    while (i < lines.length) {
      const line = lines[i];

      if (RE.blank.test(line)) {
        // dòng trống: danh sách chỉ tiếp tục nếu dòng kế là mục cùng cấp hoặc thụt lề
        let j = i + 1;
        while (j < lines.length && RE.blank.test(lines[j])) j++;
        if (j >= lines.length) break;
        const m2 = RE.list.exec(lines[j]);
        const ind2 = indentOf(lines[j]);
        const continues = ind2 >= base + 2 ||
          (m2 && ind2 < base + 2 && /\d/.test(m2[2]) === ordered);
        if (!continues) break;
        if (cur) cur.lines.push('');
        i = j;
        continue;
      }

      const m = RE.list.exec(line);
      const ind = indentOf(line);

      if (m && ind < base + 2) {
        if (/\d/.test(m[2]) !== ordered) break;            // đổi kiểu danh sách → kết thúc
        cur = { lines: [m[3]] };
        items.push(cur);
      } else if (ind >= base + 2) {
        if (!cur) break;
        cur.lines.push(line.replace(new RegExp('^ {0,' + (base + 2) + '}'), '').replace(/^\t/, ''));
      } else if (cur && !RE.blank.test(lines[i - 1] || '') && !startsBlock(lines, i)) {
        cur.lines.push(line.trim());                        // dòng nối tiếp (lazy)
      } else {
        break;
      }
      i++;
    }

    const tag = ordered ? 'ol' : 'ul';
    const startAttr = ordered && start !== 1 ? ' start="' + start + '"' : '';
    const lis = items.map((it) => {
      const bl = blocks(it.lines, stash);
      const body = bl.map((b, k) => (b.t === 'p' && k === 0 ? b.html : (b.t === 'p' ? '<p>' + b.html + '</p>' : b.html))).join('\n');
      return '<li>' + body + '</li>';
    }).join('');
    out.push({ t: 'list', html: '<' + tag + startAttr + '>' + lis + '</' + tag + '>' });
    return i;
  }

  function blocks(lines, stash) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (RE.blank.test(line)) { i++; continue; }

      if (RE.block.test(line.trim())) { out.push({ t: 'raw', html: line.trim() }); i++; continue; }

      let m = RE.heading.exec(line);
      if (m) {
        const lv = Math.max(2, Math.min(4, m[1].length));
        out.push({ t: 'h', html: '<h' + lv + '>' + inline(m[2], stash) + '</h' + lv + '>' });
        i++;
        continue;
      }

      if (RE.hr.test(line)) { out.push({ t: 'hr', html: '<hr>' }); i++; continue; }

      if (RE.quote.test(line)) {
        const buf = [];
        while (i < lines.length && RE.quote.test(lines[i])) { buf.push(RE.quote.exec(lines[i])[1]); i++; }
        out.push({ t: 'q', html: '<blockquote>' + joinBlocks(blocks(buf, stash)) + '</blockquote>' });
        continue;
      }

      if (RE.list.test(line)) { i = list(lines, i, stash, out); continue; }

      if (isTableStart(lines, i)) { i = table(lines, i, stash, out); continue; }

      const buf = [line];
      i++;
      while (i < lines.length && !RE.blank.test(lines[i]) && !startsBlock(lines, i)) { buf.push(lines[i]); i++; }
      out.push({ t: 'p', html: inline(buf.join('\n'), stash) });
    }
    return out;
  }

  /* ----------------------------- public ----------------------------- */
  function render(text) {
    if (!text) return '';
    const stash = createStash();
    let s = String(text).replace(/\r\n?/g, '\n').replace(/[-\u0001]/g, '');

    // 1) khối mã
    s = s.replace(/^[ \t]*```[^\n]*\n([\s\S]*?)\n?[ \t]*```[ \t]*$/gm,
      (m, code) => '\n' + stash.block('<pre><code>' + esc(code) + '</code></pre>') + '\n');
    // 2) \$ → ký hiệu đô la thường
    s = s.replace(/\\\$/g, DOLLAR);
    // 3) mã trong dòng
    s = s.replace(/`([^`\n]+)`/g, (m, c) => stash.inline('<code>' + esc(c) + '</code>'));
    // 4) công thức khối $$...$$
    s = s.replace(/\$\$([\s\S]+?)\$\$/g,
      (m, t) => '\n' + stash.block('<div class="math-block">' + mathHtml(t, true) + '</div>') + '\n');
    // 5) công thức dòng $...$ (sau $ mở và trước $ đóng không được là khoảng trắng; $ đóng không đứng trước chữ số)
    s = s.replace(/\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\d)/g, (m, t) => stash.inline(mathHtml(t, false)));

    return stash.restore(joinBlocks(blocks(s.split('\n'), stash)));
  }

  // Đoạn trích văn bản thuần (bỏ Markdown, bỏ đoạn chứa công thức) cho thẻ bài viết
  function excerpt(content, n) {
    n = n || 160;
    const text = String(content || '').replace(/\r\n?/g, '\n').replace(/```[\s\S]*?```/g, '\n');
    const paras = text.split(/\n\s*\n/);
    for (let k = 0; k < paras.length; k++) {
      let p = paras[k].trim();
      if (!p || /^(#{1,6}\s|>|\||[-*_]{3,}\s*$)/.test(p) || p.indexOf('$') !== -1) continue;
      p = p.replace(/^(?:[-*+]|\d+[.)])\s+/gm, '')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*_~`]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!p) continue;
      return p.length > n ? p.slice(0, n).replace(/\s+\S*$/, '') + '…' : p;
    }
    return '';
  }

  TT.md = { render: render, excerpt: excerpt };
})();
