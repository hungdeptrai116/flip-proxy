/*
 * data.js — chuyên mục, nhóm trang, cài đặt mặc định và dữ liệu DEMO.
 *
 * Mọi số liệu / thông tin liên hệ trong DEMO chỉ là DỮ LIỆU MẪU để xem giao diện.
 * Ở chế độ Firebase, giá trị mặc định (DEFAULT_SETTINGS) KHÔNG chứa số liệu bịa:
 * mục nào chưa nhập sẽ hiện "—" hoặc bị ẩn.
 */
(function () {
  'use strict';
  const TT = window.TT;

  /* ----------------------------- Chuyên mục ----------------------------- */
  // Lớp màu viết nguyên văn để Tailwind quét được khi build
  TT.CATS = {
    'tuyen-sinh': { id: 'tuyen-sinh', name: 'Thông tin tuyển sinh', tab: 'Thông tin Tuyển sinh', badge: 'bg-navy text-white', cover: 'assets/covers/tuyen-sinh.svg' },
    'de-cuong-10': { id: 'de-cuong-10', name: 'Đề cương vào 10', tab: 'Đề cương vào 10', badge: 'bg-accent text-navy-dark', cover: 'assets/covers/de-cuong-10.svg' },
    'de-cuong-k10': { id: 'de-cuong-k10', name: 'Đề cương Khối 10', tab: 'Đề cương Khối 10', badge: 'bg-brand text-white', cover: 'assets/covers/de-cuong-k10.svg' },
    'de-cuong-k11': { id: 'de-cuong-k11', name: 'Đề cương Khối 11', tab: 'Đề cương Khối 11', badge: 'bg-indigo-600 text-white', cover: 'assets/covers/de-cuong-k11.svg' },
    'de-cuong-k12': { id: 'de-cuong-k12', name: 'Đề cương Khối 12', tab: 'Đề cương Khối 12', badge: 'bg-sky-700 text-white', cover: 'assets/covers/de-cuong-k12.svg' },
    'tin-tuc': { id: 'tin-tuc', name: 'Tin tức & Hoạt động', tab: 'Tin tức', badge: 'bg-slate-700 text-white', cover: 'assets/covers/tin-tuc.svg' }
  };
  TT.CAT_ORDER = ['tuyen-sinh', 'de-cuong-10', 'de-cuong-k10', 'de-cuong-k11', 'de-cuong-k12', 'tin-tuc'];

  // Các tab lọc ở trang chủ (đúng thứ tự theo yêu cầu)
  TT.HOME_TABS = [
    { id: 'all', label: 'Tất cả', cats: null },
    { id: 'tuyen-sinh', label: 'Thông tin Tuyển sinh', cats: ['tuyen-sinh'] },
    { id: 'de-cuong-10', label: 'Đề cương vào 10', cats: ['de-cuong-10'] },
    { id: 'de-cuong-k10', label: 'Đề cương Khối 10', cats: ['de-cuong-k10'] },
    { id: 'de-cuong-k11', label: 'Đề cương Khối 11', cats: ['de-cuong-k11'] },
    { id: 'de-cuong-k12', label: 'Đề cương Khối 12', cats: ['de-cuong-k12'] }
  ];

  // Trang chuyên mục: #/muc/<khóa>
  TT.GROUPS = {
    'tuyen-sinh': {
      title: 'Thông tin Tuyển sinh',
      desc: 'Quy chế, chỉ tiêu, điều kiện, lịch thi và cấu trúc đề tuyển sinh vào lớp 10.',
      cats: ['tuyen-sinh']
    },
    'de-cuong': {
      title: 'Đề cương Ôn tập',
      desc: 'Tổng hợp đề cương ôn tập môn Toán: tuyển sinh vào 10 và các khối 10 - 11 - 12.',
      cats: ['de-cuong-10', 'de-cuong-k10', 'de-cuong-k11', 'de-cuong-k12']
    },
    'de-cuong-10': {
      title: 'Đề cương Ôn tập Tuyển sinh vào 10',
      desc: 'Tổng hợp chuyên đề Đại số, Hình học và Toán thực tế ôn thi vào lớp 10.',
      cats: ['de-cuong-10']
    },
    'de-cuong-thpt': {
      title: 'Đề cương Ôn tập Khối 10 - 11 - 12',
      desc: 'Đề cương giữa kỳ, cuối kỳ và ôn thi Tốt nghiệp THPT.',
      cats: ['de-cuong-k10', 'de-cuong-k11', 'de-cuong-k12']
    },
    'tin-tuc': {
      title: 'Tin tức & Hoạt động',
      desc: 'Hoạt động chuyên môn và thông báo chung của Tổ Toán.',
      cats: ['tin-tuc']
    }
  };

  /* ----------------------------- Cài đặt mặc định ----------------------------- */
  TT.DEFAULT_SETTINGS = {
    schoolName: 'Trường Cao đẳng Than - Khoáng sản Việt Nam',
    hotline: '',
    email: '',
    address: '',
    zalo: '',
    defaultAuthor: 'Admin Tổ Toán',
    hero: {
      badge: 'Năm học 2026 - 2027',
      title: 'CỔNG THÔNG TIN TUYỂN SINH VÀO LỚP 10 & ĐỀ CƯƠNG ÔN TẬP MÔN TOÁN NĂM HỌC 2026 - 2027',
      subtitle: 'Nơi đăng tải thông báo tuyển sinh, đề cương ôn tập và tài liệu của Tổ Toán — xem trực tiếp trên điện thoại, tải về dưới dạng PDF.',
      points: [
        { label: 'Lịch thi dự kiến', value: 'Cập nhật theo thông báo chính thức' },
        { label: 'Cấu trúc đề minh họa', value: 'Xem đề minh họa trong mục Đề cương' },
        { label: 'Định hướng học tập', value: 'Ôn theo chuyên đề: Đại số - Hình học - Toán thực tế' }
      ],
      cta1: 'Xem Thông Báo Tuyển Sinh',
      cta2: 'Tải Đề Cương Ôn Tập'
    },
    about: {
      title: 'Giới thiệu về Tổ Toán',
      text: 'Tổ Toán phụ trách giảng dạy môn Toán, tổ chức ôn tập và hỗ trợ công tác tuyển sinh của nhà trường.\n\n' +
        'Website này là nơi đăng tải **thông báo chính thức** và **đề cương ôn tập** để học sinh, phụ huynh tra cứu nhanh, ' +
        'xem trực tiếp và tải về khi cần.'
    },
    stats: [
      { label: 'Giáo viên trong tổ', value: '—', auto: false },
      { label: 'Đề cương & chuyên đề đã phát hành', value: '', auto: true },
      { label: 'Tỷ lệ đỗ / Điểm trung bình', value: '—', auto: false },
      { label: 'Năm truyền thống', value: '—', auto: false }
    ],
    footerNote: ''
  };

  // Giá trị mẫu chỉ dùng cho DEMO
  TT.DEMO_SETTINGS = {
    hotline: '0900 000 000',
    email: 'totoan@example.edu.vn',
    address: '[Địa chỉ nhà trường — cập nhật trong trang Quản trị]',
    zalo: 'https://zalo.me/0900000000',
    stats: [
      { value: '12' }, { auto: true }, { value: '7,5' }, { value: '25' }
    ]
  };

  const STR_LIMIT = 400;
  const clipStr = (v, d, n) => (typeof v === 'string' ? TT.clip(v, n || STR_LIMIT) : d);

  // Làm sạch + gộp với mặc định (dùng cho cả dữ liệu đọc về lẫn dữ liệu sắp lưu)
  TT.mergeSettings = function (remote) {
    const d = TT.DEFAULT_SETTINGS;
    const r = remote && typeof remote === 'object' ? remote : {};
    const rh = r.hero && typeof r.hero === 'object' ? r.hero : {};
    const ra = r.about && typeof r.about === 'object' ? r.about : {};
    const rp = Array.isArray(rh.points) ? rh.points : [];
    const rs = Array.isArray(r.stats) ? r.stats : [];
    return {
      schoolName: clipStr(r.schoolName, d.schoolName, 200),
      hotline: clipStr(r.hotline, d.hotline, 40),
      email: clipStr(r.email, d.email, 120),
      address: clipStr(r.address, d.address, 300),
      zalo: TT.safeUrl(r.zalo) || (typeof r.zalo === 'string' ? '' : d.zalo),
      defaultAuthor: clipStr(r.defaultAuthor, d.defaultAuthor, 120),
      hero: {
        badge: clipStr(rh.badge, d.hero.badge, 80),
        title: clipStr(rh.title, d.hero.title, 300),
        subtitle: clipStr(rh.subtitle, d.hero.subtitle, 500),
        points: d.hero.points.map((p, i) => ({
          label: clipStr((rp[i] || {}).label, p.label, 80),
          value: clipStr((rp[i] || {}).value, p.value, 200)
        })),
        cta1: clipStr(rh.cta1, d.hero.cta1, 60),
        cta2: clipStr(rh.cta2, d.hero.cta2, 60)
      },
      about: {
        title: clipStr(ra.title, d.about.title, 120),
        text: clipStr(ra.text, d.about.text, 5000)
      },
      stats: d.stats.map((s, i) => ({
        label: clipStr((rs[i] || {}).label, s.label, 80),
        value: clipStr((rs[i] || {}).value, s.value, 40),
        auto: i === 1 ? ((rs[i] || {}).auto === undefined ? s.auto : (rs[i] || {}).auto === true) : false
      })),
      footerNote: clipStr(r.footerNote, d.footerNote, 300)
    };
  };

  // Cài đặt khởi tạo cho DEMO = mặc định + giá trị mẫu
  TT.demoSettings = function () {
    const base = TT.mergeSettings({});
    const p = TT.DEMO_SETTINGS;
    base.hotline = p.hotline;
    base.email = p.email;
    base.address = p.address;
    base.zalo = p.zalo;
    p.stats.forEach((s, i) => {
      if (s.value !== undefined) base.stats[i].value = s.value;
    });
    return base;
  };

  /* ----------------------------- Bài viết DEMO ----------------------------- */
  // String.raw: giữ nguyên dấu \ của LaTeX. Không dùng dấu ` hoặc ${ trong nội dung.
  const R = String.raw;
  const DAY = 86400000;

  TT.demoPosts = function (now) {
    now = now || Date.now();
    const posts = [
      {
        id: 'demo-tuyen-sinh',
        title: 'Thông báo tuyển sinh vào lớp 10 năm học 2026 - 2027 (nội dung mẫu)',
        category: 'tuyen-sinh',
        pinned: true,
        createdAt: now - 1 * DAY,
        summary: 'Mẫu thông báo tuyển sinh: đối tượng, chỉ tiêu, lịch tuyển sinh và hồ sơ. Các mục trong ngoặc vuông là chỗ trống để thay bằng thông tin chính thức.',
        content: R`> **Đây là nội dung mẫu.** Các mục trong ngoặc vuông như [điền thông tin] là chỗ trống — hãy thay bằng thông tin chính thức của nhà trường và cơ quan quản lý giáo dục.

## 1. Đối tượng và điều kiện dự tuyển

- Học sinh đã hoàn thành chương trình Trung học cơ sở.
- Điều kiện về hạnh kiểm, học lực: **[điền theo quy chế tuyển sinh hiện hành]**.
- Độ tuổi dự tuyển: **[điền theo quy định]**.

## 2. Chỉ tiêu tuyển sinh

| Nội dung | Số lớp | Chỉ tiêu |
|:--|:--:|:--:|
| Lớp 10 [tên chương trình / ban] | [điền] | [điền] |

## 3. Lịch tuyển sinh dự kiến

| Mốc thời gian | Ngày dự kiến |
|:--|:--|
| Nhận hồ sơ đăng ký | [dd/mm/yyyy - dd/mm/yyyy] |
| Thi môn Toán | [dd/mm/yyyy], thời gian làm bài [điền] phút |
| Công bố điểm | [dd/mm/yyyy] |

## 4. Cấu trúc đề minh họa môn Toán

Tổ Toán đăng đề minh họa và đáp án ở mục **Đề cương vào 10**. Cấu trúc đề chính thức (số câu, thang điểm) do **[cơ quan ban hành]** quy định — sẽ cập nhật tại đây khi có văn bản.

Gợi ý khi làm bài: đọc lướt toàn đề, làm các câu nhận biết và thông hiểu trước, dành thời gian còn lại cho câu vận dụng.

## 5. Hồ sơ cần chuẩn bị

1. Đơn đăng ký dự tuyển theo mẫu.
2. Bản sao giấy khai sinh.
3. Học bạ THCS và giấy chứng nhận tốt nghiệp (hoặc giấy tờ tương đương): **[điền]**.

**Giải đáp thắc mắc:** xem khung thông tin liên hệ bên phải hoặc mục *Liên hệ*.`,
        attachments: []
      },
      {
        id: 'demo-de-cuong-10',
        title: 'Đề cương ôn tập vào 10: Phương trình bậc hai và hệ thức Vi-ét (mẫu)',
        category: 'de-cuong-10',
        pinned: false,
        createdAt: now - 3 * DAY,
        summary: 'Tóm tắt lý thuyết, ví dụ có lời giải và bài tập tự luyện về phương trình bậc hai, định lí Vi-ét. Kèm 2 file đề cương PDF để xem trực tiếp và tải về.',
        content: R`## Mục tiêu

Củng cố kỹ năng giải **phương trình bậc hai** và vận dụng **định lí Vi-ét (Viète)** — dạng bài thường gặp trong đề tuyển sinh vào lớp 10.

## 1. Kiến thức cần nhớ

Phương trình bậc hai một ẩn: $ax^2+bx+c=0$ với $a\neq 0$. Đặt $\Delta=b^2-4ac$.

| Điều kiện | Kết luận về nghiệm |
|:--|:--|
| $\Delta<0$ | Phương trình vô nghiệm |
| $\Delta=0$ | Nghiệm kép $x_1=x_2=-\dfrac{b}{2a}$ |
| $\Delta>0$ | Hai nghiệm phân biệt $x_{1,2}=\dfrac{-b\pm\sqrt{\Delta}}{2a}$ |

**Định lí Vi-ét.** Nếu phương trình có hai nghiệm $x_1,x_2$ (kể cả nghiệm kép, tức $\Delta\ge 0$) thì
$$x_1+x_2=-\frac{b}{a},\qquad x_1x_2=\frac{c}{a}.$$

## 2. Ví dụ minh họa

**Ví dụ 1.** Giải phương trình $x^2-5x+6=0$.

$\Delta=(-5)^2-4\cdot1\cdot6=1>0$ nên $x_1=\dfrac{5+1}{2}=3$, $x_2=\dfrac{5-1}{2}=2$. Tập nghiệm: $\{2;3\}$.

**Ví dụ 2.** Cho phương trình $x^2-2(m+1)x+m^2+2=0$ ($m$ là tham số).
a) Tìm $m$ để phương trình có hai nghiệm $x_1,x_2$.
b) Tìm $m$ để $x_1^2+x_2^2=10$.

*Lời giải.* a) $\Delta'=(m+1)^2-(m^2+2)=2m-1\ge 0\iff m\ge\dfrac12$.

b) Theo Vi-ét: $x_1+x_2=2(m+1)$ và $x_1x_2=m^2+2$. Khi đó
$$x_1^2+x_2^2=(x_1+x_2)^2-2x_1x_2=4(m+1)^2-2(m^2+2)=2m^2+8m.$$
Giải $2m^2+8m=10\iff m^2+4m-5=0\iff m=1$ hoặc $m=-5$. Đối chiếu điều kiện $m\ge\dfrac12$: nhận $m=1$, loại $m=-5$.

## 3. Bài tập tự luyện

1. Giải phương trình $2x^2-7x+3=0$.
2. Cho phương trình $x^2-4x+m=0$. Tìm $m$ để phương trình có hai nghiệm thỏa $x_1=3x_2$.

> Đáp số có trong file đề cương đính kèm bên dưới.`,
        attachments: [
          { title: 'Đề cương Đại số 9 — Phương trình bậc hai & Vi-ét (mẫu)', url: 'assets/samples/de-cuong-dai-so-9-mau.pdf' },
          { title: 'Đề cương Hình học 9 — Tỉ số lượng giác (mẫu)', url: 'assets/samples/de-cuong-hinh-hoc-9-mau.pdf' }
        ]
      },
      {
        id: 'demo-de-cuong-k10',
        title: 'Đề cương Toán 10: Hệ thức lượng trong tam giác (mẫu)',
        category: 'de-cuong-k10',
        pinned: false,
        createdAt: now - 6 * DAY,
        summary: 'Định lí cô sin, định lí sin, công thức diện tích và ví dụ có lời giải. Thầy cô điều chỉnh phạm vi theo phân phối chương trình của trường.',
        content: R`> Nội dung mẫu — thầy cô điều chỉnh phạm vi ôn tập theo phân phối chương trình của trường.

## Phạm vi ôn tập (gợi ý)

- Mệnh đề và tập hợp
- Bất phương trình và hệ bất phương trình bậc nhất hai ẩn
- Hệ thức lượng trong tam giác
- Vectơ

## Công thức trọng tâm

Với tam giác $ABC$ có $BC=a$, $CA=b$, $AB=c$, bán kính đường tròn ngoại tiếp $R$ và nửa chu vi $p=\dfrac{a+b+c}{2}$:

- Định lí cô sin: $a^2=b^2+c^2-2bc\cos A$.
- Định lí sin: $\dfrac{a}{\sin A}=\dfrac{b}{\sin B}=\dfrac{c}{\sin C}=2R$.
- Diện tích: $S=\dfrac12 bc\sin A$ và công thức Heron $S=\sqrt{p(p-a)(p-b)(p-c)}$.

## Ví dụ

Cho tam giác $ABC$ có $a=7$, $b=8$, $c=5$. Tính góc $A$ và diện tích $S$.

$\cos A=\dfrac{b^2+c^2-a^2}{2bc}=\dfrac{64+25-49}{80}=\dfrac12$, suy ra $A=60^\circ$.

$S=\dfrac12 bc\sin A=\dfrac12\cdot 8\cdot 5\cdot\dfrac{\sqrt3}{2}=10\sqrt3$.

Kiểm tra bằng công thức Heron: $p=10$ nên $S=\sqrt{10\cdot 3\cdot 2\cdot 5}=\sqrt{300}=10\sqrt3$.`,
        attachments: []
      },
      {
        id: 'demo-de-cuong-k11',
        title: 'Đề cương Toán 11: Lượng giác, Cấp số và Giới hạn (mẫu)',
        category: 'de-cuong-k11',
        pinned: false,
        createdAt: now - 9 * DAY,
        summary: 'Công thức nghiệm phương trình lượng giác cơ bản, cấp số cộng - cấp số nhân, giới hạn thường dùng, kèm ví dụ có lời giải.',
        content: R`## Công thức trọng tâm

**Phương trình lượng giác cơ bản** (với $k\in\mathbb Z$):

- $\sin x=\sin\alpha\iff x=\alpha+k2\pi$ hoặc $x=\pi-\alpha+k2\pi$.
- $\cos x=\cos\alpha\iff x=\pm\alpha+k2\pi$.
- $\tan x=\tan\alpha\iff x=\alpha+k\pi$ (điều kiện xác định: $\cos x\neq 0$ và $\cos\alpha\neq 0$).

**Cấp số cộng** (công sai $d$): $u_n=u_1+(n-1)d$ và $S_n=\dfrac{n(u_1+u_n)}{2}$.

**Cấp số nhân** (công bội $q$): $u_n=u_1q^{n-1}$ và $S_n=u_1\dfrac{1-q^n}{1-q}$ với $q\neq 1$.

**Giới hạn thường dùng:** $\displaystyle\lim_{x\to 0}\dfrac{\sin x}{x}=1$; $\displaystyle\lim_{n\to\infty}q^n=0$ khi $|q|<1$.

## Ví dụ

**Ví dụ 1.** Giải $2\sin x-1=0$.

$\sin x=\dfrac12=\sin\dfrac{\pi}{6}$ nên $x=\dfrac{\pi}{6}+k2\pi$ hoặc $x=\dfrac{5\pi}{6}+k2\pi$, $k\in\mathbb Z$.

**Ví dụ 2.** Cấp số cộng có $u_1=3$, $d=4$. Tính $u_{10}$ và $S_{10}$.

$u_{10}=3+9\cdot 4=39$ và $S_{10}=\dfrac{10\,(3+39)}{2}=210$.`,
        attachments: []
      },
      {
        id: 'demo-de-cuong-k12',
        title: 'Đề cương ôn thi Tốt nghiệp THPT: Nguyên hàm - Tích phân (mẫu)',
        category: 'de-cuong-k12',
        pinned: false,
        createdAt: now - 12 * DAY,
        summary: 'Bảng nguyên hàm cơ bản, tích phân xác định, diện tích hình phẳng và ví dụ có lời giải. Kèm file đề cương PDF.',
        content: R`## Công thức trọng tâm

Với $C$ là hằng số:

- $\displaystyle\int x^n\,dx=\dfrac{x^{n+1}}{n+1}+C$ với $n\neq -1$.
- $\displaystyle\int\dfrac{1}{x}\,dx=\ln|x|+C$ với $x\neq 0$.
- $\displaystyle\int\sin x\,dx=-\cos x+C$ và $\displaystyle\int\cos x\,dx=\sin x+C$.
- $\displaystyle\int e^x\,dx=e^x+C$.

**Tích phân xác định.** Nếu $F$ là một nguyên hàm của $f$ trên $[a;b]$ thì
$$\int_a^b f(x)\,dx=F(b)-F(a).$$

**Diện tích hình phẳng** giới hạn bởi $y=f(x)$, $y=g(x)$, $x=a$, $x=b$:
$$S=\int_a^b\left|f(x)-g(x)\right|dx.$$

## Ví dụ

**Ví dụ 1.** $\displaystyle\int_0^1(2x+1)\,dx=\Big[x^2+x\Big]_0^1=2$.

**Ví dụ 2.** Tính diện tích hình phẳng giới hạn bởi $y=x^2$ và $y=x$.

Hoành độ giao điểm: $x^2=x\iff x=0$ hoặc $x=1$. Trên $[0;1]$ có $x\ge x^2$ nên
$$S=\int_0^1(x-x^2)\,dx=\left[\frac{x^2}{2}-\frac{x^3}{3}\right]_0^1=\frac12-\frac13=\frac16.$$`,
        attachments: [
          { title: 'Đề cương Toán 12 — Nguyên hàm & Tích phân (mẫu)', url: 'assets/samples/de-cuong-toan-12-mau.pdf' }
        ]
      },
      {
        id: 'demo-tin-tuc',
        title: 'Tổ Toán mở kênh giải đáp thắc mắc cho học sinh và phụ huynh (bài mẫu)',
        category: 'tin-tuc',
        pinned: false,
        createdAt: now - 15 * DAY,
        summary: 'Bài tin mẫu cho mục Tin tức & Hoạt động — thay bằng tin thật của Tổ Toán.',
        content: R`> **Bài mẫu** — thay bằng tin thật của Tổ Toán.

Để hỗ trợ học sinh ôn tập, Tổ Toán dự kiến:

- Đăng đề cương mới ngay trên website này: xem trực tiếp và tải về dưới dạng PDF.
- Tiếp nhận câu hỏi qua **Zalo / Hotline** ở góc dưới bên phải màn hình.
- Công bố lịch ôn tập, lịch kiểm tra tại mục **Tin tức & Hoạt động**.

Mời học sinh và phụ huynh theo dõi trang để cập nhật thông tin mới nhất.`,
        attachments: []
      }
    ];

    return posts.map((p, i) => {
      const clean = TT.cleanPost(Object.assign({ author: 'Admin Tổ Toán', updatedAt: p.createdAt, hidden: false }, p));
      clean.id = p.id;
      return clean;
    });
  };
})();
