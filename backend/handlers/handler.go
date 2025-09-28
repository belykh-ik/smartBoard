package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"

	"belykh-ik/taskflow/middleware"
	"belykh-ik/taskflow/models"
	"belykh-ik/taskflow/service"

	"github.com/gorilla/mux"
)

type handlerDeps struct {
	board        *service.BoardDeps
	task         *service.TaskDeps
	user         *service.UserDeps
	notification *service.NotificationsDeps
	db           *sql.DB
}

func RegisterRoures(r *mux.Router, db *sql.DB, conf *models.Config, board *service.BoardDeps, task *service.TaskDeps, user *service.UserDeps, notification *service.NotificationsDeps) {
	handler := &handlerDeps{
		board:        board,
		task:         task,
		user:         user,
		notification: notification,
		db:           db,
	}
	// API routes
	api := r.PathPrefix("/api").Subrouter()

	// Board routes
	api.HandleFunc("/board", middleware.AuthMiddleware(conf, handler.getBoardHandler)).Methods("GET")
	api.HandleFunc("/board/columns", middleware.AuthMiddleware(conf, handler.updateBoardColumnsHandler)).Methods("PUT")

	// Task routes
	api.HandleFunc("/tasks", middleware.AuthMiddleware(conf, handler.createTaskHandler)).Methods("POST")
	api.HandleFunc("/tasks/{id}", middleware.AuthMiddleware(conf, handler.getTaskHandler)).Methods("GET")
	api.HandleFunc("/tasks/{id}", middleware.AuthMiddleware(conf, handler.updateTaskHandler)).Methods("PATCH")
	api.HandleFunc("/tasks/{id}", middleware.AuthMiddleware(conf, handler.deleteTaskHandler)).Methods("DELETE")
	api.HandleFunc("/tasks/{id}/comments", middleware.AuthMiddleware(conf, handler.addCommentHandler)).Methods("POST")

	// User routes
	api.HandleFunc("/users", middleware.AuthMiddleware(conf, handler.getUsersHandler)).Methods("GET")
	api.HandleFunc("/users", middleware.AuthMiddleware(conf, handler.createUserHandler)).Methods("POST")
	api.HandleFunc("/users/{id}", middleware.AuthMiddleware(conf, handler.deleteUserHandler)).Methods("DELETE")
	api.HandleFunc("/users/{id}/role", middleware.AuthMiddleware(conf, handler.updateUserRoleHandler)).Methods("PATCH")

	// Notification routes
	api.HandleFunc("/notifications", middleware.AuthMiddleware(conf, handler.getNotificationsHandler)).Methods("GET")
	api.HandleFunc("/notifications/{id}/read", middleware.AuthMiddleware(conf, handler.markNotificationReadHandler)).Methods("PATCH")
}

// Board handlers
func (h *handlerDeps) getBoardHandler(w http.ResponseWriter, r *http.Request) {
	board, err := h.board.GetBoard()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(*board)
}

func (h *handlerDeps) createTaskHandler(w http.ResponseWriter, r *http.Request) {
	// Only admins can create tasks
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	userID := r.Context().Value("userId").(string)

	var task models.Task
	err := json.NewDecoder(r.Body).Decode(&task)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = h.task.CreateTask(userID, &task) //Проверить указатель на таску
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(task)
}

// Task handlers
func (h *handlerDeps) getTaskHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]

	var task models.Task
	err := h.task.GetTask(taskID, &task)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func (h *handlerDeps) updateTaskHandler(w http.ResponseWriter, r *http.Request) {
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

	task, err := h.task.UpdateTask(taskID, updates)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(*task)
}

func (h *handlerDeps) deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	// Only admins can delete tasks
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	vars := mux.Vars(r)
	taskID := vars["id"]

	err := h.task.DeleteTask(taskID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Task %s deleted successfully", taskID),
	})
}

type addCommentRequest struct {
	Content string `json:"content"`
}

func (h *handlerDeps) addCommentHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]
	userID := r.Context().Value("userId").(string)

	var req addCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	comment, err := h.task.AddComment(userID, taskID, req.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

func (h *handlerDeps) getUsersHandler(w http.ResponseWriter, r *http.Request) {
	users, err := h.user.GetUsers()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

type createUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

func (h *handlerDeps) createUserHandler(w http.ResponseWriter, r *http.Request) {
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Username == "" || req.Email == "" || req.Password == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Role == "" {
		req.Role = "user"
	}

	user, err := h.user.CreateUser(req.Username, req.Email, req.Password, req.Role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

func (h *handlerDeps) deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}
	vars := mux.Vars(r)
	userID := vars["id"]
	if userID == "" {
		http.Error(w, "Invalid user id", http.StatusBadRequest)
		return
	}
	if err := h.user.DeleteUser(userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User deleted"})
}

type updateUserRoleRequest struct {
	Role string `json:"role"`
}

func (h *handlerDeps) updateUserRoleHandler(w http.ResponseWriter, r *http.Request) {
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}
	vars := mux.Vars(r)
	userID := vars["id"]
	if userID == "" {
		http.Error(w, "Invalid user id", http.StatusBadRequest)
		return
	}
	var req updateUserRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Role == "" {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Role != "admin" && req.Role != "user" {
		http.Error(w, "Invalid role", http.StatusBadRequest)
		return
	}
	if _, err := h.db.Exec("UPDATE users SET role = $1 WHERE id = $2", req.Role, userID); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User role updated"})
}

// Notification handlers
func (h *handlerDeps) getNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userId").(string)

	notifications, err := h.notification.GetNotification(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

func (h *handlerDeps) markNotificationReadHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	notificationID := vars["id"]
	userID := r.Context().Value("userId").(string)

	err := h.notification.MarkNotificationRead(userID, notificationID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Notification marked as read",
	})
}

func (h *handlerDeps) updateBoardColumnsHandler(w http.ResponseWriter, r *http.Request) {
	var requestData struct {
		Columns []service.ColumnUpdate `json:"columns"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if len(requestData.Columns) == 0 {
		http.Error(w, "Columns array cannot be empty", http.StatusBadRequest)
		return
	}

	err := h.board.UpdateBoardColumns(requestData.Columns)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to update columns: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Board columns updated successfully",
	})
}
