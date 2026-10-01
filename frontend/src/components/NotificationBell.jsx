import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notificationApi } from '../services/api';
import { useAuth } from '../context/useAuth';
import socket from '../services/socketClient';

const NotificationBell = () => {
  const { isAuthenticated, authToken, user, role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingEvaluationCount, setPendingEvaluationCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !authToken) return () => { isMounted = false; };

    const loadNotifications = async () => {
      try {
        const response = await notificationApi.getAll();
        if (isMounted) {
          const payload = response?.data || response || {};
          const notificationRows = Array.isArray(payload) ? payload : payload.notifications;
          setNotifications(Array.isArray(notificationRows) ? notificationRows.map((notification) => ({
            ...notification,
            is_read: notification.is_read === true || Number(notification.is_read) === 1,
          })) : []);
          setUnreadCount(Number(payload?.unreadCount || 0));
        }
      } catch (error) {
        if (error?.status >= 500) console.warn('Notification service is temporarily unavailable.');
        if (isMounted) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [authToken, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !authToken) {
      if (socket.connected || socket.connecting) socket.disconnect();
      return undefined;
    }
    socket.auth = { token: authToken };
    const handleNotification = (notification) => {
      setNotifications((current) => [{ ...notification, is_read: false }, ...current].slice(0, 20));
      setUnreadCount((count) => count + 1);
    };
    const joinRooms = () => socket.emit('join_rooms', { userId: user?.id ?? user?.user_id, role });
    socket.on('new_notification', handleNotification);
    socket.on('connect', joinRooms);
    if (!socket.connected && !socket.connecting) {
      socket.connect();
    }
    if (socket.connected) joinRooms();
    return () => {
      socket.off('new_notification', handleNotification);
      socket.off('connect', joinRooms);
    };
  }, [authToken, isAuthenticated, role, user?.id, user?.user_id]);

  useEffect(() => {
    const updatePendingCount = (event) => {
      const count = Number(event.detail?.count);
      setPendingEvaluationCount(Number.isFinite(count) && count >= 0 ? count : 0);
    };
    window.addEventListener('ipes-pending-evaluations-updated', updatePendingCount);
    return () => window.removeEventListener('ipes-pending-evaluations-updated', updatePendingCount);
  }, []);

  useEffect(() => {
    const closeDropdown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeDropdown);
    return () => document.removeEventListener('mousedown', closeDropdown);
  }, []);

  const markAllNotificationsRead = async () => {
    const userId = user?.id ?? user?.user_id;
    if (!userId) return;
    try {
      await notificationApi.markAllRead(userId);
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Keep the notification list available when marking read fails.
    }
  };

  const clearAllNotifications = async () => {
    const userId = user?.id ?? user?.user_id;
    if (!userId || !window.confirm('Clear all notifications?')) return;
    try {
      await notificationApi.clearAll(userId);
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // Keep the notification list available when clearing fails.
    }
  };

  const toggleNotifications = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
  };

  const displayCount = pendingEvaluationCount + unreadCount;
  const visibleNotifications = activeFilter === 'unread'
    ? notifications.filter((notification) => !notification.is_read)
    : notifications;

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={toggleNotifications} className="relative rounded-full p-2 text-white hover:bg-white/10" aria-label="Open notifications" aria-expanded={isOpen}>
        <Bell className="h-5 w-5" aria-hidden="true" />
        {displayCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">{displayCount > 99 ? '99+' : displayCount}</span>}
      </button>
      {isOpen && <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-2xl">
        <p className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">Notifications</p>
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <div className="flex gap-1" role="tablist" aria-label="Notification filters">
            {['all', 'unread'].map((filter) => <button key={filter} type="button" role="tab" aria-selected={activeFilter === filter} onClick={() => setActiveFilter(filter)} className={`rounded-md px-2 py-1 text-xs font-semibold ${activeFilter === filter ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>{filter === 'all' ? 'All' : 'Unread'}</button>)}
          </div>
          <div className="flex gap-1">
            <button type="button" onClick={markAllNotificationsRead} className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700" aria-label="Mark all notifications read" title="Mark all read"><CheckCheck className="h-4 w-4" /></button>
            <button type="button" onClick={clearAllNotifications} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label="Clear all notifications" title="Clear all"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
        {pendingEvaluationCount > 0 && <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-3"><p className="text-sm font-semibold text-yellow-800">You have {pendingEvaluationCount} pending instructor performance evaluation{pendingEvaluationCount === 1 ? '' : 's'}.</p><p className="mt-1 text-xs text-yellow-700">Please complete them.</p></div>}
        {visibleNotifications.length ? visibleNotifications.map((n, index) => <div key={n.id || index} className={`border-b border-slate-100 px-4 py-3 last:border-0 ${!n.is_read ? 'bg-blue-50' : ''}`}><p className="text-sm font-semibold text-slate-800">{n.title}</p><p className="mt-1 text-xs text-slate-600">{n.message}</p><time className="mt-1 block text-[11px] text-slate-400">{new Date(n.created_at).toLocaleString()}</time></div>) : pendingEvaluationCount <= 0 && <p className="px-4 py-5 text-sm text-slate-500">No notifications.</p>}
      </div>}
    </div>
  );
};

export default NotificationBell;