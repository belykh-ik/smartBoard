package service

import (
	"database/sql"

	"belykh-ik/taskflow/models"
)

type NotificationsDeps struct {
	db *sql.DB
}

func NewNotificationDeps(db *sql.DB) *NotificationsDeps {
	return &NotificationsDeps{
		db: db,
	}
}

func (n NotificationsDeps) GetNotification(userID string) ([]models.Notification, error) {
	rows, err := n.db.Query(`
		SELECT id, user_id, message, read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := []models.Notification{}
	for rows.Next() {
		var notification models.Notification
		if err := rows.Scan(&notification.ID, &notification.UserID, &notification.Message, &notification.Read, &notification.CreatedAt); err != nil {
			return nil, err
		}
		notifications = append(notifications, notification)
	}
	return notifications, nil
}

func (n NotificationsDeps) MarkNotificationRead(userID string, notificationID string) error {
	result, err := n.db.Exec(`
	UPDATE notifications
	SET read = true
	WHERE id = $1 AND user_id = $2
`, notificationID, userID)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		return err
	}
	return nil
}
