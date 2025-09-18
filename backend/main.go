package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"
	"math"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// --- KONFIGURASI ---
const (
	host     = "localhost"
	port     = 5432
	user     = "postgres"
	password = "nabildatabase" // <-- GANTI DENGAN PASSWORD ANDA
	dbname   = "postgres"
)

var (
	db        *sql.DB
	jwtSecret = []byte("kunci_rahasia_super_aman_milik_baginda_nabil")
)

// --- MODEL DATA (STRUCTS) ---
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
	Role         string `json:"role"`
}

// STRUCT BARU untuk respons paginasi
type PaginatedBooksResponse struct {
	Total    int64  `json:"total"`
	Page     int    `json:"page"`
	LastPage int    `json:"last_page"`
	Data     []Book `json:"data"`
}

// --- FUNGSI UTAMA (ENTRY POINT) ---
func main() {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	var err error
	db, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		log.Fatal("Gagal koneksi ke DB: ", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatal("Gagal ping DB: ", err)
	}
	fmt.Println("Berhasil terhubung ke database!")

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	r.Static("/uploads", "./uploads")
	r.Static("/files", "./files")

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", registerUser)
			auth.POST("/login", loginUser)
		}

		books := api.Group("/books")
		{
			books.GET("", getBooks)
			books.POST("", createBook)
			books.PUT("/:id", updateBook)
			books.DELETE("/:id", deleteBook)
		}
	}

	r.Run()
}

// --- HANDLERS UNTUK BUKU (CRUD) ---
// Ganti seluruh fungsi getBooks Anda dengan versi final ini
func getBooks(c *gin.Context) {
	searchTerm := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	offset := (page - 1) * limit

	var total int64
	countQuery := "SELECT COUNT(*) FROM books"
	var countArgs []interface{}
	if searchTerm != "" {
		countQuery += " WHERE title ILIKE $1 OR author ILIKE $1"
		countArgs = append(countArgs, "%"+searchTerm+"%")
	}
	db.QueryRow(countQuery, countArgs...).Scan(&total)

	query := "SELECT id, title, author, publication_year, cover_image_url, book_file_url FROM books"
	var args []interface{}
	argCounter := 1 // <-- Mulai counter argumen

	if searchTerm != "" {
		query += fmt.Sprintf(" WHERE title ILIKE $%d OR author ILIKE $%d", argCounter, argCounter)
		args = append(args, "%"+searchTerm+"%")
		argCounter++
	}

	query += fmt.Sprintf(" ORDER BY id ASC LIMIT $%d OFFSET $%d", argCounter, argCounter+1)
	args = append(args, limit, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Query execution failed: " + err.Error()})
		return
	}
	defer rows.Close()

	var books []Book
	// ... (Sisa fungsi looping tetap sama)
	for rows.Next() {
		var book Book
		var coverURL, bookURL sql.NullString
		if err := rows.Scan(&book.ID, &book.Title, &book.Author, &book.Year, &coverURL, &bookURL); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memindai data buku"})
			return
		}
		book.CoverImageURL = coverURL.String
		book.BookFileURL = bookURL.String
		books = append(books, book)
	}

	if books == nil {
		books = make([]Book, 0)
	}

	lastPage := int(math.Ceil(float64(total) / float64(limit)))
	response := PaginatedBooksResponse{
		Total:    total,
		Page:     page,
		LastPage: lastPage,
		Data:     books,
	}
	c.IndentedJSON(http.StatusOK, response)
}


