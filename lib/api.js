export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

import { getToken, getRefreshToken, getUser, setAuthData } from './authUtils';

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = getRefreshToken();
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });

      if (!res.ok) {
        throw new Error('Refresh token expired or invalid');
      }

      const data = await res.json();
      if (data?.success && data?.data) {
        setAuthData(data.data);
        return data.data.accessToken || data.data.token;
      }
      throw new Error('Invalid refresh response');
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const fetchWithAuth = async (endpoint, options = {}, isRetry = false) => {
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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: options.credentials || 'include',
      headers
    });
  } catch (netErr) {
    throw new Error(netErr.message || 'Network request failed');
  }

  // Handle 401 token expiration and automatically refresh token
  if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry the original request with the new access token
        return fetchWithAuth(endpoint, options, true);
      }
    } catch (refreshErr) {
      console.warn('Auto-refresh failed, session expired:', refreshErr);
    }
  }

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

export const getDashboardOverview = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.period && params.period !== 'All' && params.period !== 'All time') {
    query.append('period', params.period);
  }
  if (params.salesperson && params.salesperson !== 'All' && params.salesperson !== 'All salespeople') {
    query.append('salesperson', params.salesperson);
  }
  if (params.area && params.area !== 'All' && params.area !== 'All areas') {
    query.append('area', params.area);
  }
  const qs = query.toString();
  const res = await fetchWithAuth(`/dashboard/overview${qs ? `?${qs}` : ''}`);
  return res.json();
};

export const getDashboardKpis = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.period && params.period !== 'All' && params.period !== 'All time') {
    query.append('period', params.period);
  }
  if (params.salesperson && params.salesperson !== 'All' && params.salesperson !== 'All salespeople') {
    query.append('salesperson', params.salesperson);
  }
  if (params.area && params.area !== 'All' && params.area !== 'All areas') {
    query.append('area', params.area);
  }
  const qs = query.toString();
  const res = await fetchWithAuth(`/dashboard/kpis${qs ? `?${qs}` : ''}`);
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



