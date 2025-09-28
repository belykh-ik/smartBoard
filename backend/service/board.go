package service

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

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

type ColumnUpdate struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Order int    `json:"order"`
}

func (b BoardDeps) UpdateBoardColumns(columns []ColumnUpdate) error {
	tx, err := b.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Update column titles and order
	for _, col := range columns {
		_, err = tx.Exec(`
			UPDATE board_columns 
			SET title = $1, column_order = $2 
			WHERE id = $3
		`, col.Title, col.Order, col.ID)

		if err != nil {
			log.Printf("Error updating column %s: %v", col.ID, err)
			return err
		}
	}

	// Update board configuration with new column order
	columnOrder := make([]string, len(columns))
	for i, col := range columns {
		columnOrder[i] = col.ID
	}

	columnOrderJSON, err := json.Marshal(columnOrder)
	if err != nil {
		return err
	}

	_, err = tx.Exec(`
		UPDATE board_config 
		SET column_order = $1, updated_at = NOW()
		WHERE id = 1
	`, string(columnOrderJSON))

	if err != nil {
		return err
	}

	return tx.Commit()
}

func (b BoardDeps) GetBoardColumns() ([]map[string]interface{}, error) {
	rows, err := b.db.Query(`
		SELECT id, title, column_order 
		FROM board_columns 
		ORDER BY column_order
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []map[string]interface{}
	for rows.Next() {
		var id, title string
		var order int

		if err := rows.Scan(&id, &title, &order); err != nil {
			return nil, err
		}

		columns = append(columns, map[string]interface{}{
			"id":    id,
			"title": title,
			"order": order,
		})
	}

	return columns, nil
}

func (b BoardDeps) AddBoardColumn(title string) error {
	// Get the next order number
	var maxOrder int
	err := b.db.QueryRow("SELECT COALESCE(MAX(column_order), 0) FROM board_columns").Scan(&maxOrder)
	if err != nil {
		return err
	}

	// Insert new column
	_, err = b.db.Exec(`
		INSERT INTO board_columns (id, title, column_order)
		VALUES ($1, $2, $3)
	`, fmt.Sprintf("column-%d", maxOrder+1), title, maxOrder+1)

	return err
}

func (b BoardDeps) DeleteBoardColumn(columnID string) error {
	tx, err := b.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Move all tasks from this column to backlog
	_, err = tx.Exec(`
		UPDATE tasks 
		SET state = 'backlog', assignee = NULL 
		WHERE state = $1
	`, columnID)
	if err != nil {
		return err
	}

	// Delete the column
	_, err = tx.Exec("DELETE FROM board_columns WHERE id = $1", columnID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (b BoardDeps) GetBoard() (*models.Board, error) {
	board := &models.Board{
		Tasks:       make(map[string]models.Task),
		Columns:     make(map[string]models.Column),
		ColumnOrder: make([]string, 0),
	}

	// Get column order from board_config
	var columnOrderJSON string
	err := b.db.QueryRow("SELECT column_order FROM board_config WHERE id = 1").Scan(&columnOrderJSON)
	if err != nil {
		// If no config exists, use default order
		board.ColumnOrder = []string{"backlog", "inprogress", "aprove", "done"}
	} else {
		err = json.Unmarshal([]byte(columnOrderJSON), &board.ColumnOrder)
		if err != nil {
			board.ColumnOrder = []string{"backlog", "inprogress", "aprove", "done"}
		}
	}

	// Get all columns
	rows, err := b.db.Query(`
		SELECT id, title, column_order 
		FROM board_columns 
		ORDER BY column_order
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id, title string
		var order int

		if err := rows.Scan(&id, &title, &order); err != nil {
			return nil, err
		}

		board.Columns[id] = models.Column{
			ID:      id,
			Title:   title,
			TaskIDs: make([]string, 0),
		}
	}

	// Get all tasks
	taskRows, err := b.db.Query(`
		SELECT t.id, t.title, t.description, t.state, t.priority, 
		       COALESCE(u.username, '') as assignee, t.created_at, t.updated_at
		FROM tasks t
		LEFT JOIN users u ON t.assignee = u.id
		ORDER BY t.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer taskRows.Close()

	for taskRows.Next() {
		var task models.Task
		var assignee sql.NullString

		err := taskRows.Scan(&task.ID, &task.Title, &task.Description,
			&task.State, &task.Priority, &assignee, &task.CreatedAt, &task.UpdatedAt)
		if err != nil {
			return nil, err
		}

		if assignee.Valid {
			task.Assignee = assignee.String
		}

		board.Tasks[task.ID] = task

		// Add task to appropriate column
		if column, exists := board.Columns[task.State]; exists {
			column.TaskIDs = append(column.TaskIDs, task.ID)
			board.Columns[task.State] = column
		}
	}

	// Get comments for each task
	for taskID := range board.Tasks {
		commentRows, err := b.db.Query(`
			SELECT c.id, c.content, u.username as author, c.created_at
			FROM comments c
			JOIN users u ON c.author = u.id
			WHERE c.task_id = $1
			ORDER BY c.created_at ASC
		`, taskID)
		if err != nil {
			continue // Skip comments if there's an error
		}

		var comments []models.Comment
		for commentRows.Next() {
			var comment models.Comment
			err := commentRows.Scan(&comment.ID, &comment.Content, &comment.Author, &comment.CreatedAt)
			if err != nil {
				continue
			}
			comments = append(comments, comment)
		}
		commentRows.Close()

		if len(comments) > 0 {
			task := board.Tasks[taskID]
			task.Comments = comments
			board.Tasks[taskID] = task
		}
	}

	return board, nil
}
