export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

import { getToken } from './authUtils';

export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : ''
  };
  
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API Request Failed');
  }

  return response;
};

export const getAuditStats = async () => {
  const res = await fetchWithAuth('/audit-logs/stats');
  return res.json();
};

export const getAuditLogs = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithAuth(`/audit-logs?${query}`);
  return res.json();
};

export const exportAuditLogsAPI = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetchWithAuth(`/audit-logs/export?${query}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};
