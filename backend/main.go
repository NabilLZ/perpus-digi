package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time" // <-- Tambahkan ini untuk waktu token

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5" // <-- Tambahkan ini untuk JWT
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// ... (const, var db, struct Book, struct User tetap sama) ...
const (
	host     = "localhost"
	port     = 5432
	user     = "postgres"
	password = "nabildatabase" // <-- GANTI DENGAN PASSWORD ANDA
	dbname   = "postgres"
)

var db *sql.DB

// KUNCI RAHASIA UNTUK TOKEN JWT ANDA (Bisa diganti dengan string acak apa pun)
var jwtSecret = []byte("kunci_rahasia_super_aman_milik_baginda_nabil")

type Book struct {
	ID            int    `json:"id"`
	Title         string `json:"title"`
	Author        string `json:"author"`
	Year          int    `json:"year"`
	CoverImageURL string `json:"cover_image_url"`
	BookFileURL   string `json:"book_file_url"`
}

type User struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	Password     string `json:"password,omitempty"`
	PasswordHash string `json:"-"`
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
	r.Use(cors.Default())

	apiBooks := r.Group("/api/books")
	{
		apiBooks.GET("", getBooks)
		apiBooks.POST("", createBook)
		apiBooks.PUT("/:id", updateBook)
		apiBooks.DELETE("/:id", deleteBook)
	}

	apiAuth := r.Group("/api/auth")
	{
		apiAuth.POST("/register", registerUser)
		apiAuth.POST("/login", loginUser) // <-- RUTE BARU UNTUK LOGIN
	}

	r.Run()
}

// FUNGSI BARU UNTUK LOGIN
func loginUser(c *gin.Context) {
	var loginDetails User
	var storedUser User

	if err := c.BindJSON(&loginDetails); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// 1. Cari pengguna berdasarkan email
	sqlStatement := `SELECT id, name, email, password_hash FROM users WHERE email=$1`
	err := db.QueryRow(sqlStatement, loginDetails.Email).Scan(&storedUser.ID, &storedUser.Name, &storedUser.Email, &storedUser.PasswordHash)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 2. Bandingkan password yang diberikan dengan hash di database
	err = bcrypt.CompareHashAndPassword([]byte(storedUser.PasswordHash), []byte(loginDetails.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// 3. Jika password cocok, buat token JWT
	// Token akan valid selama 24 jam
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(expirationTime),
		Subject:   strconv.Itoa(storedUser.ID), // Simpan ID pengguna di dalam token
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	// 4. Kirim token sebagai respons
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

// ... (semua fungsi handler lain tetap sama) ...
func registerUser(c *gin.Context) {
	var newUser User
	if err := c.BindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	newUser.PasswordHash = string(hashedPassword)
	sqlStatement := `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`
	err = db.QueryRow(sqlStatement, newUser.Name, newUser.Email, newUser.PasswordHash).Scan(&newUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}
	newUser.Password = ""
	c.IndentedJSON(http.StatusCreated, newUser)
}

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