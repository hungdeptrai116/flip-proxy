# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this project is

Two things share this repo:

1. **LMS ProMax** (`public/` + `server/`) — a quiz/exam system in Vietnamese.
   Teachers import an exam from PDF/DOCX/TXT (or paste it), the app parses
   questions, options, answer keys and explanations; students take it in
   practice or timed-exam mode with scoring, history and review. When the API
   is reachable the exam bank is **shared server-side** (one teacher password,
   students need none) and finished attempts are posted back for the teacher to
   read and export to Excel. With no server (opening `lms.html` off disk) the
   app falls back to a fully local `localStorage`-only mode.
2. **flip-proxy** (`proxy-server.js`) — the original Express service that
   proxies third-party flipbook viewers (currently **flipbookpdf.net**) so
   readers get the book without the original site's share buttons, QR codes and
   branding, and without being handed the upstream URL.

3. **Tổ GDTX portal** (`to-toan-portal/`; the directory keeps its old name, the site was
   renamed from "Tổ Toán" to "Tổ GDTX" = Giáo dục thường xuyên) — a separate static site
   (Vietnamese) for a college department: vocational-training recruitment notices plus
   "ôn văn hóa" revision material (PDF), one admin posting from the browser. Self-contained;
   **not** served by `proxy-server.js` and shares no code with the LMS. See "Architecture — Tổ GDTX
   portal" below and `to-toan-portal/README.md`. Drafts awaiting approval live in `docs/gdtx-portal/`
   (outside the published folder on purpose).

There is no build step, no bundler, no linter and no CI. `proxy-server.js` also
serves `public/` so `npm start` is all that's needed to use the LMS.

## Layout

```
proxy-server.js         Express bootstrap: proxy route, store + API wiring, static hosting
server/api.js           /api router: login, exams, results, results.xlsx
server/store.js         data layer, two backends: file (data/db.json) and MongoDB
server/xlsx.js          dependency-free .xlsx writer (a ZIP of XML, built with zlib)
public/lms.html         LMS page shell + all CSS (hand-written, no framework)
public/app.js           the whole LMS client: API layer, parser, state, views
public/vendor/          KaTeX, pdf.js, mammoth vendored from npm (~2.6 MB, offline-ready)
data/                   runtime data, gitignored — created on first save
README.md               end-user instructions, in Vietnamese
package.json            deps and the single `start` script
package-lock.json       STALE — see "Known rough edges"
node_modules/           committed to git (~3.6k files) — see "Known rough edges"
```

## Architecture — Tổ GDTX portal (`to-toan-portal/`)

Vanilla JS + Tailwind (prebuilt `assets/tailwind.css`), hash routing, classic
scripts (no modules). Two backends behind one `TT.Store` interface in
`js/store.js`: **demo** (`localStorage`, when `config.js` has no `firebaseConfig`)
and **firebase** (Firestore + Auth, SDK loaded by dynamic `import()` from gstatic).

- **Never concatenate HTML by hand.** Views use the `html` tagged template in
  `js/util.js`, which escapes every interpolation unless wrapped in `raw()`.
  Post bodies go through `js/markdown.js` (escapes first, `safeUrl` for links).
- `cleanPost()` / `TT.POST_KEYS` in `js/util.js` must stay in sync with
  `validPost()` in `firestore.rules` (`hasOnly` key list). Change one, change both.
- `firestore.rules` blocks reads of `hidden == true` posts; the guest query in
  `store.js` filters `where('hidden','==',false)` to match. Keep them paired.
- `schedule()` in `js/app.js` skips re-rendering static admin views (editor,
  settings, login) so typing is not wiped — but only once the real page has been
  drawn (`state.shown`); otherwise Firebase's event order can strand the
  "Đang tải" screen.
- Touch targets: `assets/app.css` forces ≥44px for controls under
  `@media (pointer: coarse), (max-width: 640px)`. A new button/link/input type
  must be added to that rule. Audited at 390px (targets, contrast, labels,
  keyboard focus) — keep body text ≥4.5:1 and every input labelled.
