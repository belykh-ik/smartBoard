import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { fetchNotifications, markNotificationAsRead } from '../api';
import { Notification } from '../types';
import { useNotifications } from '../context/NotificationsContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Bell, Check, Trash2 } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const { notifications, loading, error, markAsRead, markAllAsRead, refresh } = useNotifications();

  // Data is loaded by provider; page doesn't need to trigger refresh here

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy, HH:mm', { locale: ru });
    } catch (e) {
      return dateString;
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <Sidebar />
      <div className="pt-16 pl-20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold dark:text-gray-100">Уведомления</h1>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50" onClick={handleMarkAllAsRead} disabled={notifications.every(n => n.read)}>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-300">У вас нет уведомлений</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map(notification => (
                    <li 
                      key={notification.id} 
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/30' : 'dark:bg-transparent'}`}
                    >
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 mt-1 ${!notification.read ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}>
                          <Bell size={20} />
                        </div>
                        <div className="ml-3 flex-1">
                          <p className={`text-sm ${!notification.read ? 'font-medium dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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