import { fetchApi } from './api';

export const login = async (email, password) => {
  const response = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (response.data && response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
    localStorage.setItem('crm_auth_data', JSON.stringify(response.data));
  }
  return response;
};

export const register = async (userData) => {
  const response = await fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  if (response.data && response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
  }
  return response;
};

export const logout = async () => {
  try {
    await fetchApi('/auth/logout', { method: 'POST' });
  } catch (error) {}
  localStorage.removeItem('token');
  localStorage.removeItem('crm_auth_data');
};

export const logoutAll = async () => {
  try {
    await fetchApi('/auth/logout-all', { method: 'POST' });
  } catch (error) {}
  localStorage.removeItem('token');
  localStorage.removeItem('crm_auth_data');
};

