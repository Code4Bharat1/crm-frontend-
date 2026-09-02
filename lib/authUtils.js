"use client";

// Keys for local storage
const AUTH_KEY = 'crm_auth_data';

// Store the full auth response: { user, permissions, token }
export const setAuthData = (data) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
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
  }
};

export const getToken = () => {
  const auth = getAuthData();
  return auth?.token || null;
};

export const getUser = () => {
  const auth = getAuthData();
  return auth?.user || null;
};

export const getPermissions = () => {
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
  const permissions = getPermissions();
  return !!permissions[permissionKey];
};
