/*
 * CẤU HÌNH WEBSITE TỔ GDTX
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
    apiKey: "AIzaSyCfa6NGt3g9fJ72K5E0gkvw0bh-6ykuBv4",
    authDomain: "to-toan.firebaseapp.com",
    projectId: "to-toan",
    storageBucket: "to-toan.firebasestorage.app",
    messagingSenderId: "313070570225",
    appId: "1:313070570225:web:1833bb4edbde7eae0ef750"
  },

  // Email của tài khoản quản trị duy nhất (viết thường).
  // PHẢI trùng với email trong firestore.rules.
  adminEmail: "nganh1802@gmail.com",

  // Đổi địa chỉ website: điền địa chỉ MỚI vào siteUrl (VD: "https://ten-moi.onrender.com").
  // Ai vào một trong các địa chỉ cũ ở legacyHosts sẽ tự được chuyển sang địa chỉ mới (giữ nguyên trang đang xem).
  // Để siteUrl trống = không chuyển hướng.
  siteUrl: "https://congnhanhamlo.onrender.com",
  legacyHosts: ["to-toan-portal.onrender.com", "gdtx-tuyensinh.onrender.com"],

  // (Tuỳ chọn) Mã site GoatCounter để đếm lượt truy cập ẩn danh — phần "MÃ" trong https://MÃ.goatcounter.com.
  // Cách dễ hơn: nhập ở Quản trị → Cài đặt → Thống kê lượt truy cập (không cần sửa file, không cần deploy).
  // Mã nhập ở Cài đặt được ưu tiên; để trống cả hai = KHÔNG đếm gì. Xem js/analytics.js.
  goatcounter: "",

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
