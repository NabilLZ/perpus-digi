// frontend/src/pages/BookDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import '../App.css';

function BookDetailPage() {
    const [book, setBook] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { id } = useParams(); // Mengambil ID dari URL

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const response = await api.get(`/books/${id}`);
                setBook(response.data);
            } catch (error) {
                console.error("Gagal mengambil detail buku:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBook();
    }, [id]);

    if (isLoading) {
        return <div className="App-header"><div className="loader"></div></div>;
    }

    if (!book) {
        return <div className="App-header"><h1>Buku tidak ditemukan.</h1></div>;
    }

    return (
        <div className="App">
            <header className="App-header">
                <div className="book-detail-container">
                    <img src={`http://localhost:8080/${book.cover_image_url}`} alt={book.title} className="book-detail-cover" />
                    <div className="book-detail-info">
                        <h1>{book.title}</h1>
                        <h2>oleh {book.author} ({book.year})</h2>
                        <p className="book-description">{book.description}</p>
                        {book.book_file_url && (
                            <a href={`http://localhost:8080/${book.book_file_url}`} target="_blank" rel="noopener noreferrer" className="read-btn large">
                                Baca Buku
                            </a>
                        )}
                        <Link to="/" className="nav-link" style={{marginTop: '20px'}}>Kembali ke Daftar</Link>
                    </div>
                </div>
            </header>
        </div>
    );
}

export default BookDetailPage;