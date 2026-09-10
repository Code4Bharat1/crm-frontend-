import { fetchApi } from './api';

export const getUsers = async () => {
  return fetchApi('/auth/users');
};

export const updateUserRole = async (userId, role) => {
  return fetchApi(`/auth/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

export const createUser = async (userData) => {
  return fetchApi('/auth/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const getCurrentUserProfile = async () => {
  return fetchApi('/auth/me');
};
