import { fetchApi } from './api';

export const getExpenseClaims = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/expense-claims?${queryString}` : '/expense-claims';
  return fetchApi(url);
};

export const exportExpenseClaims = async () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5245/api';
  
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const response = await fetch(`${BASE_URL}/expense-claims/export`, { headers });
  if (!response.ok) {
    throw new Error('Failed to export claims');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'expense_claims.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
