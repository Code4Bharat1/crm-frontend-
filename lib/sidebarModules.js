// Single source of truth for every module the sidebar can show and a role's
// permission editor can toggle. The Users & Roles page and the app shell both
// import from here so their module lists can never drift apart.

export const SIDEBAR_MODULES = [
  {
    group: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/" },
    ],
  },
  {
    group: "CRM",
    items: [
      { key: "leads", label: "Leads", href: "/leads" },
      { key: "customers", label: "Customers", href: "/customers" },
      { key: "whatsapp", label: "WhatsApp Inbox", href: "/whatsapp" },
      { key: "email", label: "Email", href: "/email" },
      { key: "ai_processing", label: "AI Processing", href: "/ai-processing" },
      { key: "follow_ups", label: "Follow-ups", href: "/follow-ups" },
    ],
  },
  {
    group: "Sales",
    items: [
      { key: "quotations", label: "Quotations", href: "/quotations" },
      { key: "proformas", label: "Proforma Invoices", href: "/proformas" },
      { key: "orders", label: "Sales Orders", href: "/orders" },
      { key: "deliveries", label: "Delivery Notes", href: "/deliveries" },
      { key: "invoices", label: "Sales Invoices", href: "/invoices" },
      { key: "payments", label: "Payments", href: "/payments" },
    ],
  },
  {
    group: "Products & Inventory",
    items: [
      { key: "products", label: "Product Master", href: "/products" },
      { key: "inventory", label: "Inventory & Stock", href: "/inventory" },
      { key: "serial_numbers", label: "Serial Numbers", href: "/serial-numbers" },
      { key: "suppliers", label: "Suppliers", href: "/suppliers" },
      { key: "purchase", label: "Purchase Orders", href: "/purchase" },
    ],
  },
  {
    group: "Projects & Service",
    items: [
      { key: "projects", label: "Projects", href: "/projects" },
      { key: "profitability", label: "Project Profitability", href: "/profitability" },
      { key: "service", label: "Service Requests", href: "/service" },
      { key: "warranty", label: "Warranty", href: "/warranty" },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: "ledger", label: "Customer Ledger", href: "/ledger" },
      { key: "banking", label: "Bank Reconciliation", href: "/banking" },
      { key: "gst", label: "GST", href: "/gst" },
    ],
  },
  {
    group: "People",
    items: [
      { key: "hr", label: "Employees & HR", href: "/hr" },
      { key: "attendance", label: "Attendance", href: "/attendance" },
      { key: "sales_performance", label: "Sales Performance", href: "/sales-performance" },
    ],
  },
  {
    group: "Administration",
    items: [
      { key: "reports", label: "Reports", href: "/reports" },
      { key: "notifications", label: "Notifications", href: "/notifications" },
      { key: "company_settings", label: "Company Settings", href: "/company-settings" },
      { key: "users_roles", label: "Users & Roles", href: "/users-roles" },
      { key: "audit_logs", label: "Audit Logs", href: "/audit-logs" },
      { key: "deployment", label: "Deployment", href: "/administration" },
    ],
  },
];

// Flat list of every sidebar item, each tagged with its group.
export const ALL_SIDEBAR_ITEMS = SIDEBAR_MODULES.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.group }))
);

const cleanRoleStr = (s) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const getRoleStem = (s) => cleanRoleStr(s).replace(/(?:es|s)$/, "");

// Fuzzy role-name match: case/space-insensitive, tolerant of singular/plural
// ("Sales" vs "Sale", "Manager" vs "Managers") so a user's free-text `role`
// field lines up with however the role was actually named in Users & Roles.
export const isRoleMatch = (a, b) => {
  if (!a || !b) return false;
  const na = cleanRoleStr(a), nb = cleanRoleStr(b);
  if (na === nb) return true;
  const sa = getRoleStem(a), sb = getRoleStem(b);
  if (sa.length >= 3 && sa === sb) return true;
  return na === nb + "s" || nb === na + "s";
};
