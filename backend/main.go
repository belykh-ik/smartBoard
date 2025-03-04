package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
	"strings"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
	"github.com/dgrijalva/jwt-go"
)

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
}

// Task represents a task in the system
type Task struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	State       string    `json:"state"`
	Priority    int       `json:"priority"`
	Assignee    string    `json:"assignee,omitempty"`
	Comments    []Comment `json:"comments,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Comment represents a comment on a task
type Comment struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"createdAt"`
}

// Notification represents a notification in the system
type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Message   string    `json:"message"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"createdAt"`
}

// Column represents a column in the kanban board
type Column struct {
	ID      string   `json:"id"`
	Title   string   `json:"title"`
	TaskIDs []string `json:"taskIds"`
}

// Board represents the entire kanban board
type Board struct {
	Tasks       map[string]Task   `json:"tasks"`
	Columns     map[string]Column `json:"columns"`
	ColumnOrder []string          `json:"columnOrder"`
}

// Claims represents the JWT claims
type Claims struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RegisterRequest represents the register request body
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

var db *sql.DB
var jwtSecret []byte

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	// Set JWT secret
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("your_jwt_secret_key_change_in_production")
		log.Println("Warning: Using default JWT secret")
	}

	// Connect to PostgreSQL
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@postgres:5432/taskflow?sslmode=disable"
	}

	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Check database connection
	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to PostgreSQL database")

	// Initialize router
	r := mux.NewRouter()

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	
	// Auth routes
	api.HandleFunc("/auth/register", registerHandler).Methods("POST")
	api.HandleFunc("/auth/login", loginHandler).Methods("POST")
	api.HandleFunc("/auth/me", authMiddleware(getCurrentUserHandler)).Methods("GET")
	
	// Board routes
	api.HandleFunc("/board", authMiddleware(getBoardHandler)).Methods("GET")
	
	// Task routes
	api.HandleFunc("/tasks", authMiddleware(createTaskHandler)).Methods("POST")
	api.HandleFunc("/tasks/{id}", authMiddleware(getTaskHandler)).Methods("GET")
	api.HandleFunc("/tasks/{id}", authMiddleware(updateTaskHandler)).Methods("PATCH")
	api.HandleFunc("/tasks/{id}", authMiddleware(deleteTaskHandler)).Methods("DELETE")
	
	// User routes
	api.HandleFunc("/users", authMiddleware(getUsersHandler)).Methods("GET")
	
	// Notification routes
	api.HandleFunc("/notifications", authMiddleware(getNotificationsHandler)).Methods("GET")
	api.HandleFunc("/notifications/{id}/read", authMiddleware(markNotificationReadHandler)).Methods("PATCH")

	// CORS configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, c.Handler(r)))
}

