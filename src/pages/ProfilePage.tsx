import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { User, Mail, Calendar, Shield, Clock } from 'lucide-react';
import { fetchBoardData, updateProfile, changePassword } from '../api';
import ChangePasswordModal from '../components/ChangePasswordModal';
import EditProfileModal from '../components/EditProfileModal';

const ProfilePage: React.FC = () => {
  const { auth } = useAuth();
  const [taskStats, setTaskStats] = useState({
    inProgress: 0,
    completed: 0,
    pending: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [isPwdOpen, setIsPwdOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  useEffect(() => {
    const loadTaskStats = async () => {
      if (auth.user) {
        try {
          setLoading(true);
          const boardData = await fetchBoardData();
          
          // Filter tasks for the current user
          const userTasks = Object.values(boardData.tasks).filter(task => 
            task.assignee === auth.user?.id || task.assignee === auth.user?.username
          );
          
          setTaskStats({
            inProgress: userTasks.filter(task => task.state === 'inprogress').length,
            completed: userTasks.filter(task => task.state === 'done').length,
            pending: userTasks.filter(task => task.state === 'aprove' || task.state === 'pending' || task.state === 'review').length,
            total: userTasks.length
          });
        } catch (error) {
          console.error('Error loading task stats:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadTaskStats();
  }, [auth.user]);
  
  if (!auth.user) {
    return <div>Загрузка...</div>;
  }
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar />
      <div className="pt-16 pl-20 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Профиль пользователя</h1>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-600 h-32 relative">
              <div className="absolute -bottom-16 left-8">
                <div className="w-32 h-32 rounded-full bg-white p-1">
                  <div className="w-full h-full rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-4xl font-bold text-blue-600">
                      {auth.user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-20 px-8 pb-8">
              <h2 className="text-2xl font-bold">{auth.user.username}</h2>
              <p className="text-gray-600 mb-6">
                {auth.user.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Информация</h3>
                  
                  <div className="flex items-center">
                    <User className="text-gray-400 mr-3" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Имя пользователя</p>
                      <p className="font-medium">{auth.user.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Mail className="text-gray-400 mr-3" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{auth.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Shield className="text-gray-400 mr-3" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Роль</p>
                      <p className="font-medium">{auth.user.role === 'admin' ? 'Администратор' : 'Пользователь'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Calendar className="text-gray-400 mr-3" size={20} />
                    <div>
                      <p className="text-sm text-gray-500">Дата регистрации</p>
                      <p className="font-medium">{formatDate(auth.user.createdAt)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Статистика</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Задач в работе</p>
                        <p className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Завершено задач</p>
                        <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">На подтверждении</p>
                        <p className="text-2xl font-bold text-orange-600">{taskStats.pending}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-sm">Всего задач</p>
                        <p className="text-2xl font-bold text-gray-600">{taskStats.total}</p>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold border-b pb-2 mt-6">Активность</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Clock className="text-gray-400 mr-3" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Последний вход</p>
                        <p className="font-medium">Сегодня, 10:45</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="text-gray-400 mr-3" size={20} />
                      <div>
                        <p className="text-sm text-gray-500">Последнее действие</p>
                        <p className="font-medium">Обновление статуса задачи</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Настройки профиля</h3>
                <div className="flex space-x-4">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setIsEditOpen(true)}>
                    Изменить профиль
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300" onClick={() => setIsPwdOpen(true)}>
                    Сменить пароль
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ChangePasswordModal 
          isOpen={isPwdOpen} 
          onClose={() => setIsPwdOpen(false)} 
          onSubmit={async ({ currentPassword, newPassword }) => { await changePassword({ currentPassword, newPassword }); }}
        />
        <EditProfileModal 
          isOpen={isEditOpen} 
          onClose={() => setIsEditOpen(false)} 
          initial={{ username: auth.user.username, email: auth.user.email }} 
          onSubmit={async ({ username, email }) => {
            const updated = await updateProfile({ username, email });
            // локально обновим AuthContext
            // simple local update without token change
            // @ts-ignore
            auth.user.username = updated.username; 
            // @ts-ignore
            auth.user.email = updated.email; 
          }}
        />
      </div>
    </div>
  );
};

export default ProfilePage;