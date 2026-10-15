/** Cấu hình Tailwind — bảng màu trang trọng của ngành Giáo dục. */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif']
      },
      colors: {
        navy: { DEFAULT: '#1e3a8a', dark: '#172554', light: '#dbeafe' },
        brand: { DEFAULT: '#2563eb', dark: '#1d4ed8', light: '#eff6ff' },
        accent: { DEFAULT: '#d97706', dark: '#b45309', light: '#fef3c7' },
        paper: '#f8fafc'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.06), 0 6px 20px rgba(30,58,138,.08)',
        lift: '0 2px 4px rgba(15,23,42,.08), 0 14px 32px rgba(30,58,138,.16)'
      }
    }
  },
  plugins: []
};
