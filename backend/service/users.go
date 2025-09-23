package service

import (
	"database/sql"
	"time"

	"belykh-ik/taskflow/models"
)

type UserDeps struct {
	db *sql.DB
}

func NewUserDeps(db *sql.DB) *UserDeps {
	return &UserDeps{
		db: db,
	}
}

func (u UserDeps) GetUsers() ([]models.User, error) {
	rows, err := u.db.Query("SELECT id, username, email, role, created_at FROM users")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, nil
}

func (u UserDeps) CreateUser(username, email, password, role string) (*models.User, error) {
	var user models.User
	now := time.Now()
	err := u.db.QueryRow(`
        INSERT INTO users (username, email, password, role, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, role, created_at
    `, username, email, password, role, now).Scan(&user.ID, &user.Username, &user.Email, &user.Role, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (u UserDeps) DeleteUser(userID string) error {
	// Reassign tasks: set assignee NULL and move to backlog
	if _, err := u.db.Exec(`
        UPDATE tasks SET assignee = NULL, state = 'backlog', updated_at = NOW()
        WHERE assignee = $1
    `, userID); err != nil {
		return err
	}

	// Delete user
	if _, err := u.db.Exec(`DELETE FROM users WHERE id = $1`, userID); err != nil {
		return err
	}
	return nil
}
