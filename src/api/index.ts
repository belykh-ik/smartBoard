import axios from 'axios';
import { Board, Task, User, Notification } from '../types';

// API URL from environment variable or default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Board API
export const fetchBoardData = async (): Promise<Board> => {
  try {
    const response = await api.get('/board');
    return response.data;
  } catch (error) {
    console.error('Ошибка загрузки данных доски:', error);
    throw error;
  }
};

// Task API
export const updateTaskState = async (taskId: string, newColumnId: string): Promise<void> => {
  try {
    await api.patch(`/tasks/${taskId}`, { state: newColumnId });
  } catch (error) {
    console.error('Ошибка обновления статуса задачи:', error);
    throw error;
  }
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments'>): Promise<Task> => {
  try {
    const response = await api.post('/tasks', task);
    return response.data;
  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    throw error;
  }
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
  try {
    const response = await api.patch(`/tasks/${taskId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    await api.delete(`/tasks/${taskId}`);
  } catch (error) {
    console.error('Ошибка удаления задачи:', error);
    throw error;
  }
};

// User API
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
    throw error;
  }
};

// Notification API
export const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await api.get('/notifications');
    return response.data;
  } catch (error) {
    console.error('Ошибка загрузки уведомлений:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await api.patch(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Ошибка обновления статуса уведомления:', error);
    throw error;
  }
};

// Admin API
export const updateUserRole = async (userId: string, role: string): Promise<User> => {
  try {
    const response = await api.patch(`/users/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    console.error('Ошибка обновления роли пользователя:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/users/${userId}`);
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    throw error;
  }
};