// Authentication handlers
func registerHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if email already exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM users WHERE email = $1", req.Email).Scan(&count)
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
	err = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if count == 0 {
		role = "admin"
	}

	// Insert user
	var userID string
	err = db.QueryRow(
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

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get user by email
	var user User
	var password string
	err := db.QueryRow(
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
	claims := &Claims{
		UserID: user.ID,
		Role:   user.Role,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	// Return token and user
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{
		Token: tokenString,
		User:  user,
	})
}

func getCurrentUserHandler(w http.ResponseWriter, r *http.Request) {
	// User is already authenticated by middleware
	userID := r.Context().Value("userId").(string)

	var user User
	err := db.QueryRow(
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

func getUsersHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, username, email, role, created_at FROM users")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []User{}
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt); err != nil {
			http.Error(w, "Error scanning users", http.StatusInternalServerError)
			return
		}
		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// Board handlers
func getBoardHandler(w http.ResponseWriter, r *http.Request) {
	// Get all columns
	rows, err := db.Query("SELECT id, title, position FROM columns ORDER BY position")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	columns := make(map[string]Column)
	columnOrder := []string{}

	for rows.Next() {
		var col Column
		var position int
		if err := rows.Scan(&col.ID, &col.Title, &position); err != nil {
			http.Error(w, "Error scanning columns", http.StatusInternalServerError)
			return
		}
		col.TaskIDs = []string{}
		columns[col.ID] = col
		columnOrder = append(columnOrder, col.ID)
	}

	// Get all tasks
	taskRows, err := db.Query(`
		SELECT t.id, t.title, t.description, t.state, t.priority, u.username as assignee, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN users u ON t.assignee = u.id
		ORDER BY t.created_at DESC
	`)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer taskRows.Close()

	tasks := make(map[string]Task)
	for taskRows.Next() {
		var task Task
		var assignee sql.NullString
		if err := taskRows.Scan(&task.ID, &task.Title, &task.Description, &task.State, &task.Priority, &assignee, &task.CreatedAt, &task.UpdatedAt); err != nil {
			http.Error(w, "Error scanning tasks", http.StatusInternalServerError)
			return
		}

		if assignee.Valid {
			task.Assignee = assignee.String
		}

		tasks[task.ID] = task

		// Add task ID to column
		if col, exists := columns[task.State]; exists {
			col.TaskIDs = append(col.TaskIDs, task.ID)
			columns[task.State] = col
		}
	}

	// Get comments for each task
	for taskID, task := range tasks {
		commentRows, err := db.Query(`
			SELECT c.id, c.content, u.username as author, c.created_at
			FROM comments c
			JOIN users u ON c.author = u.id
			WHERE c.task_id = $1
			ORDER BY c.created_at DESC
		`, taskID)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		comments := []Comment{}
		for commentRows.Next() {
			var comment Comment
			if err := commentRows.Scan(&comment.ID, &comment.Content, &comment.Author, &comment.CreatedAt); err != nil {
				commentRows.Close()
				http.Error(w, "Error scanning comments", http.StatusInternalServerError)
				return
			}
			comments = append(comments, comment)
		}
		commentRows.Close()

		task.Comments = comments
		tasks[taskID] = task
	}

	board := Board{
		Tasks:       tasks,
		Columns:     columns,
		ColumnOrder: columnOrder,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(board)
}

// Task handlers
func getTaskHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]

	var task Task
	var assignee sql.NullString
	err := db.QueryRow(`
		SELECT t.id, t.title, t.description, t.state, t.priority, u.username as assignee, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN users u ON t.assignee = u.id
		WHERE t.id = $1
	`, taskID).Scan(&task.ID, &task.Title, &task.Description, &task.State, &task.Priority, &assignee, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	if assignee.Valid {
		task.Assignee = assignee.String
	}

	// Get comments for the task
	commentRows, err := db.Query(`
		SELECT c.id, c.content, u.username as author, c.created_at
		FROM comments c
		JOIN users u ON c.author = u.id
		WHERE c.task_id = $1
		ORDER BY c.created_at DESC
	`, taskID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer commentRows.Close()

	task.Comments = []Comment{}
	for commentRows.Next() {
		var comment Comment
		if err := commentRows.Scan(&comment.ID, &comment.Content, &comment.Author, &comment.CreatedAt); err != nil {
			http.Error(w, "Error scanning comments", http.StatusInternalServerError)
			return
		}
		task.Comments = append(task.Comments, comment)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func createTaskHandler(w http.ResponseWriter, r *http.Request) {
	// Only admins can create tasks
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	userID := r.Context().Value("userId").(string)

	var task Task
	err := json.NewDecoder(r.Body).Decode(&task)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Insert task into database
	now := time.Now()
	err = db.QueryRow(`
		INSERT INTO tasks (title, description, state, priority, assignee, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`, task.Title, task.Description, task.State, task.Priority, task.Assignee, userID, now, now).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		http.Error(w, "Error creating task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get assignee username
	if task.Assignee != "" {
		var username string
		err = db.QueryRow("SELECT username FROM users WHERE id = $1", task.Assignee).Scan(&username)
		if err == nil {
			task.Assignee = username
		}
		
		// Create notification for the assignee
		_, err = db.Exec(`
			INSERT INTO notifications (user_id, message, read, created_at)
			VALUES ($1, $2, false, $3)
		`, task.Assignee, fmt.Sprintf("Вам назначена новая задача: %s", task.Title), now)
		
		if err != nil {
			log.Printf("Error creating notification: %v", err)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(task)
}

func updateTaskHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]

	var updates map[string]interface{}
	err := json.NewDecoder(r.Body).Decode(&updates)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Check if user is admin or just updating state
	role := r.Context().Value("role").(string)
	if role != "admin" {
		// Regular users can only update state
		if _, stateExists := updates["state"]; !stateExists || len(updates) > 1 {
			http.Error(w, "Unauthorized: Regular users can only update task state", http.StatusForbidden)
			return
		}
	}

	// Get the current task state and assignee before update
	var oldState string
	var assigneeID sql.NullString
	err = db.QueryRow("SELECT state, assignee FROM tasks WHERE id = $1", taskID).Scan(&oldState, &assigneeID)
	if err != nil {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	// Update task in database
	query := "UPDATE tasks SET updated_at = NOW()"
	params := []interface{}{}
	paramCount := 1

	if state, ok := updates["state"].(string); ok {
		query += fmt.Sprintf(", state = $%d", paramCount)
		params = append(params, state)
		paramCount++
		
		// If state has changed, create a notification for the assignee
		if state != oldState && assigneeID.Valid {
			_, err = db.Exec(`
				INSERT INTO notifications (user_id, message, read, created_at)
				VALUES ($1, $2, false, $3)
			`, assigneeID.String, fmt.Sprintf("Статус вашей задачи изменен на: %s", state), time.Now())
			
			if err != nil {
				log.Printf("Error creating notification: %v", err)
			}
		}
	}

	if title, ok := updates["title"].(string); ok {
		query += fmt.Sprintf(", title = $%d", paramCount)
		params = append(params, title)
		paramCount++
	}

	if description, ok := updates["description"].(string); ok {
		query += fmt.Sprintf(", description = $%d", paramCount)
		params = append(params, description)
		paramCount++
	}

	if priority, ok := updates["priority"].(float64); ok {
		query += fmt.Sprintf(", priority = $%d", paramCount)
		params = append(params, int(priority))
		paramCount++
	}

	if assignee, ok := updates["assignee"].(string); ok {
		query += fmt.Sprintf(", assignee = $%d", paramCount)
		params = append(params, assignee)
		paramCount++
		
		// If assignee has changed, create a notification for the new assignee
		if assignee != "" && (!assigneeID.Valid || assignee != assigneeID.String) {
			var taskTitle string
			err = db.QueryRow("SELECT title FROM tasks WHERE id = $1", taskID).Scan(&taskTitle)
			if err == nil {
				_, err = db.Exec(`
					INSERT INTO notifications (user_id, message, read, created_at)
					VALUES ($1, $2, false, $3)
				`, assignee, fmt.Sprintf("Вам назначена задача: %s", taskTitle), time.Now())
				
				if err != nil {
					log.Printf("Error creating notification: %v", err)
				}
			}
		}
	}

	query += fmt.Sprintf(" WHERE id = $%d RETURNING id, title, description, state, priority, assignee, created_at, updated_at", paramCount)
	params = append(params, taskID)

	var task Task
	var newAssigneeID sql.NullString
	err = db.QueryRow(query, params...).Scan(&task.ID, &task.Title, &task.Description, &task.State, &task.Priority, &newAssigneeID, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		http.Error(w, "Error updating task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get assignee username if assignee ID exists
	if newAssigneeID.Valid {
		var username string
		err = db.QueryRow("SELECT username FROM users WHERE id = $1", newAssigneeID.String).Scan(&username)
		if err == nil {
			task.Assignee = username
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	// Only admins can delete tasks
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	vars := mux.Vars(r)
	taskID := vars["id"]

	// Delete task from database
	_, err := db.Exec("DELETE FROM tasks WHERE id = $1", taskID)
	if err != nil {
		http.Error(w, "Error deleting task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Task %s deleted successfully", taskID),
	})
}

// Notification handlers
func getNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userId").(string)
	
	rows, err := db.Query(`
		SELECT id, user_id, message, read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	
	notifications := []Notification{}
	for rows.Next() {
		var notification Notification
		if err := rows.Scan(&notification.ID, &notification.UserID, &notification.Message, &notification.Read, &notification.CreatedAt); err != nil {
			http.Error(w, "Error scanning notifications", http.StatusInternalServerError)
			return
		}
		notifications = append(notifications, notification)
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

func markNotificationReadHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	notificationID := vars["id"]
	userID := r.Context().Value("userId").(string)
	
	result, err := db.Exec(`
		UPDATE notifications
		SET read = true
		WHERE id = $1 AND user_id = $2
	`, notificationID, userID)
	
	if err != nil {
		http.Error(w, "Error updating notification", http.StatusInternalServerError)
		return
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Notification not found or not owned by user", http.StatusNotFound)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Notification marked as read",
	})
}

// Middleware
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Get token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Extract token from "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		tokenString := tokenParts[1]

		// Parse and validate token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Add user ID and role to request context
		ctx := r.Context()
		ctx = context.WithValue(ctx, "userId", claims.UserID)
		ctx = context.WithValue(ctx, "role", claims.Role)

		// Call the next handler with the updated context
		next(w, r.WithContext(ctx))
	}
}

func adminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role := r.Context().Value("role").(string)
		if role != "admin" {
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}
		next(w, r)
	}
}