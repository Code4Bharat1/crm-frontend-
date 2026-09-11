"use client";

import { ALL_SIDEBAR_ITEMS } from './sidebarModules';

// Keys for local storage
const AUTH_KEY = 'crm_auth_data';

export const isSuperAdminRole = (role) => {
  const r = (role || '').toLowerCase().trim();
  return r === 'admin' || r === 'superadmin' || r === 'super admin';
};

// Store the full auth response: { user, permissions, token, accessToken }
export const setAuthData = (data) => {
  if (typeof window !== 'undefined') {
    const token = data?.token || data?.accessToken;
    const normalizedData = {
      ...data,
      token: token || data?.token,
      accessToken: token || data?.accessToken
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(normalizedData));
    if (token) {
      localStorage.setItem('token', token);
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
    const auth = getAuthData();
    if (auth?.token) return auth.token;
    if (auth?.accessToken) return auth.accessToken;
    if (auth?.data?.token) return auth.data.token;
    if (auth?.data?.accessToken) return auth.data.accessToken;
  }
  return null;
};

export const getUser = () => {
  const auth = getAuthData();
  if (auth?.user) return auth.user;
  if (auth?.data?.user) return auth.data.user;
  if (typeof window !== 'undefined') {
    try {
      const u = localStorage.getItem('user');
      if (u) return JSON.parse(u);
    } catch (e) {}
  }
  return null;
};

export const RECORD_KIND_TO_MODULE_MAP = {
  "Customer": "customers",
  "Lead": "leads",
  "Quotation": "quotations",
  "Proforma": "proformas",
  "Sales Order": "orders",
  "Delivery": "deliveries",
  "Invoice": "invoices",
  "Payment": "payments",
  "Product": "products",
  "Serial": "serial_numbers",
  "Project": "projects",
  "Service": "service"
};

// Whether the current user's role can access a sidebar module, by key (e.g. "leads", "projects").
// Strict enforcement: only admin has universal access. Dashboard is accessible to all.
// Other modules require explicit true in sidebarPermissions.
export const canAccessModule = (moduleKey) => {
  if (!moduleKey || moduleKey === 'dashboard') return true;
  const user = getUser();
  if (!user) return false;
  if (isSuperAdminRole(user?.role)) return true;

  const sidebarPermissions = getSidebarPermissions();
  if (!sidebarPermissions) return false;

  return Boolean(sidebarPermissions[moduleKey]);
};

export const canAccessRecord = (recordKind) => {
  if (!recordKind) return true;
  const moduleKey = RECORD_KIND_TO_MODULE_MAP[recordKind];
  if (!moduleKey) return true;
  return canAccessModule(moduleKey);
};

// The granular per-sidebar-module map configured by Admin in Users & Roles or HR.
export const getSidebarPermissions = () => {
  const auth = getAuthData();
  return auth?.sidebarPermissions || null;
};

const findSidebarItem = (pathname) =>
  ALL_SIDEBAR_ITEMS.find((it) =>
    it.href === '/' ? pathname === '/' : pathname === it.href || pathname.startsWith(`${it.href}/`)
  );

// Whether the current user's role is allowed to view a given path.
export const canAccessPath = (pathname) => {
  if (!pathname || pathname === '/' || pathname === '/login' || pathname.startsWith('/change-password') || pathname.startsWith('/reset-password') || pathname.startsWith('/forgot-password')) return true;
  const user = getUser();
  if (!user) return false;
  if (isSuperAdminRole(user?.role)) return true;

  const item = findSidebarItem(pathname);
  if (!item) return true; // non-sidebar subroute
  return canAccessModule(item.key);
};

// First sidebar href this role is actually allowed to see
export const getFirstAllowedHref = () => {
  const user = getUser();
  if (!user) return '/login';
  if (isSuperAdminRole(user?.role)) return '/';

  const sidebarPermissions = getSidebarPermissions();
  if (!sidebarPermissions) return '/';

  const allowed = ALL_SIDEBAR_ITEMS.find((it) => it.key === 'dashboard' || Boolean(sidebarPermissions[it.key]));
  return allowed?.href || '/';
};

