import React from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BooksPage from './pages/BooksPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

// Penjaga Gerbang Biasa: Cukup pastikan sudah login
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// PENJAGA GERBANG BARU YANG LEBIH PINTAR: Pastikan sudah login DAN perannya admin
const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Cek apakah ada token DAN peran pengguna adalah 'pustakawan'
    if (token && user && user.role === 'pustakawan') {
        return children; // Izinkan masuk
    } else {
        return <Navigate to="/" />; // Jika bukan admin, tendang ke halaman utama
    }
};

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route 
            path="/" 
            element={<PrivateRoute><BooksPage /></PrivateRoute>} 
          />
          
          {/* RUTE ADMIN SEKARANG DIJAGA OLEH PENJAGA BARU */}
          <Route 
            path="/admin" 
            element={<AdminRoute><AdminDashboard /></AdminRoute>} 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;