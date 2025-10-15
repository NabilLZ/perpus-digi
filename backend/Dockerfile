# --- Tahap 1: Build Aplikasi ---
# Gunakan image resmi Go (versi yang sesuai dengan go.mod Anda, misal 1.24)
FROM golang:1.24-alpine AS builder

# Set direktori kerja di dalam kontainer
WORKDIR /app

# Salin file go.mod dan go.sum untuk mengunduh dependensi
COPY go.mod go.sum ./
RUN go mod download

# Salin semua sisa kode sumber
COPY . .

# Build aplikasi Go menjadi satu file executable
RUN CGO_ENABLED=0 GOOS=linux go build -o /server .

# --- Tahap 2: Deploy Aplikasi ---
# Gunakan image Alpine Linux yang sangat kecil sebagai basis akhir
FROM alpine:latest
WORKDIR /
# Salin HANYA file 'server' yang sudah jadi dari tahap "builder"
COPY --from=builder /server /server
# Salin juga folder uploads dan files
COPY uploads ./uploads
COPY files ./files
# Buka port 8080
EXPOSE 8080
# Perintah untuk menjalankan server saat kontainer dimulai
CMD ["/server"]