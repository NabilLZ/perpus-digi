import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; // <-- TAMBAHKAN 'Link' DI SINI
import '../App.css';

const api = axios.create({ baseURL: 'http://localhost:8080/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function BooksPage() {
  const [books, setBooks] = useState([]);
  const [user, setUser] = useState({ name: '', role: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [formData, setFormData] = useState({ title: '', author: '', year: '' });
  const [coverImage, setCoverImage] = useState(null);
  const [bookFile, setBookFile] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const navigate = useNavigate();

  // Gunakan useCallback untuk stabilitas fungsi
  const fetchBooks = useCallback(async (page, search) => {
    try {
      const response = await api.get('/books', {
        params: { search, page, limit: 5 }
      });
      setBooks(response.data.data || []);
      setTotalPages(response.data.last_page);
      setCurrentPage(response.data.page);
    } catch (error) {
      console.error("Gagal mengambil data buku:", error);
    }
  }, []);

  // useEffect utama untuk otentikasi dan pengambilan data awal
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      setUser(JSON.parse(localStorage.getItem('user')));
      fetchBooks(1, ''); // Ambil data halaman 1 saat pertama dimuat
    }
  }, [navigate, fetchBooks]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBooks(1, searchTerm);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchBooks(newPage, searchTerm);
    }
  };
  
  // ... (semua fungsi handler lainnya tetap sama) ...
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const finalValue = name === 'year' ? parseInt(value, 10) || '' : value;
    setFormData({ ...formData, [name]: finalValue });
  };
  const handleCoverImageChange = (event) => { setCoverImage(event.target.files[0]); };
  const handleBookFileChange = (event) => { setBookFile(event.target.files[0]); };
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const submissionData = new FormData();
    submissionData.append('title', formData.title);
    submissionData.append('author', formData.author);
    submissionData.append('year', formData.year);
    if (coverImage) submissionData.append('cover_image', coverImage);
    if (bookFile) submissionData.append('book_file', bookFile);
    try {
      if (editingBook) {
        await api.put(`/books/${editingBook.id}`, submissionData, { headers: { 'Content-Type': 'multipart/form-data' }, });
      } else {
        await api.post('/books', submissionData, { headers: { 'Content-Type': 'multipart/form-data' }, });
      }
      setSearchTerm('');
      fetchBooks(1, '');
      handleCancelEdit();
    } catch (error) {
      console.error("Gagal memproses buku:", error);
    }
  };
  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus buku ini?")) {
        try {
            await api.delete(`/books/${id}`);
            fetchBooks(currentPage, searchTerm);
        } catch (error) {
            console.error("Gagal menghapus buku:", error);
        }
    }
  };
  const handleEditClick = (book) => {
    setEditingBook(book);
    setFormData({ title: book.title, author: book.author, year: book.year });
  };
  const handleCancelEdit = () => {
    setEditingBook(null);
    setFormData({ title: '', author: '', year: '' });
    setCoverImage(null);
    setBookFile(null);
    document.querySelector('.book-form').reset();
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAdmin = user.role === 'pustakawan';

  return (
    <div className="App">
      <header className="App-header">
          <div className="header-content">
              <h1>Selamat Datang, {user.name}!</h1>
              <div className="top-nav-links">
                  {/* LINK BARU HANYA UNTUK ADMIN */}
                  {isAdmin && <Link to="/admin" className="nav-link">Manajemen Pengguna</Link>}
                  <button onClick={handleLogout} className="logout-btn">Logout</button>
              </div>
          </div>
        
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input type="text" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button type="submit">Cari</button>
        </form>

        {isAdmin && (
             <form onSubmit={handleFormSubmit} className="book-form" encType="multipart/form-data">
                <h3>{editingBook ? `Mengubah: ${editingBook.title}` : 'Tambah Buku Baru'}</h3>
                <input type="text" name="title" placeholder="Judul" value={formData.title} onChange={handleInputChange} required />
                <input type="text" name="author" placeholder="Penulis" value={formData.author} onChange={handleInputChange} required />
                <input type="number" name="year" placeholder="Tahun Terbit" value={formData.year} onChange={handleInputChange} required />
                <label>Sampul Buku (Opsional)</label>
                <input type="file" name="cover_image" onChange={handleCoverImageChange} />
                <label>File Buku (Opsional)</label>
                <input type="file" name="book_file" onChange={handleBookFileChange} />
                <div className="form-buttons">
                    <button type="submit">{editingBook ? 'Simpan Perubahan' : 'Tambah'}</button>
                    {editingBook && <button type="button" onClick={handleCancelEdit} className="cancel-btn">Batal</button>}
                </div>
            </form>
        )}

        <div className="book-list">
            {(books || []).map(book => (
              <div key={book.id} className="book-item">
                {book.cover_image_url && <img src={`http://localhost:8080/${book.cover_image_url}`} alt={book.title} className="book-cover"/> }
                <div className="book-details">
                  <h3>{book.title}</h3>
                  <p>Oleh: {book.author} ({book.year})</p>
                </div>
                <div className="book-actions">
                  {book.book_file_url && <a href={`http://localhost:8080/${book.book_file_url}`} target="_blank" rel="noopener noreferrer" className="read-btn">Baca</a>}
                  {isAdmin && (
                    <>
                      <button onClick={() => handleEditClick(book)} className="edit-btn">Ubah</button>
                      <button onClick={() => handleDelete(book.id)} className="delete-btn">Hapus</button>
                    </>
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="pagination-controls">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
            Sebelumnya
          </button>
          <span>Halaman {currentPage} dari {totalPages}</span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
            Selanjutnya
          </button>
        </div>
      </header>
    </div>
  );
}

export default BooksPage;