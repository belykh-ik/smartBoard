-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    state VARCHAR(50) NOT NULL DEFAULT 'backlog',
    priority INTEGER NOT NULL DEFAULT 3,
    assignee UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create board_columns table
CREATE TABLE IF NOT EXISTS board_columns (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    column_order INTEGER NOT NULL
);

-- Create board_config table
CREATE TABLE IF NOT EXISTS board_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    column_order JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default board columns
INSERT INTO board_columns (id, title, column_order) VALUES
    ('backlog', 'Бэклог', 1),
    ('inprogress', 'В работе', 2),
    ('aprove', 'На подтверждении', 3),
    ('done', 'Завершено', 4);

-- Insert default board config
INSERT INTO board_config (column_order) VALUES ('["backlog", "inprogress", "aprove", "done"]')
ON CONFLICT (id) DO NOTHING;

-- Create default admin user (username: admin, password: admin)
INSERT INTO users (username, email, password, role) 
VALUES ('admin', 'admin@example.com', 'admin', 'admin')
ON CONFLICT (email) DO NOTHING;