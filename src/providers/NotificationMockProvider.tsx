import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { mockNotificationFeed } from '@/mocks/notifications';
import type { MockNotification } from '@/mocks/notifications';

type NotificationMockContextValue = {
  notifications: MockNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markManyAsRead: (ids: readonly string[]) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
};

const NotificationMockContext = createContext<NotificationMockContextValue | null>(null);

export function NotificationMockProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState(mockNotificationFeed);

  const markManyAsRead = useCallback((ids: readonly string[]) => {
    const idSet = new Set(ids);
    setNotifications((current) => current.map((item) => (idSet.has(item.id) ? { ...item, read: true } : item)));
  }, []);

  const markAsRead = useCallback((id: string) => markManyAsRead([id]), [markManyAsRead]);
  const markAllAsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }, []);
  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      markAsRead,
      markManyAsRead,
      markAllAsRead,
      dismiss,
    }),
    [notifications, markAsRead, markManyAsRead, markAllAsRead, dismiss],
  );

  return <NotificationMockContext.Provider value={value}>{children}</NotificationMockContext.Provider>;
}

export function useNotificationMock() {
  const context = useContext(NotificationMockContext);
  if (!context) {
    throw new Error('useNotificationMock must be used within NotificationMockProvider');
  }
  return context;
}
