import axios from 'axios';

// 1. Membuat instance Axios dengan konfigurasi dasar
const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// 2. Interceptor: "Penjaga" yang akan "mencegat" setiap permintaan keluar.
// Tujuannya adalah untuk menambahkan token otorisasi secara otomatis.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    // Jika ada token di penyimpanan browser, tambahkan ke header Authorization
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 3. Ekspor instance 'api' agar bisa digunakan di file lain
export default api;