"use client";

import { ALL_SIDEBAR_ITEMS } from './sidebarModules';

// Keys for local storage
const AUTH_KEY = 'crm_auth_data';

const isSuperAdminRole = (role) => {
  const r = (role || '').toLowerCase().trim();
  return r === 'admin' || r === 'director' || r === 'admin manager';
};

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

// The granular per-sidebar-module map configured in Users & Roles (keyed by
// SIDEBAR_MODULES `key`s, e.g. { leads: true, customers: true, ... }).
// Null means no matching Role document was found for this user's role.
export const getSidebarPermissions = () => {
  const auth = getAuthData();
  return auth?.sidebarPermissions || null;
};

const findSidebarItem = (pathname) =>
  ALL_SIDEBAR_ITEMS.find((it) =>
    it.href === '/' ? pathname === '/' : pathname === it.href || pathname.startsWith(`${it.href}/`)
  );

// Whether the current user's role is allowed to view a given path. Admin-tier
// roles always pass; a role with no configured permissions map also passes
// (so accounts don't get silently locked out just because nobody has set up
// their role in Users & Roles yet); an unrecognised path (not a sidebar
// module, e.g. a document detail page) always passes.
export const canAccessPath = (pathname) => {
  const user = getUser();
  if (isSuperAdminRole(user?.role)) return true;

  const sidebarPermissions = getSidebarPermissions();
  if (!sidebarPermissions) return true;

  const item = findSidebarItem(pathname);
  if (!item) return true;

  return !!sidebarPermissions[item.key];
};

// First sidebar href this role is actually allowed to see -- a safe redirect
// target when the user lands on (or is bounced from) a module they can't
// access, instead of bouncing them back into the same denied page.
export const getFirstAllowedHref = () => {
  const user = getUser();
  if (isSuperAdminRole(user?.role)) return '/';

  const sidebarPermissions = getSidebarPermissions();
  if (!sidebarPermissions) return '/';

  const allowed = ALL_SIDEBAR_ITEMS.find((it) => sidebarPermissions[it.key]);
  return allowed?.href || null;
};
