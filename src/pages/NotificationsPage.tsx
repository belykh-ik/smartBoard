import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { fetchNotifications, markNotificationAsRead } from '../api';
import { Notification } from '../types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Bell, Check, Trash2 } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        const data = await fetchNotifications();
        setNotifications(data);
        setError(null);
      } catch (err) {
        setError('Не удалось загрузить уведомления');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      ));
    } catch (err) {
      console.error('Ошибка при обновлении уведомления:', err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  // Если нет уведомлений, добавим несколько примеров
  const demoNotifications: Notification[] = [
    {
      id: '1',
      userId: '1',
      message: 'Вам назначена новая задача: Обновить дизайн главной страницы',
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      userId: '1',
      message: 'Статус вашей задачи изменен на: В работе',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      userId: '1',
      message: 'Администратор добавил комментарий к вашей задаче',
      read: true,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  const displayNotifications = notifications.length > 0 ? notifications : demoNotifications;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar />
      <div className="pt-16 pl-20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Уведомления</h1>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Отметить все как прочитанные
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {displayNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">У вас нет уведомлений</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {displayNotifications.map(notification => (
                    <li 
                      key={notification.id} 
                      className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 mt-1 ${!notification.read ? 'text-blue-500' : 'text-gray-400'}`}>
                          <Bell size={20} />
                        </div>
                        <div className="ml-3 flex-1">
                          <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        <div className="ml-3 flex-shrink-0 flex">
                          {!notification.read && (
                            <button 
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-800 mr-2"
                              title="Отметить как прочитанное"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          <button 
                            className="text-gray-400 hover:text-red-600"
                            title="Удалить"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;