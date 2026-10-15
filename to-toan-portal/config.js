/*
 * CẤU HÌNH WEBSITE TỔ TOÁN
 * ------------------------------------------------------------------
 * 1) Để TRỐNG firebaseConfig  → web chạy CHẾ ĐỘ DEMO (dữ liệu mẫu, lưu trong
 *    localStorage của trình duyệt này). Dùng để kiểm tra giao diện và luồng đăng bài.
 * 2) ĐIỀN firebaseConfig      → web tự đồng bộ với Cloud Firestore theo thời gian thực
 *    và đăng nhập quản trị bằng Firebase Authentication.
 *
 * Lưu ý: apiKey của Firebase là thông tin CÔNG KHAI theo thiết kế. Việc ai được ghi dữ liệu
 * do firestore.rules quyết định, không phải do giấu apiKey.
 */
window.SITE_CONFIG = {
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // Email của tài khoản quản trị duy nhất (viết thường).
  // PHẢI trùng với email trong firestore.rules.
  adminEmail: "",

  // Phiên bản Firebase JS SDK tải từ CDN (chỉ tải khi chạy chế độ Firebase).
  firebaseVersion: "10.14.1",

  // (Nâng cao, tuỳ chọn) Nếu mạng chặn www.gstatic.com: đóng gói SDK thành 3 module ESM tên
  // firebase-app.js, firebase-auth.js, firebase-firestore.js (VD: esbuild --bundle --splitting --format=esm),
  // đặt lên máy chủ của bạn rồi điền địa chỉ thư mục chứa chúng vào đây.
  firebaseBaseUrl: "",

  // Tài khoản đăng nhập của CHẾ ĐỘ DEMO (không dùng khi đã điền firebaseConfig).
  demo: {
    email: "admin@demo.local",
    password: "demo123"
  }
};
