"use client";

// Keys for local storage
const AUTH_KEY = 'crm_auth_data';

// Store the full auth response: { user, permissions, token }
export const setAuthData = (data) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    if (data?.token) {
      localStorage.setItem('token', data.token);
    }
  }
};

export const getAuthData = () => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  }
  return null;
};

export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('token');
  }
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    const directToken = localStorage.getItem('token');
    if (directToken) return directToken;
  }
  const auth = getAuthData();
  return auth?.token || null;
};

export const getUser = () => {
  const auth = getAuthData();
  return auth?.user || null;
};

export const getPermissions = () => {
  const user = getUser();
  const role = (user?.role || '').toLowerCase().trim();
  if (role === 'admin' || role === 'director' || role === 'admin manager') {
    return {
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
      export: true,
      financial: true,
      admin: true
    };
  }

  const auth = getAuthData();
  return auth?.permissions || {
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
    export: false,
    financial: false,
    admin: false
  };
};

export const hasPermission = (permissionKey) => {
  const user = getUser();
  const role = (user?.role || '').toLowerCase().trim();
  if (role === 'admin' || role === 'director' || role === 'admin manager') {
    return true;
  }
  const permissions = getPermissions();
  if (permissions?.admin) return true;
  return !!permissions?.[permissionKey];
};
