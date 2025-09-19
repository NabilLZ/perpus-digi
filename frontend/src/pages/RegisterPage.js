import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // <-- Import toast
import './AuthForm.css';

const RegisterPage = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8080/api/auth/register', formData);
            
            // Ganti alert dengan toast
            toast.success('Registrasi berhasil! Silakan login.');

            navigate('/login'); // Arahkan ke halaman login setelah berhasil
        } catch (err) {
            // Ganti setError dengan toast
            toast.error('Gagal melakukan registrasi. Email mungkin sudah digunakan.');
            console.error("Registrasi gagal:", err);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Registrasi</h2>
                {/* Bagian error tidak perlu lagi */}
                <input type="text" name="name" placeholder="Nama Lengkap" required onChange={handleInputChange} />
                <input type="email" name="email" placeholder="Email" required onChange={handleInputChange} />
                <input type="password" name="password" placeholder="Password" required onChange={handleInputChange} />
                <button type="submit">Daftar</button>
                <p className="auth-link">Sudah punya akun? <Link to="/login">Login di sini</Link></p>
            </form>
        </div>
    );
};

export default RegisterPage;