import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { fetchUsers } from '../api';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadUsers = async () => {
      if (auth.isAdmin) {
        try {
          setLoading(true);
          const usersData = await fetchUsers();
          setUsers(usersData.filter(user => user.id !== auth.user?.id));
          
          // Initialize selected state
          const initialSelected: Record<string, boolean> = {};
          usersData.forEach(user => {
            initialSelected[user.id] = user.role === 'admin';
          });
          setSelectedUsers(initialSelected);
        } catch (error) {
          console.error('Error loading users:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadUsers();
  }, [auth.isAdmin, auth.user?.id]);

  const handleRoleChange = (userId: string, isAdmin: boolean) => {
    setSelectedUsers({
      ...selectedUsers,
      [userId]: isAdmin
    });
  };

  const handleSaveChanges = () => {
    // Here you would make API calls to update user roles
    console.log('Saving role changes:', selectedUsers);
    
    // Update local state to reflect changes
    setUsers(users.map(user => ({
      ...user,
      role: selectedUsers[user.id] ? 'admin' : 'user'
    })));
    
    // Navigate back to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar />
      <div className="pt-16 pl-20 p-6">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6">Настройки</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Профиль пользователя</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя пользователя
                </label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={auth.user?.username || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input 
                  type="email" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={auth.user?.email || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Роль
                </label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={auth.user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата регистрации
                </label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={auth.user?.createdAt ? new Date(auth.user.createdAt).toLocaleDateString('ru-RU') : ''}
                  readOnly
                />
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Настройки интерфейса</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input 
                  id="darkMode" 
                  type="checkbox" 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="darkMode" className="ml-2 block text-sm text-gray-700">
                  Темная тема
                </label>
              </div>
              <div className="flex items-center">
                <input 
                  id="notifications" 
                  type="checkbox" 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  defaultChecked
                />
                <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
                  Включить уведомления
                </label>
              </div>
              <div className="flex items-center">
                <input 
                  id="compactView" 
                  type="checkbox" 
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="compactView" className="ml-2 block text-sm text-gray-700">
                  Компактный вид задач
                </label>
              </div>
            </div>
          </div>
          
          {auth.isAdmin && (
            <div>
              <h2 className="text-lg font-medium mb-4">Настройки администратора</h2>
              <div className="space-y-4 mb-6">
                <button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                  onClick={() => navigate('/users')}
                >
                  Управление пользователями
                </button>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md ml-2">
                  Настройки доски
                </button>
              </div>
              
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium mb-4">Назначение администраторов</h3>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2 text-sm">Администратор</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={selectedUsers[user.id] || false}
                              onChange={(e) => handleRoleChange(user.id, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              onClick={handleSaveChanges}
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;