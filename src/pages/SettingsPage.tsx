import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { fetchUsers, updateUserRole, fetchBoardData, updateBoardColumns } from '../api';
import { User, Board } from '../types';
import { useNavigate } from 'react-router-dom';
import BoardSettingsModal from '../components/BoardSettingsModal';

const SettingsPage: React.FC = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [, setDarkMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [showInterfaceSettings, setShowInterfaceSettings] = useState(false);
  const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
  const [boardData, setBoardData] = useState<Board | null>(null);

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

  // Load board data for board settings
  useEffect(() => {
    const loadBoardData = async () => {
      try {
        const board = await fetchBoardData();
        setBoardData(board);
      } catch (error) {
        console.error('Error loading board data:', error);
      }
    };

    if (auth.isAdmin) {
      loadBoardData();
    }
  }, [auth.isAdmin]);

  // Initialize theme settings from storage
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('app-theme') || 'auto';
      const storedAccentColor = localStorage.getItem('app-accent-color') || '#3B82F6';
      setTheme(storedTheme as 'light' | 'dark' | 'auto');
      setAccentColor(storedAccentColor);
      
      // Apply theme
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = storedTheme === 'dark' || (storedTheme === 'auto' && systemPrefersDark);
      setDarkMode(shouldUseDark);
      
      // Apply accent color
      document.documentElement.style.setProperty('--accent-color', storedAccentColor);
    } catch (_) {
      // ignore
    }
  }, []);

  const handleRoleChange = (userId: string, isAdmin: boolean) => {
    setSelectedUsers({
      ...selectedUsers,
      [userId]: isAdmin
    });
  };

  const handleSaveChanges = async () => {
    try {
      // Make API calls to update user roles
      const updatePromises = Object.entries(selectedUsers).map(async ([userId, isAdmin]) => {
        const newRole = isAdmin ? 'admin' : 'user';
        return updateUserRole(userId, newRole);
      });
      
      await Promise.all(updatePromises);
      
      // Update local state to reflect changes
      setUsers(users.map(user => ({
        ...user,
        role: selectedUsers[user.id] ? 'admin' : 'user'
      })));
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Ошибка при обновлении ролей пользователей:', error);
      alert('Не удалось сохранить изменения ролей');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = newTheme === 'dark' || (newTheme === 'auto' && systemPrefersDark);
    setDarkMode(shouldUseDark);
    
    const root = document.documentElement;
    if (shouldUseDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('app-accent-color', color);
    document.documentElement.style.setProperty('--accent-color', color);
  };

  const handleColumnsUpdate = async (updatedColumns: any[]) => {
    if (!boardData) return;

    try {
      // Update backend
      await updateBoardColumns(updatedColumns);

      // Update local state
      const newBoard = {
        ...boardData,
        columns: updatedColumns.reduce((acc, col) => ({
          ...acc,
          [col.id]: {
            ...boardData.columns[col.id],
            title: col.title
          }
        }), boardData.columns),
        columnOrder: updatedColumns.map(col => col.id)
      };

      setBoardData(newBoard);
    } catch (error) {
      console.error('Ошибка обновления колонок:', error);
      alert('Не удалось обновить колонки');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <Sidebar />
      <div className="pt-16 pl-20 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6 dark:text-gray-100">Настройки</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4 dark:text-gray-100">Профиль пользователя</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Имя пользователя
                </label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md"
                  value={auth.user?.username || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input 
                  type="email" 
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md"
                  value={auth.user?.email || ''}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Роль
                </label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md"
                  value={auth.user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Дата регистрации
                </label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded-md"
                  value={auth.user?.createdAt ? new Date(auth.user.createdAt).toLocaleDateString('ru-RU') : ''}
                  readOnly
                />
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4 dark:text-gray-100">Настройки интерфейса</h2>
            <div className="space-y-4">
              <button 
                onClick={() => setShowInterfaceSettings(!showInterfaceSettings)}
                className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    <span className="text-blue-600 dark:text-blue-200">🎨</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium dark:text-gray-100">Тема и цвета</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Настройка внешнего вида приложения</div>
                  </div>
                </div>
                <div className={`transform transition-transform ${showInterfaceSettings ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {showInterfaceSettings && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-medium mb-3 dark:text-gray-200">Тема оформления</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleThemeChange('light')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      theme === 'light' 
                        ? 'border-accent bg-accent/10 dark:bg-accent/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                        >
                          <div className="w-full h-8 bg-white rounded mb-2"></div>
                          <div className="text-sm font-medium dark:text-gray-200">Светлая</div>
                        </button>
                        <button
                          onClick={() => handleThemeChange('dark')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            theme === 'dark' 
                              ? 'border-accent bg-accent/10 dark:bg-accent/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="w-full h-8 bg-gray-800 rounded mb-2"></div>
                          <div className="text-sm font-medium dark:text-gray-200">Темная</div>
                        </button>
                        <button
                          onClick={() => handleThemeChange('auto')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            theme === 'auto' 
                              ? 'border-accent bg-accent/10 dark:bg-accent/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="w-full h-8 bg-gradient-to-r from-white to-gray-800 rounded mb-2"></div>
                          <div className="text-sm font-medium dark:text-gray-200">Авто</div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-md font-medium mb-3 dark:text-gray-200">Акцентный цвет</h3>
                      <div className="grid grid-cols-6 gap-3">
                        {[
                          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
                          '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
                          '#F97316', '#6366F1', '#14B8A6', '#DC2626'
                        ].map(color => (
                          <button
                            key={color}
                            onClick={() => handleAccentColorChange(color)}
                            className={`w-10 h-10 rounded-full border-2 transition-all ${
                              accentColor === color 
                                ? 'border-gray-900 dark:border-gray-100 scale-110' 
                                : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => handleAccentColorChange(e.target.value)}
                          className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Выбрать свой цвет</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input 
                          id="notifications" 
                          type="checkbox" 
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                          defaultChecked
                        />
                        <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          Включить уведомления
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input 
                          id="compactView" 
                          type="checkbox" 
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <label htmlFor="compactView" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                          Компактный вид задач
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {auth.isAdmin && (
            <div>
              <h2 className="text-lg font-medium mb-4 dark:text-gray-100">Настройки администратора</h2>
              <div className="space-y-4 mb-6">
                <button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                  onClick={() => navigate('/users')}
                >
                  Управление пользователями
                </button>
                <button 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md ml-2"
                  onClick={() => setIsBoardSettingsOpen(true)}
                >
                  Настройки доски
                </button>
              </div>
              
              <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium mb-4 dark:text-gray-100">Назначение администраторов</h3>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-200 font-bold mr-3">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium dark:text-gray-100">{user.username}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-300">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2 text-sm dark:text-gray-200">Администратор</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={selectedUsers[user.id] || false}
                              onChange={(e) => handleRoleChange(user.id, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              onClick={handleSaveChanges}
            >
              Сохранить изменения
            </button>
          </div>
        </div>
      </div>

      {/* Board Settings Modal */}
      {isBoardSettingsOpen && boardData && (
        <BoardSettingsModal 
          isOpen={isBoardSettingsOpen} 
          onClose={() => setIsBoardSettingsOpen(false)}
          columns={boardData.columnOrder.map((id: string) => ({ 
            id, 
            title: boardData.columns[id].title,
            order: boardData.columnOrder.indexOf(id)
          }))}
          onColumnsUpdate={handleColumnsUpdate}
        />
      )}
    </div>
  );
};

export default SettingsPage;