package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/yourusername/taskflow/middleware"
	"github.com/yourusername/taskflow/models"
)

type DbDeps struct {
	db *sql.DB
}

func RegisterRoures(r *mux.Router, db *sql.DB, conf *models.Config) {
	handler := &DbDeps{
		db: db,
	}
	// API routes
	api := r.PathPrefix("/api").Subrouter()

	// Board routes
	api.HandleFunc("/board", middleware.AuthMiddleware(conf, handler.getBoardHandler)).Methods("GET")

	// Task routes
	api.HandleFunc("/tasks", middleware.AuthMiddleware(conf, handler.createTaskHandler)).Methods("POST")
	api.HandleFunc("/tasks/{id}", middleware.AuthMiddleware(conf, handler.getTaskHandler)).Methods("GET")
	api.HandleFunc("/tasks/{id}", middleware.AuthMiddleware(conf, handler.updateTaskHandler)).Methods("PATCH")
	api.HandleFunc("/tasks/{id}", middleware.AuthMiddleware(conf, handler.deleteTaskHandler)).Methods("DELETE")

	// User routes
	api.HandleFunc("/users", middleware.AuthMiddleware(conf, handler.getUsersHandler)).Methods("GET")

	// Notification routes
	api.HandleFunc("/notifications", middleware.AuthMiddleware(conf, handler.getNotificationsHandler)).Methods("GET")
	api.HandleFunc("/notifications/{id}/read", middleware.AuthMiddleware(conf, handler.markNotificationReadHandler)).Methods("PATCH")
}

// Board handlers
func (h *DbDeps) getBoardHandler(w http.ResponseWriter, r *http.Request) {
	// Get all columns
	rows, err := h.db.Query("SELECT id, title, position FROM columns ORDER BY position")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	columns := make(map[string]models.Column)
	columnOrder := []string{}

	for rows.Next() {
		var col models.Column
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
	taskRows, err := h.db.Query(`
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

	tasks := make(map[string]models.Task)
	for taskRows.Next() {
		var task models.Task
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
		commentRows, err := h.db.Query(`
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

		comments := []models.Comment{}
		for commentRows.Next() {
			var comment models.Comment
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

	board := models.Board{
		Tasks:       tasks,
		Columns:     columns,
		ColumnOrder: columnOrder,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(board)
}

func (h *DbDeps) createTaskHandler(w http.ResponseWriter, r *http.Request) {
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

	// Insert task into database
	now := time.Now()
	err = h.db.QueryRow(`
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
		err = h.db.QueryRow("SELECT username FROM users WHERE id = $1", task.Assignee).Scan(&username)
		if err == nil {
			task.Assignee = username
		}

		// Create notification for the assignee
		_, err = h.db.Exec(`
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

// Task handlers
func (h *DbDeps) getTaskHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	taskID := vars["id"]

	var task models.Task
	var assignee sql.NullString
	err := h.db.QueryRow(`
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
	commentRows, err := h.db.Query(`
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

	task.Comments = []models.Comment{}
	for commentRows.Next() {
		var comment models.Comment
		if err := commentRows.Scan(&comment.ID, &comment.Content, &comment.Author, &comment.CreatedAt); err != nil {
			http.Error(w, "Error scanning comments", http.StatusInternalServerError)
			return
		}
		task.Comments = append(task.Comments, comment)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func (h *DbDeps) updateTaskHandler(w http.ResponseWriter, r *http.Request) {
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
	err = h.db.QueryRow("SELECT state, assignee FROM tasks WHERE id = $1", taskID).Scan(&oldState, &assigneeID)
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
			_, err = h.db.Exec(`
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
			err = h.db.QueryRow("SELECT title FROM tasks WHERE id = $1", taskID).Scan(&taskTitle)
			if err == nil {
				_, err = h.db.Exec(`
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

	var task models.Task
	var newAssigneeID sql.NullString
	err = h.db.QueryRow(query, params...).Scan(&task.ID, &task.Title, &task.Description, &task.State, &task.Priority, &newAssigneeID, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		http.Error(w, "Error updating task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get assignee username if assignee ID exists
	if newAssigneeID.Valid {
		var username string
		err = h.db.QueryRow("SELECT username FROM users WHERE id = $1", newAssigneeID.String).Scan(&username)
		if err == nil {
			task.Assignee = username
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(task)
}

func (h *DbDeps) deleteTaskHandler(w http.ResponseWriter, r *http.Request) {
	// Only admins can delete tasks
	role := r.Context().Value("role").(string)
	if role != "admin" {
		http.Error(w, "Unauthorized", http.StatusForbidden)
		return
	}

	vars := mux.Vars(r)
	taskID := vars["id"]

	// Delete task from database
	_, err := h.db.Exec("DELETE FROM tasks WHERE id = $1", taskID)
	if err != nil {
		http.Error(w, "Error deleting task: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Task %s deleted successfully", taskID),
	})
}

func (h *DbDeps) getUsersHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query("SELECT id, username, email, role, created_at FROM users")
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt); err != nil {
			http.Error(w, "Error scanning users", http.StatusInternalServerError)
			return
		}
		users = append(users, user)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// Notification handlers
func (h *DbDeps) getNotificationsHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userId").(string)

	rows, err := h.db.Query(`
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

	notifications := []models.Notification{}
	for rows.Next() {
		var notification models.Notification
		if err := rows.Scan(&notification.ID, &notification.UserID, &notification.Message, &notification.Read, &notification.CreatedAt); err != nil {
			http.Error(w, "Error scanning notifications", http.StatusInternalServerError)
			return
		}
		notifications = append(notifications, notification)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

func (h *DbDeps) markNotificationReadHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	notificationID := vars["id"]
	userID := r.Context().Value("userId").(string)

	result, err := h.db.Exec(`
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
