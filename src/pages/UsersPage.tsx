import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { fetchUsers, fetchBoardData } from '../api';
import { User, Board } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { UserPlus, Trash2, Shield, Edit, Check, X } from 'lucide-react';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { auth } = useAuth();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersData, boardData] = await Promise.all([
          fetchUsers(),
          fetchBoardData()
        ]);
        
        setUsers(usersData);
        setBoard(boardData);
        setError(null);
      } catch (err) {
        setError('Не удалось загрузить данные');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  const getUserTaskStats = (userId: string) => {
    if (!board) return { total: 0, inProgress: 0, pending: 0, completed: 0 };
    
    const userTasks = Object.values(board.tasks).filter(task => task.assignee === userId);
    
    return {
      total: userTasks.length,
      inProgress: userTasks.filter(task => task.state === 'inprogress').length,
      pending: userTasks.filter(task => task.state === 'aprove').length,
      completed: userTasks.filter(task => task.state === 'done').length
    };
  };

  const handleEditRole = (userId: string, currentRole: string) => {
    setEditingUser(userId);
    setNewRole(currentRole as 'admin' | 'user');
  };

  const handleSaveRole = async (userId: string) => {
    // Here you would make an API call to update the user's role
    console.log(`Updating user ${userId} role to ${newRole}`);
    
    // For now, we'll just update the local state
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    ));
    
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      // Here you would make an API call to delete the user
      console.log(`Deleting user ${userId}`);
      
      // For now, we'll just update the local state
      setUsers(users.filter(user => user.id !== userId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Sidebar />
        <div className="pt-16 pl-20 p-6 flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar />
      <div className="pt-16 pl-20 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Пользователи</h1>
            {auth.isAdmin && (
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <UserPlus size={18} className="mr-2" />
                Добавить пользователя
              </button>
            )}
          </div>

          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Пользователь
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Роль
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата регистрации
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Задачи
                    </th>
                    {auth.isAdmin && (
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => {
                    const stats = getUserTaskStats(user.id);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-bold">{user.username.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.username}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <div className="flex items-center">
                              <select
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                                className="mr-2 border border-gray-300 rounded-md p-1 text-sm"
                              >
                                <option value="user">Пользователь</option>
                                <option value="admin">Администратор</option>
                              </select>
                              <button 
                                onClick={() => handleSaveRole(user.id)}
                                className="text-green-600 hover:text-green-800 mr-1"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => setEditingUser(null)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <div className="text-center px-2">
                              <div className="text-xs text-gray-500">Всего</div>
                              <div className="font-medium">{stats.total}</div>
                            </div>
                            <div className="text-center px-2">
                              <div className="text-xs text-gray-500">В работе</div>
                              <div className="font-medium text-blue-600">{stats.inProgress}</div>
                            </div>
                            <div className="text-center px-2">
                              <div className="text-xs text-gray-500">На проверке</div>
                              <div className="font-medium text-orange-600">{stats.pending}</div>
                            </div>
                            <div className="text-center px-2">
                              <div className="text-xs text-gray-500">Завершено</div>
                              <div className="font-medium text-green-600">{stats.completed}</div>
                            </div>
                          </div>
                        </td>
                        {auth.isAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button 
                              onClick={() => handleEditRole(user.id, user.role)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              title="Изменить роль"
                            >
                              <Shield size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Удалить пользователя"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;