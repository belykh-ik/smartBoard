package service

import (
	"database/sql"

	"belykh-ik/taskflow/models"
)

type BoardDeps struct {
	db *sql.DB
}

func NewBoardDeps(db *sql.DB) *BoardDeps {
	return &BoardDeps{
		db: db,
	}
}

func (b BoardDeps) GetBoard() (*models.Board, error) {
	// Get all columns
	rows, err := b.db.Query("SELECT id, title, position FROM columns ORDER BY position")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns := make(map[string]models.Column)
	columnOrder := []string{}

	for rows.Next() {
		var col models.Column
		var position int
		if err := rows.Scan(&col.ID, &col.Title, &position); err != nil {
			return nil, err
		}
		col.TaskIDs = []string{}
		columns[col.ID] = col
		columnOrder = append(columnOrder, col.ID)
	}

	// Get all tasks
	taskRows, err := b.db.Query(`
		SELECT t.id, t.title, t.description, t.state, t.priority, u.username as assignee, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN users u ON t.assignee = u.id
		ORDER BY t.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer taskRows.Close()

	tasks := make(map[string]models.Task)
	for taskRows.Next() {
		var task models.Task
		var assignee sql.NullString
		if err := taskRows.Scan(&task.ID, &task.Title, &task.Description, &task.State, &task.Priority, &assignee, &task.CreatedAt, &task.UpdatedAt); err != nil {
			return nil, err
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
		commentRows, err := b.db.Query(`
			SELECT c.id, c.content, u.username as author, c.created_at
			FROM comments c
			JOIN users u ON c.author = u.id
			WHERE c.task_id = $1
			ORDER BY c.created_at DESC
		`, taskID)
		if err != nil {
			return nil, err
		}

		comments := []models.Comment{}
		for commentRows.Next() {
			var comment models.Comment
			if err := commentRows.Scan(&comment.ID, &comment.Content, &comment.Author, &comment.CreatedAt); err != nil {
				commentRows.Close()
				return nil, err
			}
			comments = append(comments, comment)
		}
		commentRows.Close()

		task.Comments = comments
		tasks[taskID] = task
	}
	board := &models.Board{
		Tasks:       tasks,
		Columns:     columns,
		ColumnOrder: columnOrder,
	}
	return board, nil
}
