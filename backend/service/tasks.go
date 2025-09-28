package service

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"belykh-ik/taskflow/models"
)

type TaskDeps struct {
	db *sql.DB
}

func NewTaskDeps(db *sql.DB) *TaskDeps {
	return &TaskDeps{
		db: db,
	}
}

func (t TaskDeps) CreateTask(userID string, task *models.Task) error {
	// If no assignee is specified, set state to backlog
	if task.Assignee == "" || task.Assignee == "null" {
		task.State = "backlog"
		task.Assignee = ""
	}

	// Insert task into database
	now := time.Now()
	var assignee interface{}
	if task.Assignee != "" && task.Assignee != "null" {
		assignee = task.Assignee
	} else {
		assignee = nil
	}

	err := t.db.QueryRow(`
		INSERT INTO tasks (title, description, state, priority, assignee, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at
	`, task.Title, task.Description, task.State, task.Priority, assignee, userID, now, now).Scan(&task.ID, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		return err
	}

	// Get assignee username for response, but keep ID for notifications
	if task.Assignee != "" && task.Assignee != "null" {
		assigneeID := task.Assignee
		var username string
		if err = t.db.QueryRow("SELECT username FROM users WHERE id = $1", assigneeID).Scan(&username); err == nil {
			task.Assignee = username
		}

		// Create notification for the assignee (use ID)
		if _, err = t.db.Exec(`
            INSERT INTO notifications (user_id, message, read, created_at)
            VALUES ($1, $2, false, $3)
        `, assigneeID, fmt.Sprintf("Вам назначена новая задача: %s", task.Title), now); err != nil {
			log.Printf("Error creating notification: %v", err)
		}
	}
	return nil
}

func (t TaskDeps) GetTask(taskID string, task *models.Task) error {
	var assignee sql.NullString
	err := t.db.QueryRow(`
		SELECT t.id, t.title, t.description, t.state, t.priority, u.username as assignee, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN users u ON t.assignee = u.id
		WHERE t.id = $1
	`, taskID).Scan(&task.ID, &task.Title, &task.Description, &task.State, &task.Priority, &assignee, &task.CreatedAt, &task.UpdatedAt)

	if err != nil {
		return err
	}

	if assignee.Valid {
		task.Assignee = assignee.String
	}

	// Get comments for the task
	commentRows, err := t.db.Query(`
		SELECT c.id, c.content, u.username as author, c.created_at
		FROM comments c
		JOIN users u ON c.author = u.id
		WHERE c.task_id = $1
		ORDER BY c.created_at DESC
	`, taskID)
	if err != nil {
		return err
	}
	defer commentRows.Close()

	task.Comments = []models.Comment{}
	for commentRows.Next() {
		var comment models.Comment
		if err := commentRows.Scan(&comment.ID, &comment.Content, &comment.Author, &comment.CreatedAt); err != nil {
			return err
		}
		task.Comments = append(task.Comments, comment)
	}
	return nil
}

func (t TaskDeps) UpdateTask(taskID string, updates map[string]interface{}) (*models.Task, error) {
	// Get the current task state and assignee before update
	var oldState string
	var assigneeID sql.NullString
	err := t.db.QueryRow("SELECT state, assignee FROM tasks WHERE id = $1", taskID).Scan(&oldState, &assigneeID)
	if err != nil {
		return nil, err
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
			_, err = t.db.Exec(`
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
		// Priority change notification to assignee
		if assigneeID.Valid {
			var taskTitle string
			_ = t.db.QueryRow("SELECT title FROM tasks WHERE id = $1", taskID).Scan(&taskTitle)
			if _, err = t.db.Exec(`
                INSERT INTO notifications (user_id, message, read, created_at)
                VALUES ($1, $2, false, $3)
            `, assigneeID.String, fmt.Sprintf("Приоритет задачи '%s' изменен на %d", taskTitle, int(priority)), time.Now()); err != nil {
				log.Printf("Error creating notification: %v", err)
			}
		}
	}

	if assignee, ok := updates["assignee"].(string); ok {
		query += fmt.Sprintf(", assignee = $%d", paramCount)
		params = append(params, assignee)
		paramCount++

		// If assignee has changed, create a notification for the new assignee
		if assignee != "" && (!assigneeID.Valid || assignee != assigneeID.String) {
			var taskTitle string
			err = t.db.QueryRow("SELECT title FROM tasks WHERE id = $1", taskID).Scan(&taskTitle)
			if err == nil {
				_, err = t.db.Exec(`
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
	err = t.db.QueryRow(query, params...).Scan(&task.ID, &task.Title, &task.Description, &task.State, &task.Priority, &newAssigneeID, &task.CreatedAt, &task.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Get assignee username if assignee ID exists
	if newAssigneeID.Valid {
		var username string
		err = t.db.QueryRow("SELECT username FROM users WHERE id = $1", newAssigneeID.String).Scan(&username)
		if err == nil {
			task.Assignee = username
		}
	}
	return &task, nil
}

func (t TaskDeps) DeleteTask(taskID string) error {
	// Notify assignee before delete
	var assigneeID sql.NullString
	var title string
	_ = t.db.QueryRow("SELECT assignee, title FROM tasks WHERE id = $1", taskID).Scan(&assigneeID, &title)

	// Delete task from database
	_, err := t.db.Exec("DELETE FROM tasks WHERE id = $1", taskID)
	if err != nil {
		return err
	}
	if assigneeID.Valid {
		if _, nerr := t.db.Exec(`
            INSERT INTO notifications (user_id, message, read, created_at)
            VALUES ($1, $2, false, $3)
        `, assigneeID.String, fmt.Sprintf("Задача '%s' была удалена", title), time.Now()); nerr != nil {
			log.Printf("Error creating notification: %v", nerr)
		}
	}
	return nil
}

func (t TaskDeps) AddComment(userID string, taskID string, content string) (*models.Comment, error) {
	// Insert comment
	var comment models.Comment
	now := time.Now()
	err := t.db.QueryRow(`
        INSERT INTO comments (task_id, content, author, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, content, created_at
    `, taskID, content, userID, now).Scan(&comment.ID, &comment.Content, &comment.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Load author username
	var authorUsername string
	if err = t.db.QueryRow("SELECT username FROM users WHERE id = $1", userID).Scan(&authorUsername); err == nil {
		comment.Author = authorUsername
	}

	// Notify assignee of the task
	var assigneeID sql.NullString
	var title string
	if err = t.db.QueryRow("SELECT assignee, title FROM tasks WHERE id = $1", taskID).Scan(&assigneeID, &title); err == nil {
		if assigneeID.Valid {
			if _, nerr := t.db.Exec(`
                INSERT INTO notifications (user_id, message, read, created_at)
                VALUES ($1, $2, false, $3)
            `, assigneeID.String, fmt.Sprintf("К задаче '%s' добавлен комментарий", title), time.Now()); nerr != nil {
				log.Printf("Error creating notification: %v", nerr)
			}
		}
	}

	return &comment, nil
}