- **Purpose is worker recruitment, not school admissions.** The site is an information channel for a vocational
  college's "học nghề → bố trí việc làm" intake (underground-mine trades) plus an "ôn văn hóa" area. It must not collect
  hồ sơ or personal data (no forms) — candidates are sent to the school by phone/Zalo/branch. The structured page
  `#/hoc-nghe` (`js/recruit.js`) renders `settings.recruit` (defaults copied from the school's dated notice, source shown
  on the page). Hero points and stat tiles left blank are *derived* from `recruit` (`TT.recruitInfo`) so there is one
  source of truth. Do not add salary/benefit/age figures that are not in a cited notice. Changing `settings` shape needs no
  rules change (settings are admin-write, unvalidated); changing post categories does.
- Changing Tailwind classes in `index.html`/`js/*.js` needs
  `cd to-toan-portal && npm install && npm run build:css` (own `.gitignore`
  covers its `node_modules/`).
- Test: `node to-toan-portal/serve.js`, then Playwright from *outside* the repo
  (same recipe as the LMS). Firebase paths were verified against the real
  Firestore/Auth **emulators** with `firestore.rules` loaded; the Emulator jar
  downloads from storage.googleapis.com, whereas `gstatic.com` (the real SDK CDN)
  may be blocked in sandboxes.

## Commands

```bash
npm install                              # only needed if node_modules is missing/stale
npm start                                # = node proxy-server.js
PORT=3000 npm start                      # override the port (defaults to 10000)
TEACHER_PASSWORD=secret npm start        # fixed teacher password (else a random one is logged)
MONGODB_URI='mongodb+srv://...' npm start  # persistent store instead of data/db.json
```

Then open <http://localhost:10000> for the LMS. Opening `public/lms.html`
directly off disk (`file://`) also works — verified, including PDF import —
because nothing loads from a CDN.

Smoke test without touching the network:

```bash
curl -i http://localhost:10000/view/nope        # → 404 "Không tìm thấy sách"
curl -sI http://localhost:10000/ | head -1      # → 200, the LMS page
```

`/view/toan` performs a real outbound HTTPS request to flipbookpdf.net. In
sandboxed environments (e.g. Claude Code web sessions) that egress is usually
blocked and the route returns `500 Lỗi proxy khi tải sách.` with an upstream
status error logged — that is an environment limitation, not a code bug.
Verify startup and the 404 branch locally; do not "fix" the 500 by changing
error handling unless the failure reproduces with real network access.

## Architecture — LMS (`public/app.js`)

One IIFE, no framework. Order inside the file: DOM helpers → parser → default
data → state → view functions → boot.

- **`h(tag, attrs, children)`** builds DOM nodes. `attrs.math` routes text
  through `renderMath`, which splits on `$...$` and hands only the math to
  KaTeX; every other character goes through `createTextNode`. **Never render
  exam content with `innerHTML`** — imported JSON is untrusted and this is what
  keeps it safe (there is a test for it).
- **`parseExam(text)`** → `{questions, dropped}`. `normalizeLines` first
  re-splits lines before `Câu N.`, `A.` and `Đáp án:` because PDF extraction
  collapses a page into one long line. Answers are only ever assigned to the
  question currently being built; a trailing answer key (`1A 2C 3B`) is applied
  afterwards by number. Keyword regexes accept unaccented spellings (`cau`,
  `bai`) since OCR'd files often lose diacritics.
- **`buildAttempt(exam)`** shuffles questions *and* options, remapping
  `correct` through the new option order. Any question with a blank option is
  left unshuffled.
- **`server`** (module-level) holds `{on, persistent, token}`. `boot()` probes
  `GET api/health`: reachable → the server's exam list is the single source of
  truth (empty means empty; the demo exam is *not* pushed silently);
  unreachable → local-only mode. `pushExams()` is the one write path — it
  optimistically updates `state.exams`, PUTs, and rolls back on failure.
- **State** is one module-level `state` object; `render()` rebuilds the view.
  The exam timer is a single `setInterval` that mutates `state.run` and patches
  `#clock` in place, so no re-render happens per second and the submitted
  answers are always the live ones.
- `window.__lms` exposes `parseExam`, `buildAttempt`, `scoreAttempt`, `state`
  and `render` purely so browser tests can reach them.

Data keys in `localStorage`: `promax_user`, `promax_exams`, `promax_history`.

## Architecture — API (`server/`)

- **`store.js`** picks a backend at boot: MongoDB when `MONGODB_URI` is set,
  otherwise a JSON file at `data/db.json`. Both expose the same async interface
  (`getExams/setExams/addResult/getResults/clearResults`) plus `kind` and
  `persistent`. A failing Mongo connection logs in Vietnamese and **falls back
  to the file store** rather than killing the process — the class stays online.
