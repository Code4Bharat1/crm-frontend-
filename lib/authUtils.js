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

export const PATH_TO_MODULE_MAP = {
  "/": "dashboard",
  "/leads": "leads",
  "/customers": "customers",
  "/whatsapp": "whatsapp",
  "/email": "email",
  "/ai-processing": "ai_processing",
  "/follow-ups": "follow_ups",
  "/quotations": "quotations",
  "/proformas": "proformas",
  "/orders": "orders",
  "/deliveries": "deliveries",
  "/invoices": "invoices",
  "/payments": "payments",
  "/products": "products",
  "/inventory": "inventory",
  "/serial-numbers": "serial_numbers",
  "/suppliers": "suppliers",
  "/purchase": "purchase",
  "/projects": "projects",
  "/profitability": "profitability",
  "/service": "service",
  "/warranty": "warranty",
  "/ledger": "ledger",
  "/banking": "banking",
  "/gst": "gst",
  "/hr": "hr",
  "/attendance": "attendance",
  "/sales-performance": "sales_performance",
  "/reports": "reports",
  "/notifications": "notifications",
  "/company-settings": "company_settings",
  "/users-roles": "users_roles",
  "/audit-logs": "audit_logs",
  "/administration": "deployment",
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

export const canAccessModule = (moduleKey) => {
  if (!moduleKey) return true;
  const user = getUser();
  if (!user) return false;
  
  const role = (user?.role || '').toLowerCase().trim();
  
  // 1. Super Admins have absolute unrestricted access
  if (role === 'admin' || role === 'director' || role === 'admin manager') {
    return true;
  }
  
  const permissions = getPermissions();
  if (permissions?.admin) return true;

  // 2. Strict Financial Lock: If not financial, block financial modules regardless of overrides
  const financialModules = ['ledger', 'banking', 'gst', 'invoices', 'payments'];
  if (financialModules.includes(moduleKey) && !permissions?.financial) {
    return false;
  }

  // 3. Strict Admin Lock: If not admin, block administration modules regardless of overrides
  const adminModules = ['users_roles', 'audit_logs', 'company_settings', 'deployment'];
  if (adminModules.includes(moduleKey) && !permissions?.admin) {
    return false;
  }

  // 4. Check explicit permission overrides from role or permissions object
  const explicit = permissions?.[moduleKey] ?? permissions?.modulePermissions?.[moduleKey];
  if (typeof explicit === 'boolean') {
    return explicit;
  }

  // 5. Contextual role defaults when explicit booleans are not set:
  if (moduleKey === 'dashboard' || moduleKey === 'attendance') {
    return true;
  }

  // HR / People
  if (moduleKey === 'hr') {
    return !!(permissions?.approve || permissions?.admin || role === 'hr' || role.includes('hr'));
  }
  if (moduleKey === 'sales_performance') {
    return ['sales', 'salesperson', 'sales executive', 'accounts manager', 'director', 'admin'].some(r => role.includes(r));
  }

  // Sales and Quotations
  const salesDocModules = ['quotations', 'proformas', 'orders', 'deliveries'];
  if (salesDocModules.includes(moduleKey)) {
    // Block pure service/engineer/technician/hr from sensitive quotations/sales documents unless explicitly granted
    if (['engineer', 'service', 'technician', 'hr', 'purchase'].some(r => role === r || role.startsWith(r))) {
      return false;
    }
    return true;
  }

  // CRM
  const crmLeadModules = ['leads', 'whatsapp', 'email', 'ai_processing', 'follow_ups'];
  if (crmLeadModules.includes(moduleKey)) {
    if (['engineer', 'service', 'technician', 'purchase', 'accounts executive'].some(r => role === r)) {
      return false;
    }
    return true;
  }

  if (moduleKey === 'customers') {
    return true; // Customers list allowed for operational roles
  }

  // Products & Inventory
  if (['products', 'inventory', 'serial_numbers'].includes(moduleKey)) {
    return true;
  }
  if (['suppliers', 'purchase'].includes(moduleKey)) {
    return ['purchase', 'procurement', 'accounts manager', 'admin', 'director'].some(r => role.includes(r));
  }

  // Projects & Service
  if (['service', 'warranty'].includes(moduleKey)) {
    return ['service', 'engineer', 'technician', 'project manager', 'sales', 'admin', 'director'].some(r => role.includes(r));
  }
  if (moduleKey === 'projects') {
    return ['project manager', 'engineer', 'service', 'technician', 'sales', 'admin', 'director'].some(r => role.includes(r));
  }
  if (moduleKey === 'profitability') {
    return !!(permissions?.financial || permissions?.admin || ['project manager', 'director', 'admin'].some(r => role.includes(r)));
  }

  // Administration & Reports
  if (moduleKey === 'reports') {
    return !!(permissions?.financial || permissions?.admin || permissions?.approve || role.includes('manager') || role.includes('sales'));
  }
  if (moduleKey === 'notifications') {
    return true;
  }

  return true;
};

export const canAccessPath = (pathname) => {
  if (!pathname || pathname === '/login') return true;
  if (pathname === '/') return canAccessModule('dashboard');

  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  
  if (PATH_TO_MODULE_MAP[cleanPath]) {
    return canAccessModule(PATH_TO_MODULE_MAP[cleanPath]);
  }

  const segments = cleanPath.split('/').filter(Boolean);
  if (segments.length > 0) {
    const rootPath = `/${segments[0]}`;
    if (PATH_TO_MODULE_MAP[rootPath]) {
      return canAccessModule(PATH_TO_MODULE_MAP[rootPath]);
    }
  }

  return true;
};

export const canAccessRecord = (recordKind) => {
  if (!recordKind) return true;
  const moduleKey = RECORD_KIND_TO_MODULE_MAP[recordKind];
  if (!moduleKey) return true;
  return canAccessModule(moduleKey);
};
