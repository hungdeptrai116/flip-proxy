/*
 * store.js — lớp dữ liệu có HAI backend cùng giao diện:
 *   - Demo     : localStorage (khi config.js chưa điền firebaseConfig)
 *   - Firebase : Cloud Firestore + Firebase Authentication (đồng bộ thời gian thực)
 *
 * Giao diện chung (TT.Store):
 *   mode, adminEmail, ready
 *   onPosts(cb) onSettings(cb) onAuth(cb) onError(cb)   → trả hàm hủy đăng ký
 *   signIn(email, pw) signOut()
 *   savePost(data, id?) patchPost(id, {hidden?, pinned?}) deletePost(id)
 *   saveSettings(s) exportAll() importAll({posts, settings}) seedDemo()
 */
(function () {
  'use strict';
  const TT = window.TT;
  const cfg = window.SITE_CONFIG || {};
  const fbCfg = cfg.firebaseConfig || {};
  const useFirebase = !!(fbCfg.apiKey && fbCfg.projectId);

  // Bộ phát sự kiện "nhớ giá trị cuối": người đăng ký muộn vẫn nhận ngay giá trị hiện tại
  function emitter() {
    const subs = new Set();
    let last;
    let has = false;
    return {
      on(cb) {
        subs.add(cb);
        if (has) { try { cb(last); } catch (e) { console.error(e); } }
        return () => subs.delete(cb);
      },
      emit(v) {
        last = v;
        has = true;
        subs.forEach((cb) => { try { cb(v); } catch (e) { console.error(e); } });
      },
      get value() { return last; }
    };
  }

  const lower = (s) => String(s || '').trim().toLowerCase();
  // ID tài liệu Firestore không được chứa "/" — chỉ giữ chữ, số, _ và -
  const safeId = (s) => String(s == null ? '' : s).replace(/[^\w-]/g, '').slice(0, 60) || TT.genId();

  /* ===================================================================
   * BACKEND 1 — DEMO (localStorage)
   * ================================================================= */
  function createLocalBackend() {
    const LS_POSTS = 'totoan.posts.v1';
    const LS_SETTINGS = 'totoan.settings.v1';
    const SS_AUTH = 'totoan.auth.v1';

    const posts$ = emitter(), settings$ = emitter(), auth$ = emitter(), err$ = emitter();
    let posts = [];
    let settings;

    function loadPosts() {
      const stored = TT.lsGet(LS_POSTS, null);
      if (!Array.isArray(stored)) {
        posts = TT.demoPosts();
        persistPosts();
      } else {
        posts = stored.map((p) => Object.assign(TT.cleanPost(p), { id: safeId(p.id) }));
      }
    }
    function loadSettings() {
      const stored = TT.lsGet(LS_SETTINGS, null);
      settings = stored ? TT.mergeSettings(stored) : TT.demoSettings();
      if (!stored) persistSettings();
    }
    function persistPosts() {
      if (!TT.lsSet(LS_POSTS, posts)) throw new Error('Không lưu được: bộ nhớ trình duyệt đã đầy hoặc bị chặn.');
    }
    function persistSettings() {
      if (!TT.lsSet(LS_SETTINGS, settings)) throw new Error('Không lưu được: bộ nhớ trình duyệt đã đầy hoặc bị chặn.');
    }
    function getUser() {
      try {
        const raw = window.sessionStorage.getItem(SS_AUTH);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    }

    loadPosts();
    loadSettings();
    posts$.emit(posts);
    settings$.emit(settings);
    auth$.emit(getUser());

    // Đồng bộ giữa các tab của cùng trình duyệt
    window.addEventListener('storage', (e) => {
      if (e.key === LS_POSTS) { loadPosts(); posts$.emit(posts); }
      if (e.key === LS_SETTINGS) { loadSettings(); settings$.emit(settings); }
    });

    return {
      mode: 'demo',
      adminEmail: lower((cfg.demo || {}).email),
      ready: Promise.resolve(),
      onPosts: (cb) => posts$.on(cb),
      onSettings: (cb) => settings$.on(cb),
      onAuth: (cb) => auth$.on(cb),
      onError: (cb) => err$.on(cb),

      async signIn(email, password) {
        const d = cfg.demo || {};
        if (lower(email) !== lower(d.email) || password !== d.password) {
          const e = new Error('Sai tài khoản hoặc mật khẩu.');
          e.code = 'auth/invalid-credential';
          throw e;
        }
        const user = { email: lower(email), uid: 'demo' };
        try { window.sessionStorage.setItem(SS_AUTH, JSON.stringify(user)); } catch (e) { /* bỏ qua */ }
        auth$.emit(user);
        return user;
      },
      async signOut() {
        try { window.sessionStorage.removeItem(SS_AUTH); } catch (e) { /* bỏ qua */ }
        auth$.emit(null);
      },

      async savePost(data, id) {
        const now = Date.now();
        const existing = id ? posts.find((p) => p.id === id) : null;
        const clean = TT.cleanPost(Object.assign({}, existing || {}, data, {
          updatedAt: now,
          createdAt: (data && data.createdAt) || (existing && existing.createdAt) || now
        }));
        if (!clean.title) throw new Error('Tiêu đề không được để trống.');
        const newId = id || TT.genId();
        const rec = Object.assign({ id: newId }, clean);
        posts = existing ? posts.map((p) => (p.id === id ? rec : p)) : [rec].concat(posts);
        persistPosts();
        posts$.emit(posts);
        return newId;
      },
      async patchPost(id, patch) {
        const target = posts.find((p) => p.id === id);
        if (!target) throw new Error('Không tìm thấy bài viết.');
        const next = Object.assign({}, target, { updatedAt: Date.now() });
        if (typeof patch.hidden === 'boolean') next.hidden = patch.hidden;
        if (typeof patch.pinned === 'boolean') next.pinned = patch.pinned;
        posts = posts.map((p) => (p.id === id ? next : p));
        persistPosts();
        posts$.emit(posts);
      },
      async deletePost(id) {
        posts = posts.filter((p) => p.id !== id);
        persistPosts();
        posts$.emit(posts);
      },
      async saveSettings(s) {
        settings = TT.mergeSettings(s);
        persistSettings();
        settings$.emit(settings);
      },

      async exportAll() { return { posts: posts, settings: settings }; },
      async importAll(data) {
        const incoming = (Array.isArray(data.posts) ? data.posts : []).map((p) =>
          Object.assign(TT.cleanPost(p), { id: safeId(p.id) }));
        const ids = new Set(incoming.map((p) => p.id));
        posts = incoming.concat(posts.filter((p) => !ids.has(p.id)));
        persistPosts();
        posts$.emit(posts);
        if (data.settings) {
          settings = TT.mergeSettings(data.settings);
          persistSettings();
          settings$.emit(settings);
        }
        return incoming.length;
      },
      // Demo: khôi phục toàn bộ dữ liệu mẫu ban đầu
      async seedDemo() {
        posts = TT.demoPosts();
        settings = TT.demoSettings();
        persistPosts();
        persistSettings();
        posts$.emit(posts);
        settings$.emit(settings);
        return posts.length;
      }
    };
  }

  /* ===================================================================
   * BACKEND 2 — FIREBASE (Authentication + Cloud Firestore)
   * ================================================================= */
  function friendlyError(err, action) {
    const code = String((err && err.code) || '').replace(/^firestore\//, '');
    if (code === 'permission-denied') {
      return 'Không có quyền ' + action + '. Kiểm tra: đã đăng nhập đúng tài khoản quản trị chưa, và đã đăng firestore.rules lên Firebase chưa.';
    }
    if (code === 'unavailable') return 'Không kết nối được máy chủ Firebase. Kiểm tra mạng rồi thử lại.';
    if (code === 'resource-exhausted') return 'Vượt hạn mức Firebase. Thử lại sau.';
    if (code === 'invalid-argument' || code === 'out-of-range') return 'Dữ liệu quá lớn hoặc không hợp lệ (mỗi bài viết tối đa khoảng 1 MB).';
    return 'Lỗi Firebase (' + (code || (err && err.message) || 'không rõ') + ') khi ' + action + '.';
  }

  function createFirebaseBackend() {
    const version = cfg.firebaseVersion || '10.14.1';
    const base = (cfg.firebaseBaseUrl || ('https://www.gstatic.com/firebasejs/' + version)).replace(/\/$/, '') + '/';

    const posts$ = emitter(), settings$ = emitter(), auth$ = emitter(), err$ = emitter();
    let fs, authMod, db, auth;
    let user = null;
    let unsubPosts = null;
    let lastPosts = [];
    let lastSettings = TT.mergeSettings({});

    const isAdminUser = (u) => !!u && (!cfg.adminEmail || lower(u.email) === lower(cfg.adminEmail));

    function subscribePosts() {
      if (unsubPosts) { unsubPosts(); unsubPosts = null; }
      const col = fs.collection(db, 'posts');
      // Quản trị: đọc tất cả. Khách: chỉ bài hiển thị (khớp quy tắc read trong firestore.rules).
      const q = isAdminUser(user) ? col : fs.query(col, fs.where('hidden', '==', false));
      unsubPosts = fs.onSnapshot(q, (snap) => {
        lastPosts = snap.docs.map((d) => Object.assign(TT.cleanPost(d.data()), { id: d.id }));
        posts$.emit(lastPosts);
      }, (err) => {
        console.error('Firestore posts:', err);
        err$.emit(friendlyError(err, 'tải bài viết'));
        lastPosts = [];
        posts$.emit(lastPosts);
      });
    }

    const ready = (async () => {
      const mods = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-auth.js'),
        import(base + 'firebase-firestore.js')
      ]);
      const appMod = mods[0];
      authMod = mods[1];
      fs = mods[2];
      const app = appMod.initializeApp(fbCfg);
      auth = authMod.getAuth(app);
      db = fs.getFirestore(app);

      fs.onSnapshot(fs.doc(db, 'settings', 'site'), (snap) => {
        lastSettings = TT.mergeSettings(snap.exists() ? snap.data() : {});
        settings$.emit(lastSettings);
      }, (err) => {
        console.error('Firestore settings:', err);
        err$.emit(friendlyError(err, 'tải cài đặt'));
        settings$.emit(lastSettings);
      });

      authMod.onAuthStateChanged(auth, (u) => {
        user = u ? { email: lower(u.email), uid: u.uid } : null;
        auth$.emit(user);
        subscribePosts();
      });
    })();

    ready.catch((err) => {
      console.error('Không tải được Firebase SDK:', err);
      err$.emit('Không tải được Firebase SDK từ ' + base + ' — kiểm tra kết nối mạng, firebaseVersion trong config.js, hoặc firebaseConfig.');
      settings$.emit(lastSettings);
      posts$.emit([]);
      auth$.emit(null);
    });

    const needReady = async () => { await ready; };

    async function run(action, fn) {
      await needReady();
      try { return await fn(); }
      catch (err) {
        console.error(err);
        const e = new Error(friendlyError(err, action));
        e.code = err && err.code;
        throw e;
      }
    }

    return {
      mode: 'firebase',
      adminEmail: lower(cfg.adminEmail),
      ready: ready,
      onPosts: (cb) => posts$.on(cb),
      onSettings: (cb) => settings$.on(cb),
      onAuth: (cb) => auth$.on(cb),
      onError: (cb) => err$.on(cb),

      async signIn(email, password) {
        await needReady();
        await authMod.signInWithEmailAndPassword(auth, String(email).trim(), password);   // lỗi giữ nguyên mã để hiển thị đúng
      },
      async signOut() {
        await needReady();
        await authMod.signOut(auth);
      },

      savePost(data, id) {
        return run('lưu bài viết', async () => {
          const now = Date.now();
          const existing = id ? lastPosts.find((p) => p.id === id) : null;
          const clean = TT.cleanPost(Object.assign({}, existing || {}, data, {
            updatedAt: now,
            createdAt: (data && data.createdAt) || (existing && existing.createdAt) || now
          }));
          if (!clean.title) throw new Error('Tiêu đề không được để trống.');
          const ref = id ? fs.doc(db, 'posts', id) : fs.doc(fs.collection(db, 'posts'));
          await fs.setDoc(ref, clean);
          return ref.id;
        });
      },
      patchPost(id, patch) {
        return run('cập nhật bài viết', async () => {
          const upd = { updatedAt: Date.now() };
          if (typeof patch.hidden === 'boolean') upd.hidden = patch.hidden;
          if (typeof patch.pinned === 'boolean') upd.pinned = patch.pinned;
          await fs.updateDoc(fs.doc(db, 'posts', id), upd);
        });
      },
      deletePost(id) {
        return run('xóa bài viết', () => fs.deleteDoc(fs.doc(db, 'posts', id)));
      },
      saveSettings(s) {
        return run('lưu cài đặt', () => fs.setDoc(fs.doc(db, 'settings', 'site'), TT.mergeSettings(s)));
      },

      async exportAll() { await needReady(); return { posts: lastPosts, settings: lastSettings }; },
      importAll(data) {
        return run('nhập dữ liệu', async () => {
          const list = Array.isArray(data.posts) ? data.posts : [];
          for (let i = 0; i < list.length; i += 400) {
            const batch = fs.writeBatch(db);
            list.slice(i, i + 400).forEach((p) => {
              const clean = TT.cleanPost(p);
              if (!clean.title) return;
              batch.set(fs.doc(db, 'posts', safeId(p.id)), clean);
            });
            await batch.commit();
          }
          if (data.settings) await fs.setDoc(fs.doc(db, 'settings', 'site'), TT.mergeSettings(data.settings));
          return list.length;
        });
      },
      // Firebase: nạp 6 bài mẫu khi cơ sở dữ liệu còn trống.
      // Chỉ nạp bài viết — KHÔNG ghi số điện thoại / số liệu mẫu vào cài đặt thật.
      seedDemo() {
        return this.importAll({ posts: TT.demoPosts() });
      }
    };
  }

  TT.Store = useFirebase ? createFirebaseBackend() : createLocalBackend();
})();