- **`api.js`** mounts at `/api`. `GET /health`, `POST /setup`, `POST /login`,
  `GET /exams` and `POST /results` are public; `PUT /exams`, `GET /results`,
  `DELETE /results` and `GET /results.xlsx` require the teacher token. The token
  is `sha256('lms-promax:' + password)`, so it survives restarts without any
  session store; `POST /login` trades the password for it and locks an IP out
  for 10 minutes after 8 failures. Everything from the browser goes through
  `sanitizeExams` / `clean` / `int` before it is stored — never trust the client.
- **Teacher password, two sources.** `TEACHER_PASSWORD` wins when set. Otherwise
  the first visitor gets a **first-run setup screen** (`health.needsSetup` →
  `viewSetup()` → `POST /setup`) and claims the password; only the sha256 hash
  is stored, in `store.setConfig({teacherPasswordHash})`, and `/setup` answers
  409 forever after. `current` inside `createApi` is therefore mutable at
  runtime — read it through `token()`, never capture it at construction.
- **`xlsx.js`** writes a real `.xlsx` (verified by reading it back with
  SheetJS) with no dependency: `zlib.deflateRawSync` plus hand-built ZIP local
  headers, central directory and a `sheet1.xml` using inline strings.

Known limits, stated in the README rather than hidden: exam answers are in the
public `GET /api/exams` payload, and scoring happens in the browser, so results
are self-reported. Fine for homework practice, not for a graded exam. Fixing it
means server-side grading plus stripping `correct` in exam mode.

## Architecture — proxy (`proxy-server.js`)

In order:

1. **Middleware** — `cors()` (fully open) and `express.json()`.
2. **Static hosting** — `express.static(public/)` plus `GET /` sending
   `public/lms.html`, so `npm start` serves the LMS. Mounted inside `start()`
   *after* the `/api` router, because the store has to be created first.
3. **`BOOKS` registry** — a hardcoded map of
   `bookId → upstream viewer URL`. Today it holds a single entry, `toan`.
4. **`GET /view/:bookId`** — the proxy route:
   - Looks up `BOOKS[bookId]`; unknown id → `404`.
   - `axios.get(flipUrl)` fetches the upstream HTML.
   - `cheerio` loads it and strips elements matching
     `[class*="share"]`, `[class*="qr"]`, `[href*="flipbookpdf"]` and
     `[style*="position:fixed"]`.
   - Prepends a fixed-position Vietnamese "safe proxy" banner to `<body>`.
   - Returns the rewritten HTML via `$.html()`.
   - Any throw → `console.error` + `500`.
5. **`app.listen(PORT)`** with `PORT = process.env.PORT || 10000`.

### Things the current version deliberately does *not* have

- **No `GET /asset/:bookId/*` passthrough route.** The old FlipHTML5 version
  rewrote relative `src`/`href` attributes to `/asset/...` and streamed the
  bytes back. The flipbookpdf.net page uses absolute asset URLs, so assets
  now load straight from the origin and only the HTML document is proxied.
  This means the client still talks to flipbookpdf.net for JS/images.

If you add asset proxying back, watch for the double-slash bug that was fixed
twice in history (`99601b5`, `444d9b0`): `flipUrl` and the captured path must
be joined with exactly one `/`.

## Conventions

- **CommonJS** (`require`) on the server, not ESM. Node 22 is what's installed
  here; nothing in the code requires a specific version.
- `public/app.js` is a **classic script**, not a module — ES modules would break
  `file://` usage. Keep it that way, and keep new vendored libs in
  `public/vendor/` rather than adding CDN tags.
- **Vietnamese** for comments, log lines and all user-facing strings
  (`"Không tìm thấy sách"`, `"Lỗi proxy khi tải sách."`). Keep new strings in
  Vietnamese to match.
- Logs use emoji prefixes: `✅` for startup, `❌` for errors.
- Commit messages are short, often emoji-prefixed, and mix Vietnamese and
  English (e.g. `🔧 Update proxy server for flipbookpdf.net`). Follow the
  existing style.
- No formatter is configured; match the surrounding 2-space indentation.

## Common task: changing the exam parser

