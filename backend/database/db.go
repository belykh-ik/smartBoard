package database

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/lib/pq"
)

func ConnectDb(DSN string) *sql.DB {
	db, err := sql.Open("postgres", DSN)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	time.Sleep(3 * time.Second)
	err = db.Ping()
	if err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to PostgreSQL database")
	return db
}
