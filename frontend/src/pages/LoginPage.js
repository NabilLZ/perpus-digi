import React, { useState } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // <-- Import toast
import './AuthForm.css';

const LoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8080/api/auth/login', formData);
            const token = response.data.token;
            
            localStorage.setItem('token', token);
            const decodedToken = jwtDecode(token);
            localStorage.setItem('user', JSON.stringify({
                id: decodedToken.sub, // Simpan juga ID
                name: decodedToken.name,
                role: decodedToken.role
            }));

            // Ganti alert dengan toast
            toast.success(`Login berhasil! Selamat datang, ${decodedToken.name}!`);
            
            navigate('/');
        } catch (err) {
            // Ganti setError dengan toast
            toast.error('Email atau password salah.');
            console.error("Login gagal:", err);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Login</h2>
                {/* Bagian error tidak perlu lagi */}
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