import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { createTask } from '../api';
import { Task } from '../types';
import { fetchUsers } from '../api';
import { useEffect } from 'react';
import { User } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  columns: { id: string; title: string }[];
}

interface TaskFormData {
  title: string;
  description: string;
  state: string;
  priority: number;
  assignee: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onTaskCreated, columns }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormData>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers();
        setUsers(usersData.filter(user => user.role !== 'admin'));
      } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
      }
    };

    loadUsers();
  }, []);

  const onSubmit = async (data: TaskFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      const newTask = await createTask({
        title: data.title,
        description: data.description,
        state: data.state,
        priority: Number(data.priority),
        assignee: data.assignee,
      });
      
      onTaskCreated(newTask);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка создания задачи');
      console.error('Ошибка создания задачи:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-gray-100">Создать задачу</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="title">
              Заголовок
            </label>
            <input
              className={`shadow appearance-none border ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline`}
              id="title"
              type="text"
              placeholder="Заголовок задачи"
              {...register('title', { required: 'Заголовок обязателен' })}
            />
            {errors.title && (
              <p className="text-red-500 text-xs italic">{errors.title.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="description">
              Описание
            </label>
            <textarea
              className={`shadow appearance-none border ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline`}
              id="description"
              placeholder="Описание задачи"
              rows={3}
              {...register('description', { required: 'Описание обязательно' })}
            />
            {errors.description && (
              <p className="text-red-500 text-xs italic">{errors.description.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="state">
              Статус
            </label>
            <select
              className={`shadow appearance-none border ${errors.state ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline`}
              id="state"
              {...register('state', { required: 'Статус обязателен' })}
            >
              {columns.map(column => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
            {errors.state && (
              <p className="text-red-500 text-xs italic">{errors.state.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="priority">
              Приоритет
            </label>
            <select
              className={`shadow appearance-none border ${errors.priority ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline`}
              id="priority"
              {...register('priority', { required: 'Приоритет обязателен' })}
            >
              <option value="1">Высокий</option>
              <option value="2">Средний</option>
              <option value="3">Низкий</option>
            </select>
            {errors.priority && (
              <p className="text-red-500 text-xs italic">{errors.priority.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="assignee">
              Исполнитель
            </label>
            <select
              className={`shadow appearance-none border ${errors.assignee ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded w-full py-2 px-3 text-gray-700 dark:text-gray-100 dark:bg-gray-900 leading-tight focus:outline-none focus:shadow-outline`}
              id="assignee"
              {...register('assignee', { required: 'Исполнитель обязателен' })}
            >
              <option value="">Выберите исполнителя</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
            {errors.assignee && (
              <p className="text-red-500 text-xs italic">{errors.assignee.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 font-bold py-2 px-4 rounded mr-2"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;