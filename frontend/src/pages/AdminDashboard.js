import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data || []);
        } catch (error) {
            console.error("Gagal mengambil data pengguna:", error);
            alert("Anda tidak memiliki akses ke halaman ini atau terjadi kesalahan.");
            navigate('/');
        }
    };

    const handleDelete = async (userId) => {
        // Ganti ID 5 dengan ID super admin Anda jika berbeda
        if (userId === 5) { 
            alert("Super admin tidak dapat dihapus.");
            return;
        }
        if (window.confirm(`Yakin ingin menghapus pengguna dengan ID ${userId}?`)) {
            try {
                const response = await api.delete(`/admin/users/${userId}`);
                alert(response.data.message || "Pengguna berhasil dihapus.");
                fetchUsers();
            } catch (error) {
                console.error("Gagal menghapus pengguna:", error);
                alert(error.response.data.error || "Gagal menghapus pengguna.");
            }
        }
    };
    
    const handleRoleChange = async (userId, currentRole) => {
        // Ganti ID 5 dengan ID super admin Anda jika berbeda
        if (userId === 5) {
            alert("Peran super admin tidak dapat diubah.");
            return;
        }
        const newRole = currentRole === 'pustakawan' ? 'anggota' : 'pustakawan';
        if (window.confirm(`Yakin ingin mengubah peran pengguna ini menjadi ${newRole}?`)) {
            try {
                const response = await api.put(`/admin/users/${userId}`, { role: newRole });
                
                const currentUser = JSON.parse(localStorage.getItem('user'));
                // Pastikan currentUser ada sebelum mengakses propertinya
                if (currentUser && currentUser.name === response.data.name) {
                    localStorage.setItem('user', JSON.stringify(response.data));
                    alert("Peran Anda telah diubah. Halaman akan dimuat ulang.");
                    window.location.reload();
                } else {
                    alert("Peran pengguna berhasil diubah.");
                    fetchUsers();
                }
            } catch (error) {
                console.error("Gagal mengubah peran:", error);
                alert("Gagal mengubah peran pengguna.");
            }
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <div className="header-content">
                    <h1>Manajemen Pengguna</h1>
                    <Link to="/" className="nav-link">Kembali ke Perpustakaan</Link>
                </div>
                
                <div className="user-table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nama</th>
                                <th>Email</th>
                                <th>Peran</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(users).map(user => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td className="action-cell">
                                        <button 
                                            onClick={() => handleRoleChange(user.id, user.role)} 
                                            className="edit-btn"
                                            disabled={user.id === 5} // ID Super Admin Anda
                                        >
                                            {user.role === 'pustakawan' ? 'Jadikan Anggota' : 'Jadikan Admin'}
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user.id)} 
                                            className="delete-btn"
                                            disabled={user.id === 5} // ID Super Admin Anda
                                        >
                                            Hapus
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </header>
        </div>
    );
}

export default AdminDashboard;