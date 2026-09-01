import { fetchApi } from './api';

export const login = async (email, password) => {
  const data = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
};

export const register = async (userData) => {
  const data = await fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
};
