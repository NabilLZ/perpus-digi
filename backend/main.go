package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-contrib/cors" // <-- IMPORT BARU
	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

// ... (kode const, var db, dan struct Book tetap sama) ...
const (
    host     = "localhost"
    port     = 5432
    user     = "postgres"
    password = "nabildatabase" // <-- GANTI DENGAN PASSWORD ANDA
    dbname   = "postgres"
)

var db *sql.DB

type Book struct {
    ID     int    `json:"id"`
    Title  string `json:"title"`
    Author string `json:"author"`
    Year   int    `json:"year"`
}

func main() {
	// ... (kode koneksi database tetap sama) ...
    psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
        "password=%s dbname=%s sslmode=disable",
        host, port, user, password, dbname)

    var err error
    db, err = sql.Open("postgres", psqlInfo)
    if err != nil {
        log.Fatal("Failed to open a DB connection: ", err)
    }
    defer db.Close()

    err = db.Ping()
    if err != nil {
        log.Fatal("Failed to ping DB: ", err)
    }

    fmt.Println("Successfully connected to database!")

	r := gin.Default()

	// MENAMBAHKAN SURAT IZIN CORS
	r.Use(cors.Default()) // <-- BARIS BARU. Ini mengizinkan semua origin.

	api := r.Group("/api")
	{
		api.GET("/books", getBooks)
		api.POST("/books", createBook)
		api.PUT("/books/:id", updateBook)
		api.DELETE("/books/:id", deleteBook)
	}

	r.Run()
}

// ... (semua fungsi handler: getBooks, createBook, dll. tetap sama) ...
func getBooks(c *gin.Context) {
    var books []Book
    rows, err := db.Query("SELECT id, title, author, publication_year FROM books ORDER BY id ASC")
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    defer rows.Close()

    for rows.Next() {
        var book Book
        if err := rows.Scan(&book.ID, &book.Title, &book.Author, &book.Year); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        books = append(books, book)
    }
    c.IndentedJSON(http.StatusOK, books)
}

func createBook(c *gin.Context) {
    var newBook Book
    if err := c.BindJSON(&newBook); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
        return
    }
    sqlStatement := `INSERT INTO books (title, author, publication_year) VALUES ($1, $2, $3) RETURNING id`
    var bookID int
    err := db.QueryRow(sqlStatement, newBook.Title, newBook.Author, newBook.Year).Scan(&bookID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create book"})
        return
    }
    newBook.ID = bookID
    c.IndentedJSON(http.StatusCreated, newBook)
}

func updateBook(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
        return
    }

    var book Book
    if err := c.BindJSON(&book); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
        return
    }

    sqlStatement := `UPDATE books SET title=$1, author=$2, publication_year=$3 WHERE id=$4`
    _, err = db.Exec(sqlStatement, book.Title, book.Author, book.Year, id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update book"})
        return
    }

    book.ID = id
    c.JSON(http.StatusOK, book)
}

func deleteBook(c *gin.Context) {
    idStr := c.Param("id")
    id, err := strconv.Atoi(idStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid book ID"})
        return
    }

    sqlStatement := `DELETE FROM books WHERE id=$1`
    _, err = db.Exec(sqlStatement, id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete book"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Book deleted successfully"})
}