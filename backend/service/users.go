package service

import (
	"database/sql"

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
