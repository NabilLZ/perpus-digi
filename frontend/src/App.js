import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [books, setBooks] = useState([]);
  const [formData, setFormData] = useState({ title: '', author: '', year: '' });
  // State baru untuk melacak mode: null (tambah) atau object buku (edit)
  const [editingBook, setEditingBook] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/books');
      setBooks(response.data || []);
    } catch (error) {
      console.error("Gagal mengambil data buku:", error);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const finalValue = name === 'year' ? parseInt(value, 10) || '' : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!formData.title || !formData.author || !formData.year) {
      alert("Semua field harus diisi!");
      return;
    }

    // Jika sedang dalam mode edit, panggil handleUpdate. Jika tidak, panggil handleCreate.
    if (editingBook) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const handleCreate = async () => {
    try {
      await axios.post('http://localhost:8080/api/books', formData);
      fetchBooks();
      setFormData({ title: '', author: '', year: '' });
    } catch (error) {
      console.error("Gagal menambah buku:", error);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`http://localhost:8080/api/books/${editingBook.id}`, formData);
      fetchBooks();
      setFormData({ title: '', author: '', year: '' }); // Kosongkan form
      setEditingBook(null); // Keluar dari mode edit
    } catch (error) {
      console.error("Gagal memperbarui buku:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/api/books/${id}`);
      fetchBooks();
    } catch (error) {
      console.error("Gagal menghapus buku:", error);
    }
  };

  // Fungsi untuk masuk ke mode edit
  const handleEditClick = (book) => {
    setEditingBook(book); // Set buku yang akan diedit
    setFormData({ title: book.title, author: book.author, year: book.year }); // Isi form dengan data buku
  };

  // Fungsi untuk membatalkan mode edit
  const handleCancelEdit = () => {
    setEditingBook(null);
    setFormData({ title: '', author: '', year: '' });
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Perpustakaan Digital</h1>

        <form onSubmit={handleFormSubmit} className="book-form">
          {/* Judul form berubah sesuai mode */}
          <h3>{editingBook ? 'Ubah Data Buku' : 'Tambah Buku Baru'}</h3>
          <input
            type="text" name="title" placeholder="Judul"
            value={formData.title} onChange={handleInputChange}
          />
          <input
            type="text" name="author" placeholder="Penulis"
            value={formData.author} onChange={handleInputChange}
          />
          <input
            type="number" name="year" placeholder="Tahun Terbit"
            value={formData.year} onChange={handleInputChange}
          />
          <div className="form-buttons">
            <button type="submit">{editingBook ? 'Simpan Perubahan' : 'Tambah'}</button>
            {/* Tombol batal hanya muncul saat mode edit */}
            {editingBook && <button type="button" onClick={handleCancelEdit} className="cancel-btn">Batal</button>}
          </div>
        </form>

        <div className="book-list">
          {(books || []).map(book => (
            <div key={book.id} className="book-item">
              <div>
                <h3>{book.title}</h3>
                <p>Oleh: {book.author} ({book.year})</p>
              </div>
              <div className="book-actions">
                <button onClick={() => handleEditClick(book)} className="edit-btn">Ubah</button>
                <button onClick={() => handleDelete(book.id)} className="delete-btn">Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}

export default App;