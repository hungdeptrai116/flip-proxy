# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this project is

`flip-proxy` is a single-file Node.js/Express service that proxies third-party
flipbook viewers (currently **flipbookpdf.net**) so readers can view a book
without the original site's share buttons, QR codes and branding, and without
being handed the upstream URL.

The whole application is `proxy-server.js` (~48 lines). There is no framework
scaffolding, no build step, no test suite, no linter and no CI.

## Layout

```
proxy-server.js      the entire application (routes + book registry + startup)
package.json         deps and the single `start` script
package-lock.json    STALE — see "Known rough edges"
node_modules/        committed to git (~3.6k files) — see "Known rough edges"
```

## Commands

```bash
npm install          # only needed if node_modules is missing/stale
npm start            # = node proxy-server.js
PORT=3000 npm start  # override the port (defaults to 10000)
```

Smoke test without touching the network:

```bash
curl -i http://localhost:10000/view/nope   # → 404 "Không tìm thấy sách"
```

`/view/toan` performs a real outbound HTTPS request to flipbookpdf.net. In
sandboxed environments (e.g. Claude Code web sessions) that egress is usually
blocked and the route returns `500 Lỗi proxy khi tải sách.` with an upstream
status error logged — that is an environment limitation, not a code bug.
Verify startup and the 404 branch locally; do not "fix" the 500 by changing
error handling unless the failure reproduces with real network access.

## Architecture

`proxy-server.js`, in order:

1. **Middleware** — `cors()` (fully open) and `express.json()`.
2. **`BOOKS` registry** (`proxy-server.js:13`) — a hardcoded map of
   `bookId → upstream viewer URL`. Today it holds a single entry, `toan`.
3. **`GET /view/:bookId`** (`proxy-server.js:18`) — the only route:
   - Looks up `BOOKS[bookId]`; unknown id → `404`.
   - `axios.get(flipUrl)` fetches the upstream HTML.
   - `cheerio` loads it and strips elements matching
     `[class*="share"]`, `[class*="qr"]`, `[href*="flipbookpdf"]` and
     `[style*="position:fixed"]`.
   - Prepends a fixed-position Vietnamese "safe proxy" banner to `<body>`.
   - Returns the rewritten HTML via `$.html()`.
   - Any throw → `console.error` + `500`.
4. **`app.listen(PORT)`** with `PORT = process.env.PORT || 10000`.

### Things the current version deliberately does *not* have

Earlier commits had these; they were removed and should not be reintroduced
without a reason:

- **No `GET /` health route.** It existed until commit `dce40dc`.
- **No `GET /asset/:bookId/*` passthrough route.** The old FlipHTML5 version
  rewrote relative `src`/`href` attributes to `/asset/...` and streamed the
  bytes back. The flipbookpdf.net page uses absolute asset URLs, so assets
  now load straight from the origin and only the HTML document is proxied.
  This means the client still talks to flipbookpdf.net for JS/images.

If you add asset proxying back, watch for the double-slash bug that was fixed
twice in history (`99601b5`, `444d9b0`): `flipUrl` and the captured path must
be joined with exactly one `/`.

## Conventions

- **CommonJS** (`require`), not ESM. Node 22 is what's installed here; nothing
  in the code requires a specific version.
- **Vietnamese** for comments, log lines and all user-facing strings
  (`"Không tìm thấy sách"`, `"Lỗi proxy khi tải sách."`). Keep new strings in
  Vietnamese to match.
- Logs use emoji prefixes: `✅` for startup, `❌` for errors.
- Commit messages are short, often emoji-prefixed, and mix Vietnamese and
  English (e.g. `🔧 Update proxy server for flipbookpdf.net`). Follow the
  existing style.
- No formatter is configured; match the surrounding 2-space indentation.

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
- **The DOM-stripping selectors are heuristic.** They are string-matched
  against upstream markup that can change at any time; a book rendering with
  visible branding usually means the upstream page changed, not that the code
  regressed.

## Working agreements

- Keep changes minimal and inside `proxy-server.js` unless the task calls for
  more; this is a small, single-purpose service.
- There are no tests to run. Validate by starting the server and hitting the
  routes with `curl` as shown above.
- Develop on the branch you were assigned; commit and push there, and do not
  open a pull request unless explicitly asked.
