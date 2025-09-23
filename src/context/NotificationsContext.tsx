import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Notification } from '../types';
import { fetchNotifications, markNotificationAsRead } from '../api';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }>= ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      // Preserve local read flags on refresh
      setNotifications(prev => {
        const readMap = new Map(prev.filter(n => n.read).map(n => [n.id, true] as const));
        return data.map(n => (readMap.has(n.id) ? { ...n, read: true } : n));
      });
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить уведомления');
      // keep previous list on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [refresh]);

  const markAsRead = useCallback(async (id: string) => {
    // optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await markNotificationAsRead(id);
    } catch (e) {
      // revert on failure
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    // optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    for (const n of unread) {
      try {
        await markNotificationAsRead(n.id);
      } catch (e) {
        setNotifications(prev => prev.map(p => p.id === n.id ? { ...p, read: false } : p));
      }
    }
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const value = useMemo(() => ({ notifications, unreadCount, loading, error, refresh, markAsRead, markAllAsRead }), [notifications, unreadCount, loading, error, refresh, markAsRead, markAllAsRead]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};


