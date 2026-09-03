const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';

const req = async (path, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || 'Request failed');
  }
  return res.json();
};

// ─── Format Helpers ──────────────────────────────────────────────────────────
export const fmtINR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

export const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

// ─── Projects API ────────────────────────────────────────────────────────────
export const getProjects = (params = {}) => req('/projects?' + new URLSearchParams(params));
export const getProject = (id) => req(`/projects/${id}`);
export const createProject = (data) => req('/projects', { method: 'POST', body: JSON.stringify(data) });
export const updateProject = (id, data) => req(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProject = (id) => req(`/projects/${id}`, { method: 'DELETE' });
export const addProjectCost = (id, data) => req(`/projects/${id}/costs`, { method: 'POST', body: JSON.stringify(data) });
export const getProfitabilitySummary = () => req('/projects/profitability-summary');

// ─── Service Requests API ────────────────────────────────────────────────────
export const getServiceRequests = (params = {}) => req('/service-requests?' + new URLSearchParams(params));
export const getServiceRequest = (id) => req(`/service-requests/${id}`);
export const createServiceRequest = (data) => req('/service-requests', { method: 'POST', body: JSON.stringify(data) });
export const updateServiceRequest = (id, data) => req(`/service-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const resolveServiceRequest = (id, data) => req(`/service-requests/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) });
export const deleteServiceRequest = (id) => req(`/service-requests/${id}`, { method: 'DELETE' });

// ─── Warranty API ────────────────────────────────────────────────────────────
export const getWarranties = (params = {}) => req('/warranties?' + new URLSearchParams(params));
export const getWarranty = (id) => req(`/warranties/${id}`);
export const checkSerialWarranty = (serialNo) => req(`/warranties/check/${encodeURIComponent(serialNo)}`);
export const createWarranty = (data) => req('/warranties', { method: 'POST', body: JSON.stringify(data) });
export const updateWarranty = (id, data) => req(`/warranties/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const renewWarrantyAMC = (id, data) => req(`/warranties/${id}/renew-amc`, { method: 'POST', body: JSON.stringify(data) });
export const deleteWarranty = (id) => req(`/warranties/${id}`, { method: 'DELETE' });
