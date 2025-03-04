# SmartBoard - Таск менеджер для учета задач

SmartBoard - это современное приложение для управления задачами с фронтендом на React и бэкендом на Golang, использующее PostgreSQL для хранения данных.

### Запуск приложения

1. Clone the repository
2. Run the application:
```bash
docker-compose up -d --build
```
3. Access the application at http://localhost:3000

## Features

- Канбан-доска с функцией перетаскивания (drag-and-drop)
- Создание и управление задачами
- Расстановка приоритетов задач
- Комментарии к задачам
- Назначение задач пользователям
- Аутентификация и авторизация (роли администратора/пользователя)

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- React Beautiful DnD for drag-and-drop functionality
- Axios for API requests
- Lucide React for icons
- React Router for routing
- JWT for authentication

### Backend
- Golang
- Gorilla Mux for routing
- PostgreSQL database
- JWT for authentication

## Docker Setup

Всё приложение контейнеризировано с использованием Docker, запускается с помощью docker-compose, что позволяет легко запустить весь стек одной командой.

### Prerequisites
- Docker and Docker Compose

