import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Task } from '../types';
import { fetchBoardData, updateTask, deleteTask, addComment, fetchUsers } from '../api';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, MessageSquare, Trash2, Edit, ArrowLeft } from 'lucide-react';

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});
  const [columns, setColumns] = useState<{ id: string; title: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const loadTask = async () => {
      try {
        setLoading(true);
        const boardData = await fetchBoardData();
        
        // Find the task in the board data
        const foundTask = Object.values(boardData.tasks).find(t => t.id === id);
        if (foundTask) {
          setTask(foundTask);
          setEditedTask({
            title: foundTask.title,
            description: foundTask.description,
            state: foundTask.state,
            priority: foundTask.priority,
            assignee: foundTask.assignee,
          });
        } else {
          setError('Задача не найдена');
        }
        
        // Get columns for the state dropdown
        const columnsData = boardData.columnOrder.map(colId => ({
          id: colId,
          title: boardData.columns[colId].title
        }));
        setColumns(columnsData);
        
        // Get users for assignee dropdown
        try {
          const usersData = await fetchUsers();
          setUsers(usersData.map(u => ({ id: u.id, username: u.username })));
        } catch (err) {
          console.error('Ошибка загрузки пользователей:', err);
        }
        
      } catch (err) {
        setError('Не удалось загрузить данные задачи');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadTask();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedTask({
      ...editedTask,
      [name]: name === 'priority' ? parseInt(value, 10) : value
    });
  };

  const handleSave = async () => {
    if (!task || !id) return;
    
    try {
      const updatedTask = await updateTask(id, editedTask);
      setTask(updatedTask);
      setIsEditing(false);
    } catch (err) {
      console.error('Ошибка при обновлении задачи:', err);
    }
  };

  const handleDelete = async () => {
    if (!task || !id) return;
    
    if (window.confirm('Вы уверены, что хотите удалить эту задачу?')) {
      try {
        await deleteTask(id);
        navigate('/dashboard');
      } catch (err) {
        console.error('Ошибка при удалении задачи:', err);
      }
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Высокий';
      case 2: return 'Средний';
      case 3: return 'Низкий';
      default: return 'Неизвестно';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <Sidebar />
        <div className="pt-16 pl-20 p-6 flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <Sidebar />
        <div className="pt-16 pl-20 p-6">
          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center text-red-500 mb-4">
              <AlertTriangle className="mr-2" />
              <p>{error || 'Задача не найдена'}</p>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={16} className="mr-1" />
              Вернуться на дашборд
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <Sidebar />
      <div className="pt-16 pl-20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-4"
            >
              <ArrowLeft size={18} className="mr-1" />
              Назад
            </button>
            <h1 className="text-2xl font-bold flex-grow dark:text-gray-100">Детали задачи</h1>
            {auth.isAdmin && (
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSave}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Сохранить
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Edit size={16} className="mr-1" />
                      Редактировать
                    </button>
                    <button 
                      onClick={handleDelete}
                      className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <Trash2 size={16} className="mr-1" />
                      Удалить
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Заголовок
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={editedTask.title || ''}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Описание
                    </label>
                    <textarea
                      name="description"
                      value={editedTask.description || ''}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Статус
                      </label>
                      <select
                        name="state"
                        value={editedTask.state || ''}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                      >
                        {columns.map(column => (
                          <option key={column.id} value={column.id}>
                            {column.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Приоритет
                      </label>
                      <select
                        name="priority"
                        value={editedTask.priority || 3}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                      >
                        <option value={1}>Высокий</option>
                        <option value={2}>Средний</option>
                        <option value={3}>Низкий</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Исполнитель
                    </label>
                    <select
                      name="assignee"
                      value={editedTask.assignee || ''}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                    >
                      <option value="">Не назначен</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-2 dark:text-gray-100">{task.title}</h2>
                  <div className="flex items-center mb-6">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)} mr-2`}></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 mr-4">
                      Приоритет: {getPriorityLabel(task.priority)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Статус: {columns.find(c => c.id === task.state)?.title || task.state}
                    </span>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2 dark:text-gray-100">Описание</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{task.description}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2 dark:text-gray-100">Исполнитель</h3>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-2">
                        {task.assignee ? (typeof task.assignee === 'string' && task.assignee.length > 0 ? task.assignee.charAt(0).toUpperCase() : '?') : '?'}
                      </div>
                      <span className="dark:text-gray-100">{task.assignee || 'Не назначен'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2 flex items-center dark:text-gray-100">
                      <MessageSquare size={18} className="mr-2" />
                      Комментарии ({task.comments?.length || 0})
                    </h3>
                    
                    {task.comments && task.comments.length > 0 ? (
                      <div className="space-y-4">
                        {task.comments.map(comment => (
                          <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            <div className="flex items-center mb-2">
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold mr-2">
                                {comment.author.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium dark:text-gray-100">{comment.author}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {new Date(comment.createdAt).toLocaleString('ru-RU')}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">Нет комментариев</p>
                    )}
                    
                    <div className="mt-4">
                      <textarea
                        placeholder="Добавить комментарий..."
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md"
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button 
                        className={`mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${commentSubmitting || !newComment.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={commentSubmitting || !newComment.trim()}
                        onClick={async () => {
                          if (!task || !id || !newComment.trim()) return;
                          try {
                            setCommentSubmitting(true);
                            const created = await addComment(id, newComment.trim());
                            setTask({
                              ...task,
                              comments: [created, ...(task.comments || [])],
                            });
                            setNewComment('');
                          } catch (err) {
                            console.error('Ошибка добавления комментария:', err);
                          } finally {
                            setCommentSubmitting(false);
                          }
                        }}
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPage;