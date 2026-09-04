import { getToken } from '@/lib/authUtils';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

const req = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || 'Request failed');
  }
  return res.json();
};

export const getNotifications = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return req(`/notifications${q ? `?${q}` : ''}`);
};

export const getUnreadCount = (recipient) => {
  const q = recipient ? `?recipient=${encodeURIComponent(recipient)}` : '';
  return req(`/notifications/unread-count${q}`);
};

export const markNotificationAsRead = (id) => {
  return req(`/notifications/${id}/read`, { method: 'PATCH' });
};

export const markAllNotificationsAsRead = (recipient) => {
  return req('/notifications/mark-all-read', {
    method: 'PATCH',
    body: JSON.stringify({ recipient }),
  });
};
