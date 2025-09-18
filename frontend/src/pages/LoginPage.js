import React, { useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode'; // <-- Impor library yang baru diinstal
import { Link, useNavigate } from 'react-router-dom';
import './AuthForm.css';

const LoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const response = await axios.post('http://localhost:8080/api/auth/login', formData);
        const token = response.data.token;
        
        // Simpan token
        localStorage.setItem('token', token);

        // BAGIAN PENTING: Bongkar token dan simpan data pengguna
        const decodedToken = jwtDecode(token);
        localStorage.setItem('user', JSON.stringify({
            name: decodedToken.name,
            role: decodedToken.role
        }));

        alert(`Login berhasil! Selamat datang, ${decodedToken.name}!`);
        navigate('/'); // Gunakan navigate, bukan window.location.href
    } catch (err) {
        setError('Email atau password salah.');
        console.error("Login gagal:", err);
    }
};

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Login</h2>
                {error && <p className="error-message">{error}</p>}
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    required
                    onChange={handleInputChange}
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                    onChange={handleInputChange}
                />
                <button type="submit">Login</button>
                <p className="auth-link">Belum punya akun? <Link to="/register">Daftar di sini</Link></p>
            </form>
        </div>
    );
};

export default LoginPage;