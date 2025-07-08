package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"belykh-ik/taskflow/middleware"
	"belykh-ik/taskflow/models"

	"github.com/golang-jwt/jwt"
	"github.com/gorilla/mux"
)

type AuthDbDeps struct {
	db   *sql.DB
	conf *models.Config
}

func RegisterAuthRoures(r *mux.Router, db *sql.DB, conf *models.Config) {
	handler := &AuthDbDeps{
		db:   db,
		conf: conf,
	}
	// API routes
	api := r.PathPrefix("/api").Subrouter()

	// Auth routes
	api.HandleFunc("/auth/register", handler.registerHandler).Methods("POST")
	api.HandleFunc("/auth/login", handler.loginHandler).Methods("POST")
	api.HandleFunc("/auth/me", middleware.AuthMiddleware(conf, handler.getCurrentUserHandler)).Methods("GET")

}

// Authentication handlers
func (h *AuthDbDeps) registerHandler(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var count int
	err := h.db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", req.Email).Scan(&count)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if count > 0 {
		http.Error(w, "Email already in use", http.StatusBadRequest)
		return
	}

	// Store password directly without hashing
	password := req.Password

	// Determine role (first user is admin, rest are users)
	role := "user"
	err = h.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if count == 0 {
		role = "admin"
	}

	// Insert user
	var userID string
	err = h.db.QueryRow(
		"INSERT INTO users (username, email, password, role, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		req.Username, req.Email, password, role, time.Now(),
	).Scan(&userID)

	if err != nil {
		http.Error(w, "Error creating user", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "User registered successfully",
	})
}

func (h *AuthDbDeps) loginHandler(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get user by email
	var user models.User
	var password string
	err := h.db.QueryRow(
		"SELECT id, username, email, password, role, created_at FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Username, &user.Email, &password, &user.Role, &user.CreatedAt)

	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Check password directly without hashing
	if password != req.Password {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate JWT token
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &models.Claims{
		UserID: user.ID,
		Role:   user.Role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(h.conf.JWT_SECRET)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	// Return token and user
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.AuthResponse{
		Token: tokenString,
		User:  user,
	})
}

func (h *AuthDbDeps) getCurrentUserHandler(w http.ResponseWriter, r *http.Request) {
	// User is already authenticated by middleware
	userID := r.Context().Value("userId").(string)

	var user models.User
	err := h.db.QueryRow(
		"SELECT id, username, email, role, created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt)

	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
