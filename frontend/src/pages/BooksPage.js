import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { toast } from 'react-toastify';

// Komponen BooksPage TIDAK lagi memiliki div <App> atau <App-header>
function BooksPage() {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState({ name: '', role: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [formData, setFormData] = useState({ title: '', author: '', year: '' });
  const [coverImage, setCoverImage] = useState(null);
  const [bookFile, setBookFile] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const navigate = useNavigate();

  const fetchBooks = useCallback(async (page, search) => {
    setIsLoading(true);
    try {
      const response = await api.get('/books', { params: { search, page, limit: 5 } });
      setBooks(response.data.data || []);
      setTotalPages(response.data.last_page);
      setCurrentPage(response.data.page);
    } catch (error) {
      toast.error("Gagal mengambil data buku.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      setUser(JSON.parse(localStorage.getItem('user')));
      fetchBooks(1, '');
    }
  }, [navigate, fetchBooks]);
  
  // SEMUA FUNGSI HANDLER DIKEMBALIKAN KE SINI
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
        toast.success(`Buku "${formData.title}" berhasil diperbarui!`);
      } else {
        await api.post('/books', submissionData, { headers: { 'Content-Type': 'multipart/form-data' }, });
        toast.success(`Buku "${formData.title}" berhasil ditambahkan!`);
      }
      setSearchTerm('');
      fetchBooks(1, '');
      handleCancelEdit();
    } catch (error) {
      toast.error("Gagal memproses buku.");
    }
  };
  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus buku ini?")) {
      try {
        await api.delete(`/books/${id}`);
        toast.success("Buku berhasil dihapus.");
        fetchBooks(currentPage, searchTerm);
      } catch (error) {
        toast.error("Gagal menghapus buku.");
      }
    }
  };
  const handleSearchSubmit = (e) => { e.preventDefault(); setCurrentPage(1); fetchBooks(1, searchTerm); };
  const handleEditClick = (book) => { setEditingBook(book); setFormData({ title: book.title, author: book.author, year: book.year }); };
  const handleCancelEdit = () => { setEditingBook(null); setFormData({ title: '', author: '', year: '' }); setCoverImage(null); setBookFile(null); if (document.querySelector('.book-form')) { document.querySelector('.book-form').reset(); }};
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); };
  const handlePageChange = (newPage) => { if (newPage >= 1 && newPage <= totalPages) { fetchBooks(newPage, searchTerm); }};

  const isAdmin = user.role === 'pustakawan';

  return (
    <>
      <div className="header-content">
          <h1>Selamat Datang, {user.name}!</h1>
          <div className="top-nav-links">
              {isAdmin && <Link to="/admin" className="nav-link">Manajemen Pengguna</Link>}
              <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
      </div>
      
      <form className="search-form" onSubmit={handleSearchSubmit}>
        <input type="text" placeholder="Cari buku atau penulis..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
      
      {isLoading ? (
        <div className="loader"></div>
      ) : (
        <div className="book-list">
          {(books || []).map(book => (
            <div key={book.id} className="book-item clickable" onClick={() => navigate(`/books/${book.id}`)}>
                {book.cover_image_url && <img src={`http://localhost:8080/${book.cover_image_url}`} alt={book.title} className="book-cover"/> }
                <div className="book-details">
                  <h3>{book.title}</h3>
                  <p>Oleh: {book.author} ({book.year})</p>
                </div>
                <div className="book-actions">
                  {book.book_file_url && <a href={`http://localhost:8080/${book.book_file_url}`} target="_blank" rel="noopener noreferrer" className="read-btn" onClick={(e) => e.stopPropagation()}>Baca</a>}
                  {isAdmin && (
                    <>
                      <button onClick={(e) => {e.stopPropagation(); handleEditClick(book)}} className="edit-btn">Ubah</button>
                      <button onClick={(e) => {e.stopPropagation(); handleDelete(book.id)}} className="delete-btn">Hapus</button>
                    </>
                  )}
                </div>
            </div>
          ))}
        </div>
      )}
      
      {!isLoading && totalPages > 1 && (
        <div className="pagination-controls">
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
            Sebelumnya
          </button>
          <span>Halaman {currentPage} dari {totalPages}</span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
            Selanjutnya
          </button>
        </div>
      )}
    </>
  );
}

export default BooksPage; 