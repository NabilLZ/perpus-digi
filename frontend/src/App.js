import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BooksPage from './pages/BooksPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage'; // Pastikan import ini tidak dikomentari
import './App.css';

// Komponen Pembantu untuk Rute yang Dilindungi
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div>
        <Routes>
          {/* Rute publik, siapa saja bisa akses */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Rute utama (homepage) sekarang dilindungi */}
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <BooksPage />
              </PrivateRoute>
            } 
          />
          
          {/* Rute "tangkap semua" jika halaman tidak ditemukan, arahkan ke homepage */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;