`parseExam` is the fragile part — it string-matches teacher-written documents.
Before and after any change, run text through it and compare: PDF-flattened
input (no newlines), a question whose stem contains the word "đa dạng" (an old
regex matched the bare "đa" and silently deleted the question), a question with
fewer than 4 options, a multi-line explanation, and a trailing answer key. All
five were real bugs.

## Common task: adding a book

Add an entry to the `BOOKS` map in `proxy-server.js`:

```js
const BOOKS = {
  toan: 'https://flipbookpdf.net/web/site/....pdf.html',
  ly:   'https://flipbookpdf.net/web/site/....pdf.html'
};
```

The id becomes the URL segment: `/view/ly`. There is no database and no config
file — the map is the only source of truth. If book ids ever need to come from
elsewhere, that is a design change worth raising, not a silent refactor.

## Deployment

Deployed on **Render** as a web service. `npm start` is the start command and
Render injects `PORT` (hence the `10000` default, and why several commits in
history are about making the startup log detectable by Render). There is no
`render.yaml` in the repo — the service is configured in Render's dashboard.
`MONGODB_URI` is the one environment variable that has to be set there;
`TEACHER_PASSWORD` is optional since the first-run setup screen covers it.

Render's free tier has **no persistent disk and spins down after 15 minutes of
inactivity**, so the file store loses everything on the next wake-up. That is
why `MONGODB_URI` is not optional in practice, why `/api/health` reports
`persistent`, and why the teacher dashboard shows a yellow warning when it is
false. Do not "simplify" that warning away. README.md has the end-user steps.

## Known rough edges

Be aware of these; do not treat them as bugs to fix drive-by, but flag them if
relevant to the change at hand:

- **`node_modules/` is committed** and there is no `.gitignore`. Around 3,600
  tracked files. Running `npm install` can therefore produce a huge, noisy
  diff. Check `git status` before committing and never stage `node_modules/`
  changes unless that is the explicit task.
- **`package-lock.json` does not match `package.json`.** The lockfile's root
  entry is named `secure-flipbook` and lists `bcrypt` and `mongoose`, which
  `package.json` does not declare and the code does not use. The committed
  `node_modules/` reflects the lockfile, so `bcrypt`/`mongoose` are on disk.
  Regenerating the lockfile would be correct but produces a very large diff —
  do it only when asked.
- **Installed versions drift from the declared ranges** (e.g. cheerio 1.1.1 on
  disk vs `^1.0.0-rc.12` declared). Both satisfy semver; just don't assume the
  declared range is what is running.
- **CORS is wide open** and the proxy will fetch and return upstream HTML for
  any registered book. Fine for the intended use, worth mentioning if the
  service is ever exposed more broadly.
- **Two data locations, on purpose.** The shared exam bank and submitted
  results live server-side; each student's own attempt history stays in their
  `localStorage` and is never uploaded. Opening `lms.html` off disk drops back
  to fully local mode. When changing storage, keep both paths working.
- **Results are self-reported.** The browser grades the attempt and POSTs the
  score, and `GET /api/exams` includes the answer keys. Do not describe the
  system as exam-proctoring; see the note under "Architecture — API".
- **`public/vendor/` is vendored on purpose** (~2.6 MB: KaTeX + fonts, pdf.js +
  its worker, mammoth). It is what makes `file://` and offline use work. Do not
  swap it back to CDN tags to save repo size.
- **The exam parser is heuristic** — see "Common task: changing the exam
  parser". Assume any change can silently drop questions and check the listed
  cases.
- **The DOM-stripping selectors are heuristic.** They are string-matched
  against upstream markup that can change at any time; a book rendering with
  visible branding usually means the upstream page changed, not that the code
  regressed.

## Working agreements

- Keep changes minimal and inside the file that owns the behaviour; the LMS is
  `public/app.js`, the proxy is `proxy-server.js`.
- There is no test suite in the repo. Validate the proxy with `curl` as shown
  above. Validate LMS changes in a real browser: the app was built and checked
  with Playwright driving the vendored Chromium against `npm start` (login,
  import from real PDF/DOCX/TXT files, exam and practice flows, timeout
  auto-submit, shuffle remapping over 300 runs, backup/restore, XSS safety).
  Install Playwright *outside* the repo so the committed `node_modules/` stays
  untouched, and launch with
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`.
- Develop on the branch you were assigned; commit and push there, and do not
  open a pull request unless explicitly asked.
