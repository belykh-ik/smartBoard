package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"belykh-ik/taskflow/database"
	"belykh-ik/taskflow/handlers"
	"belykh-ik/taskflow/middleware"
	"belykh-ik/taskflow/models"
	"belykh-ik/taskflow/service"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	config := &models.Config{
		DSN:        os.Getenv("DATABASE_URL"),
		PORT:       os.Getenv("PORT"),
		JWT_SECRET: []byte(os.Getenv("JWT_SECRET")),
	}

	// Connect to PostgreSQL
	db := database.ConnectDb(config.DSN)
	defer db.Close()

	// Initialize router
	r := mux.NewRouter()

	// Create Deps
	board := service.NewBoardDeps(db)
	task := service.NewTaskDeps(db)
	user := service.NewUserDeps(db)
	notification := service.NewNotificationDeps(db)

	// Register Routes
	handlers.RegisterRoures(r, db, config, board, task, user, notification)
	handlers.RegisterAuthRoures(r, db, config)

	// Add Server Port
	port := config.PORT
	if port == "" {
		port = "8080"
	}

	//Create Server
	server := http.Server{
		Addr:    ":" + port,
		Handler: middleware.Cors(r),
	}

	log.Printf("Server is listening on port %s...", port)
	err = server.ListenAndServe()
	if err != nil {
		fmt.Printf("Error %s", err)
	}
}
