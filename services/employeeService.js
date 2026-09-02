import { fetchApi } from './api';

export const getEmployees = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/employees?${queryString}` : '/employees';
  return fetchApi(url);
};

export const getEmployeeById = async (id) => {
  return fetchApi(`/employees/${id}`);
};

export const createEmployee = async (data) => {
  return fetchApi('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateEmployee = async (id, data) => {
  return fetchApi(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteEmployee = async (id) => {
  return fetchApi(`/employees/${id}`, {
    method: 'DELETE',
  });
};

export const getEmployeeStats = async () => {
  return fetchApi('/employees/stats');
};

export const exportEmployees = async () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';
  
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${BASE_URL}/employees/export`, { headers });
  if (!response.ok) {
    throw new Error('Failed to export employees');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employees.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
