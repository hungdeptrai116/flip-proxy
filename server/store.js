/* Kho dữ liệu dùng chung cho cả lớp: đề thi + kết quả học sinh nộp về.
   Hai chế độ:
   - mongo: khi có biến môi trường MONGODB_URI (dữ liệu còn mãi, dùng khi deploy)
   - file : ghi ra data/db.json (mặc định, tiện khi chạy ở máy nhà)
   Mọi hàm đều async để hai chế độ dùng chung một giao diện. */
const fs = require('fs');
const path = require('path');

const MAX_RESULTS = 5000;   // giữ lại tối đa bấy nhiêu lượt nộp bài

/* ---------------- Chế độ ghi ra file ---------------- */
function fileStore(dir) {
  const file = path.join(dir, 'db.json');
  let db = { exams: [], results: [], config: {} };

  try {
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      db.exams = Array.isArray(raw.exams) ? raw.exams : [];
      db.results = Array.isArray(raw.results) ? raw.results : [];
      db.config = raw.config && typeof raw.config === 'object' ? raw.config : {};
    }
  } catch (err) {
    console.error('❌ Không đọc được', file, '-', err.message);
  }

  function flush() {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db), 'utf8');
    fs.renameSync(tmp, file);         // đổi tên là thao tác nguyên khối, tránh file hỏng giữa chừng
  }

  return {
    kind: 'file',
    persistent: false,                // trên Render bản miễn phí, ổ đĩa bị xoá mỗi lần khởi động lại
    where: file,
    async getExams() { return db.exams; },
    async setExams(list) { db.exams = list; flush(); return list.length; },
    async addResult(r) { db.results.unshift(r); db.results = db.results.slice(0, MAX_RESULTS); flush(); },
    async getResults() { return db.results; },
    async clearResults() { db.results = []; flush(); },
    async getConfig() { return db.config; },
    async setConfig(patch) { db.config = Object.assign({}, db.config, patch); flush(); },
    async close() {}
  };
}

/* ---------------- Chế độ MongoDB ---------------- */
async function mongoStore(uri) {
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'lms_promax');
  const exams = db.collection('exams');
  const results = db.collection('results');
  const config = db.collection('config');
  await results.createIndex({ at: -1 });

  return {
    kind: 'mongo',
    persistent: true,
    where: 'MongoDB (' + db.databaseName + ')',
    async getExams() {
      const doc = await exams.findOne({ _id: 'all' });
      return doc && Array.isArray(doc.list) ? doc.list : [];
    },
    async setExams(list) {
      await exams.updateOne({ _id: 'all' }, { $set: { list: list, at: Date.now() } }, { upsert: true });
      return list.length;
    },
    async addResult(r) { await results.insertOne(r); },
    async getResults() {
      return await results.find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(MAX_RESULTS).toArray();
    },
    async clearResults() { await results.deleteMany({}); },
    async getConfig() {
      const doc = await config.findOne({ _id: 'main' });
      if (!doc) return {};
      const out = Object.assign({}, doc);
      delete out._id;
      return out;
    },
    async setConfig(patch) {
      await config.updateOne({ _id: 'main' }, { $set: patch }, { upsert: true });
    },
    async close() { await client.close(); }
  };
}

/* Chọn kho phù hợp. Nếu MONGODB_URI có nhưng nối không được thì báo lỗi rõ ràng
   rồi quay về ghi file, để lớp học vẫn dùng được chứ không sập hẳn. */
async function createStore(opts) {
  const dir = (opts && opts.dir) || path.join(__dirname, '..', 'data');
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const store = await mongoStore(uri);
      console.log('✅ Kho dữ liệu: MongoDB - dữ liệu được lưu lâu dài');
      return store;
    } catch (err) {
      console.error('❌ Không kết nối được MongoDB:', err.message);
      console.error('   Tạm dùng file, dữ liệu có thể mất khi máy chủ khởi động lại.');
    }
  }
  const store = fileStore(dir);
  console.log('✅ Kho dữ liệu: file ' + store.where);
  return store;
}

module.exports = { createStore };
