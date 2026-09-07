export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

import { getToken, getUser } from './authUtils';

export const fetchWithAuth = async (endpoint, options = {}) => {
  let token = getToken();
  if (!token && typeof window !== 'undefined') {
    try {
      const auth = JSON.parse(localStorage.getItem('crm_auth_data') || '{}');
      token = auth?.accessToken || auth?.token || localStorage.getItem('token') || null;
    } catch (e) {}
  }

  const user = getUser();
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(user?.role ? { 'x-user-role': user.role } : {})
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

export const getDashboardOverview = async () => {
  const res = await fetchWithAuth('/dashboard/overview');
  return res.json();
};

export const getDashboardKpis = async () => {
  const res = await fetchWithAuth('/dashboard/kpis');
  return res.json();
};

export const getSalesPerformance = async () => {
  const res = await fetchWithAuth('/sales/performance');
  return res.json();
};

export const updateSalesTarget = async (id, target) => {
  const res = await fetchWithAuth(`/sales/performance/target/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ target })
  });
  return res.json();
};



