package models

import (
	"time"

	"github.com/golang-jwt/jwt"
)

// Config Db
type Config struct {
	DSN        string
	PORT       string
	JWT_SECRET []byte
}

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
