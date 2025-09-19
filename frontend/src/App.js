import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Impor komponen tata letak utama
import MainLayout from './components/MainLayout';

// Impor semua halaman Anda
import BooksPage from './pages/BooksPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import BookDetailPage from './pages/BookDetailPage';

// Impor CSS utama
import './App.css';

// Penjaga Gerbang Biasa: Cukup pastikan sudah login
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Penjaga Gerbang Admin: Pastikan sudah login DAN perannya admin
const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (token && user && user.role === 'pustakawan') {
        return children; // Izinkan masuk
    } else {
        return <Navigate to="/" />; // Jika bukan admin, tendang ke halaman utama
    }
};

function App() {
  return (
    <Router>
      {/* Pindahkan ToastContainer ke sini agar selalu aktif di semua halaman */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      {/* Pengatur Lalu Lintas Halaman */}
      <Routes>
        {/* Halaman publik tidak menggunakan MainLayout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Halaman yang dilindungi sekarang dibungkus oleh MainLayout */}
        <Route 
          path="/" 
          element={<PrivateRoute><MainLayout><BooksPage /></MainLayout></PrivateRoute>} 
        />
        <Route 
          path="/books/:id" 
          element={<PrivateRoute><MainLayout><BookDetailPage /></MainLayout></PrivateRoute>} 
        />
        <Route 
          path="/admin" 
          element={<AdminRoute><MainLayout><AdminDashboard /></MainLayout></AdminRoute>} 
        />
        
        {/* Rute "tangkap semua" jika halaman tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;