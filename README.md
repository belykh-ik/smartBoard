# SmartBoard

SmartBoard is a modern task management application featuring a React‑based Kanban board on the frontend and a Go‑powered REST API on the backend. It uses PostgreSQL for persistence and Docker Compose to orchestrate the full stack.

---

## 🚀 Features

- **Drag & Drop Kanban Board** — organize tasks by columns (To Do, In Progress, Done)  
- **Task CRUD** — create, update, delete tasks with titles, descriptions, priorities  
- **Comments & Assignments** — add comments and assign tasks to users  
- **Authentication & Authorization** — JWT‑based login, role separation between admin and regular users  
- **Persistent Storage** — PostgreSQL database for tasks and users  
- **Responsive UI** — built with React, TypeScript, Tailwind CSS  

---

## 🛠 Technology Stack

### Frontend

- React & TypeScript  
- Tailwind CSS  
- React Beautiful DnD (drag‑and‑drop)  
- Axios for HTTP requests  
- React Router for client‑side routing  
- JWT for authentication tokens  
- ESLint & Prettier for linting & code style  
           
### Backend

- Go (Golang)  
- Gorilla Mux router  
- PostgreSQL database  
- JWT middleware for auth  
- Dockerized microservices architecture  

---

## 📦 Docker Setup

All components are containerized. To launch the full stack locally:

```bash
git clone https://github.com/belykh-ik/smartBoard.git
cd smartBoard
docker-compose up --build -d
```

- **Frontend:** http://localhost:3000

- **Backend API:** http://localhost:8080 (or as configured)

- **PostgreSQL:** default port 5432