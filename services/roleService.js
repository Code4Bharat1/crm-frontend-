import { fetchApi } from './api';

export const getRoles = async () => {
  return fetchApi('/roles');
};

export const createRole = async (roleData) => {
  return fetchApi('/roles', {
    method: 'POST',
    body: JSON.stringify(roleData),
  });
};

export const updateRole = async (id, roleData) => {
  return fetchApi(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(roleData),
  });
};

export const deleteRole = async (id) => {
  return fetchApi(`/roles/${id}`, {
    method: 'DELETE',
  });
};