func createBook(c *gin.Context) {
    title := c.PostForm("title")
    author := c.PostForm("author")
    yearStr := c.PostForm("year")
    year, _ := strconv.Atoi(yearStr)

    var coverImageURL, bookFileURL string

    coverFile, err := c.FormFile("cover_image")
    if err == nil {
        filename := fmt.Sprintf("cover-%d-%s", time.Now().Unix(), coverFile.Filename)
        filepath := fmt.Sprintf("uploads/%s", filename)
        if c.SaveUploadedFile(coverFile, filepath) == nil {
            coverImageURL = filepath
        }
    }

    bookFile, err := c.FormFile("book_file")
    if err == nil {
        filename := fmt.Sprintf("book-%d-%s", time.Now().Unix(), bookFile.Filename)
        filepath := fmt.Sprintf("files/%s", filename)
        if c.SaveUploadedFile(bookFile, filepath) == nil {
            bookFileURL = filepath
        }
    }

    sqlStatement := `INSERT INTO books (title, author, publication_year, cover_image_url, book_file_url)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`
    var bookID int
    err = db.QueryRow(sqlStatement, title, author, year, coverImageURL, bookFileURL).Scan(&bookID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan buku ke database"})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"message": "Buku berhasil dibuat"})
}

func updateBook(c *gin.Context) {
    idStr := c.Param("id")
    title := c.PostForm("title")
    author := c.PostForm("author")
    yearStr := c.PostForm("year")
    year, _ := strconv.Atoi(yearStr)

    var currentCoverURL, currentFileURL sql.NullString
    err := db.QueryRow("SELECT cover_image_url, book_file_url FROM books WHERE id=$1", idStr).Scan(&currentCoverURL, &currentFileURL)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Buku tidak ditemukan"})
        return
    }

    coverImageURL := currentCoverURL.String
    bookFileURL := currentFileURL.String

    coverFile, err := c.FormFile("cover_image")
    if err == nil {
        filename := fmt.Sprintf("cover-%d-%s", time.Now().Unix(), coverFile.Filename)
        filepath := fmt.Sprintf("uploads/%s", filename)
        if c.SaveUploadedFile(coverFile, filepath) == nil {
            coverImageURL = filepath
        }
    }

    bookFile, err := c.FormFile("book_file")
    if err == nil {
        filename := fmt.Sprintf("book-%d-%s", time.Now().Unix(), bookFile.Filename)
        filepath := fmt.Sprintf("files/%s", filename)
        if c.SaveUploadedFile(bookFile, filepath) == nil {
            bookFileURL = filepath
        }
    }

    sqlStatement := `UPDATE books SET title=$1, author=$2, publication_year=$3, cover_image_url=$4, book_file_url=$5 WHERE id=$6`
    _, err = db.Exec(sqlStatement, title, author, year, coverImageURL, bookFileURL, idStr)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui buku"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Buku berhasil diperbarui"})
}

func deleteBook(c *gin.Context) {
    idStr := c.Param("id")
    _, err := db.Exec("DELETE FROM books WHERE id=$1", idStr)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus buku"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Buku berhasil dihapus"})
}


// --- HANDLERS UNTUK AUTENTIKASI ---
func registerUser(c *gin.Context) {
	var newUser User
	if err := c.BindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan salah"})
		return
	}

	var userCount int64
	db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if userCount == 0 {
		newUser.Role = "pustakawan"
	} else {
		newUser.Role = "anggota"
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengamankan password"})
		return
	}
	newUser.PasswordHash = string(hashedPassword)

	sqlStatement := `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id`
	err = db.QueryRow(sqlStatement, newUser.Name, newUser.Email, newUser.PasswordHash, newUser.Role).Scan(&newUser.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Email mungkin sudah terdaftar"})
		return
	}
	
	c.IndentedJSON(http.StatusCreated, gin.H{"message": "Registrasi berhasil."})
}

func loginUser(c *gin.Context) {
	var loginDetails User
	var storedUser User
	if err := c.BindJSON(&loginDetails); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format permintaan salah"})
		return
	}

	sqlStatement := `SELECT id, name, email, password_hash, role FROM users WHERE email=$1`
	err := db.QueryRow(sqlStatement, loginDetails.Email).Scan(&storedUser.ID, &storedUser.Name, &storedUser.Email, &storedUser.PasswordHash, &storedUser.Role)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(storedUser.PasswordHash), []byte(loginDetails.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"exp":  expirationTime.Unix(),
		"sub":  strconv.Itoa(storedUser.ID),
		"role": storedUser.Role,
		"name": storedUser.Name,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}