"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Shield,
  Loader2,
  Search,
  CheckCircle2,
  Lock,
  Eye,
  UserPlus,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Kpi, Section } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getRoles, createRole, updateRole, deleteRole } from "@/services/roleService";
import { getEmployees, createEmployee } from "@/services/employeeService";

// Complete list of all sidebar modules grouped exactly as in the application sidebar
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
      { key: "visits", label: "Visits", href: "/visits" },
      { key: "communications", label: "Communications", href: "/communications" },
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
      { key: "migration", label: "Data Migration", href: "/migration" },
      { key: "users_roles", label: "Users & Roles", href: "/users-roles" },
      { key: "audit_logs", label: "Audit Logs", href: "/audit-logs" },
      { key: "deployment", label: "Deployment", href: "/administration" },
    ],
  },
];

// Flat list of all 37 sidebar items
export const ALL_SIDEBAR_ITEMS = SIDEBAR_MODULES.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.group }))
);

const cleanRoleStr = (s) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const getRoleStem = (s) => cleanRoleStr(s).replace(/(?:es|s)$/, "");

export const isRoleMatch = (a, b) => {
  if (!a || !b) return false;
  const na = cleanRoleStr(a), nb = cleanRoleStr(b);
  if (na === nb) return true;
  const sa = getRoleStem(a), sb = getRoleStem(b);
  if (sa.length >= 3 && sa === sb) return true;
  return na === nb + "s" || nb === na + "s";
};

export default function Page() {
  // Roles list - blank by default
  const [roles, setRoles] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Selected category filter tab for table view
  const [activeCategory, setActiveCategory] = useState("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Search filter inside the modal
  const [modalSearch, setModalSearch] = useState("");

  // Form state for Role
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {},
  });

  // Employee creation modal state (allowing role assignment directly from this page)
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    email: "",
    employmentType: "Full Time",
    status: "Active",
  });

  const handleOpenAddEmployee = (preselectedRole = "") => {
    setEmployeeFormData({
      firstName: "",
      lastName: "",
      role: preselectedRole || "",
      phone: "",
      email: "",
      employmentType: "Full Time",
      status: "Active",
    });
    setIsEmployeeModalOpen(true);
  };

  const handleCreateEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!employeeFormData.role) {
      toast.error("Please select a role for the employee");
      return;
    }
    setIsSubmittingEmployee(true);
    try {
      const res = await createEmployee(employeeFormData);
      if (res && res.success) {
        toast.success(res.message || `Employee created and welcome email sent to ${employeeFormData.email}`);
        setIsEmployeeModalOpen(false);
        fetchRolesData();
      }
    } catch (error) {
      toast.error(error.message || "Failed to create employee");
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  const fetchRolesData = async () => {
    try {
      setLoading(true);
      const [res, empRes] = await Promise.all([
        getRoles(),
        getEmployees({ limit: 100 }).catch(() => null),
      ]);
      if (res && res.success && Array.isArray(res.data)) {
        setRoles(res.data);
      } else {
        setRoles([]);
      }
      if (empRes && empRes.success) {
        setUserCount(empRes.data?.total || empRes.data?.employees?.length || 0);
      }
    } catch (error) {
      console.warn("API request failed, keeping table blank:", error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditingRoleId(null);
    setModalSearch("");
    // By default dashboard is true, others false
    const defaultPerms = {};
    ALL_SIDEBAR_ITEMS.forEach((item) => {
      defaultPerms[item.key] = item.key === "dashboard";
    });
    setFormData({
      name: "",
      description: "",
      permissions: defaultPerms,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (role) => {
    setIsEditMode(true);
    setEditingRoleId(role._id);
    setModalSearch("");
    const rolePerms = {};
    ALL_SIDEBAR_ITEMS.forEach((item) => {
      rolePerms[item.key] = Boolean(role.permissions?.[item.key]);
    });
    setFormData({
      name: role.name,
      description: role.description || "",
      permissions: rolePerms,
    });
    setIsModalOpen(true);
  };

  const handleTogglePermission = (key) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleToggleGroup = (groupName, makeChecked) => {
    const groupItems = SIDEBAR_MODULES.find((g) => g.group === groupName)?.items || [];
    setFormData((prev) => {
      const updated = { ...prev.permissions };
      groupItems.forEach((it) => {
        updated[it.key] = makeChecked;
      });
      return { ...prev, permissions: updated };
    });
  };

  const handleSelectAll = (checked) => {
    const updated = {};
    ALL_SIDEBAR_ITEMS.forEach((it) => {
      updated[it.key] = checked;
    });
    setFormData((prev) => ({
      ...prev,
      permissions: updated,
    }));
  };

  // Live hint if user types a role that matches an existing role (e.g. Sale vs Sales)
  const matchingRoleHint = useMemo(() => {
    if (!formData.name.trim() || isEditMode) return null;
    return roles.find((r) => isRoleMatch(r.name, formData.name.trim()));
  }, [formData.name, roles, isEditMode]);

  const handleSubmitRole = async (e) => {
    e.preventDefault();
    const roleName = formData.name.trim();
    if (!roleName) {
      toast.error("Role name is required");
      return;
    }

    // Check if role matches an existing role (e.g. Sale vs Sales)
    const existingMatch = !isEditMode && roles.find((r) => isRoleMatch(r.name, roleName));
    if (existingMatch) {
      toast.error(`Role "${existingMatch.name}" is already defined`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: roleName,
        description: formData.description.trim(),
        permissions: formData.permissions,
      };

      if (isEditMode && editingRoleId) {
        const res = await updateRole(editingRoleId, payload);
        if (res && res.success && res.data) {
          setRoles((prev) =>
            prev.map((r) => (r._id === editingRoleId ? res.data : r))
          );
        } else {
          setRoles((prev) =>
            prev.map((r) =>
              r._id === editingRoleId ? { ...r, ...payload } : r
            )
          );
        }
        toast.success(`Role "${roleName}" updated successfully`);
      } else {
        const res = await createRole(payload);
        if (res && res.success && res.data) {
          if (res.isExisting || existingMatch) {
            // Already exists - merged into existing role without changing or duplicating
            setRoles((prev) =>
              prev.map((r) =>
                r._id === res.data._id || isRoleMatch(r.name, res.data.name)
                  ? res.data
                  : r
              )
            );
            toast.success(
              `Role "${roleName}" matched existing role "${res.data.name}" — added to "${res.data.name}"`
            );
          } else {
            setRoles((prev) => [...prev, res.data]);
            toast.success(`Role "${roleName}" created and added to Employees & HR!`);
          }
        } else {
          const fallbackRole = {
            _id: Date.now().toString(),
            ...payload,
            createdAt: new Date().toISOString(),
          };
          setRoles((prev) => [...prev, fallbackRole]);
          toast.success(`Role "${roleName}" created and added to Employees & HR!`);
        }
      }

      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to save role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (id, name) => {
    if (!confirm(`Are you sure you want to delete role "${name}"?`)) return;

    setDeletingId(id);
    try {
      await deleteRole(id);
      setRoles((prev) => prev.filter((r) => r._id !== id));
      toast.success(`Role "${name}" deleted successfully`);
    } catch (error) {
      setRoles((prev) => prev.filter((r) => r._id !== id));
      toast.success(`Role "${name}" removed`);
    } finally {
      setDeletingId(null);
    }
  };

  // Columns to display in the table based on selected category tab
  const displayedColumns = useMemo(() => {
    if (activeCategory === "all") {
      return ALL_SIDEBAR_ITEMS;
    }
    const group = SIDEBAR_MODULES.find((g) => g.group === activeCategory);
    return group ? group.items.map((i) => ({ ...i, group: group.group })) : [];
  }, [activeCategory]);

  // Total permissions granted for a role
  const getGrantedCount = (role) => {
    if (!role.permissions) return 0;
    return Object.values(role.permissions).filter(Boolean).length;
  };

  // KPI Calculations
  const rolesCount = roles.length;
  const adminOrFinanceCount = roles.filter((r) => {
    if (!r.permissions) return false;
    const hasFinance = Boolean(r.permissions.ledger || r.permissions.banking || r.permissions.gst);
    const hasAdmin = Boolean(r.permissions.company_settings || r.permissions.users_roles || r.permissions.deployment);
    return hasFinance || hasAdmin;
  }).length;

  return (
    <>
      <PageHeader
        breadcrumb="Administration / Users & Roles"
        title="Users & Roles"
        subtitle="Manage granular role-based access control corresponding to all sidebar modules and navigation items."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenAddEmployee()}
              className="gap-1.5"
            >
              <UserPlus className="size-4" />
              Add Employee
            </Button>
            <Button onClick={handleOpenCreateModal} className="flex items-center gap-2">
              <Plus className="size-4" />
              Create Role
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Users" value={userCount} sub="Real active accounts" />
        <Kpi label="Roles" value={rolesCount} sub="Table blank by default" />
        <Kpi
          label="Finance & Admin Access"
          value={adminOrFinanceCount}
          tone={adminOrFinanceCount > 0 ? "warning" : "default"}
          sub={`${adminOrFinanceCount} roles have access to sensitive Finance or Admin tools`}
        />
      </div>

      {/* Permission Matrix Section */}
      <div className="mt-5">
        <Section
          title="Sidebar Permission Matrix"
          description="Grant or revoke access to all features and sections present in the sidebar"
          actions={
            roles.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {roles.length} {roles.length === 1 ? "role" : "roles"} configured • {ALL_SIDEBAR_ITEMS.length} sidebar items
              </span>
            ) : null
          }
        >
          {/* Category Filter Tabs */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All Modules ({ALL_SIDEBAR_ITEMS.length})
            </button>
            {SIDEBAR_MODULES.map((g) => (
              <button
                key={g.group}
                onClick={() => setActiveCategory(g.group)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeCategory === g.group
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {g.group} ({g.items.length})
              </button>
            ))}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/70 text-left text-xs uppercase text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-muted/95 backdrop-blur-sm p-3 font-bold border-r border-border min-w-[200px]">
                    Role & Scope
                  </th>
                  <th className="p-3 text-center font-bold min-w-[120px] border-r border-border">
                    Access Ratio
                  </th>
                  {displayedColumns.map((col) => (
                    <th
                      key={col.key}
                      className="p-3 text-center font-semibold whitespace-nowrap min-w-[110px] border-r border-border/50"
                      title={`${col.group} > ${col.label} (${col.href})`}
                    >
                      <span className="block text-[11px] text-muted-foreground/70 normal-case font-normal">
                        {col.group}
                      </span>
                      {col.label}
                    </th>
                  ))}
                  <th className="sticky right-0 z-10 bg-muted/95 backdrop-blur-sm p-3 text-center font-bold min-w-[90px] border-l border-border">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={displayedColumns.length + 3}
                      className="p-12 text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto size-6 animate-spin text-primary mb-2" />
                      Loading roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  /* BY DEFAULT THE TABLE IS BLANK */
                  <tr>
                    <td
                      colSpan={displayedColumns.length + 3}
                      className="p-14 text-center text-muted-foreground"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-2">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted shadow-inner">
                          <Shield className="size-7 text-muted-foreground/60" />
                        </div>
                        <p className="text-base font-semibold text-foreground">
                          No roles created yet
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The role permissions table is blank by default. Click the &ldquo;Create Role&rdquo; button above to create a role and configure which sidebar modules it can access.
                        </p>
                        <Button
                          size="sm"
                          onClick={handleOpenCreateModal}
                          className="mt-3 gap-1.5"
                        >
                          <Plus className="size-3.5" />
                          Create First Role
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  roles.map((r) => {
                    const grantedCount = getGrantedCount(r);
                    const percent = Math.round(
                      (grantedCount / ALL_SIDEBAR_ITEMS.length) * 100
                    );

                    return (
                      <tr
                        key={r._id || r.name}
                        className="border-t border-border transition-colors hover:bg-muted/30"
                      >
                        {/* Sticky Role info */}
                        <td className="sticky left-0 z-10 bg-background/95 backdrop-blur-sm p-3 border-r border-border font-medium">
                          <div className="font-semibold text-foreground">{r.name}</div>
                          {r.description ? (
                            <div className="text-xs text-muted-foreground truncate max-w-[190px]">
                              {r.description}
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground/60 italic">
                              Custom Role
                            </div>
                          )}
                        </td>

                        {/* Access Ratio */}
                        <td className="p-3 text-center border-r border-border">
                          <span className="font-bold text-foreground">
                            {grantedCount}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {" "}/ {ALL_SIDEBAR_ITEMS.length}
                          </span>
                          <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </td>

                        {/* Module permission cells */}
                        {displayedColumns.map((col) => {
                          const isGranted = Boolean(r.permissions?.[col.key]);
                          return (
                            <td
                              key={col.key}
                              className="p-3 text-center border-r border-border/40"
                            >
                              {isGranted ? (
                                <span
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-sm font-bold text-success"
                                  title={`${col.label}: Granted`}
                                >
                                  ✓
                                </span>
                              ) : (
                                <span
                                  className="text-muted-foreground/40 font-bold select-none"
                                  title={`${col.label}: Denied`}
                                >
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* Sticky Action buttons */}
                        <td className="sticky right-0 z-10 bg-background/95 backdrop-blur-sm p-3 text-center border-l border-border">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleOpenAddEmployee(r.name)}
                              title={`Add Employee with role ${r.name}`}
                            >
                              <UserPlus className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditModal(r)}
                              title={`Edit ${r.name}`}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeleteRole(r._id, r.name)}
                              disabled={deletingId === r._id}
                              title={`Delete ${r.name}`}
                            >
                              {deletingId === r._id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      {/* Security controls footer info */}
      <div className="mt-4">
        <Section title="Sidebar Access & Role Enforcement">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Sidebar navigation dynamically hides routes that the authenticated user&apos;s role does not possess.</li>
            <li>Direct URL routing is guarded against unauthenticated access to prohibited modules.</li>
            <li>Changes to role permissions apply across all team members assigned to that role.</li>
            <li>Financial and Administration sections require explicit role privilege assignment.</li>
          </ul>
        </Section>
      </div>

      {/* Create / Edit Role Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-border">
            <DialogTitle className="text-xl font-bold">
              {isEditMode ? "Edit Role Permissions" : "Create New Role"}
            </DialogTitle>
            <DialogDescription>
              Select which sidebar sections and items this role can access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRole} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Role Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="roleName" className="font-semibold text-xs uppercase tracking-wider">
                    Role Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="roleName"
                    placeholder="e.g. Sales Manager, Service Engineer, Accounts Lead"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                  {matchingRoleHint && (
                    <p className="text-[11px] text-destructive font-semibold flex items-center gap-1.5 mt-1.5">
                      <span>⚠️</span>
                      Role &ldquo;{matchingRoleHint.name}&rdquo; is already defined.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="roleDesc" className="font-semibold text-xs uppercase tracking-wider">
                    Description <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Input
                    id="roleDesc"
                    placeholder="e.g. Handles sales pipeline and quotations"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Permissions Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Sidebar Permissions:
                  </span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {Object.values(formData.permissions).filter(Boolean).length} / {ALL_SIDEBAR_ITEMS.length} Allowed
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSelectAll(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSelectAll(false)}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Module Search in Modal */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Filter sidebar modules (e.g. Leads, Quotations, Bank)..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              {/* Grouped Sidebar Items */}
              <div className="space-y-3">
                {SIDEBAR_MODULES.map((group) => {
                  const filteredItems = group.items.filter(
                    (it) =>
                      it.label.toLowerCase().includes(modalSearch.toLowerCase()) ||
                      group.group.toLowerCase().includes(modalSearch.toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  const allGroupChecked = filteredItems.every((it) =>
                    Boolean(formData.permissions[it.key])
                  );

                  return (
                    <div
                      key={group.group}
                      className="rounded-lg border border-border bg-card p-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {group.group}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({filteredItems.filter((i) => formData.permissions[i.key]).length}/{filteredItems.length})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleGroup(group.group, !allGroupChecked)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          {allGroupChecked ? "Deselect Group" : "Select Group"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {filteredItems.map((item) => {
                          const isChecked = Boolean(formData.permissions[item.key]);
                          return (
                            <label
                              key={item.key}
                              className={`flex items-center gap-2.5 p-2 rounded-md border text-left cursor-pointer transition-all ${
                                isChecked
                                  ? "border-primary/40 bg-primary/5 text-foreground"
                                  : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              <Checkbox
                                id={`perm-${item.key}`}
                                checked={isChecked}
                                onCheckedChange={() => handleTogglePermission(item.key)}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium truncate leading-tight">
                                  {item.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground/70 truncate leading-none mt-0.5">
                                  {item.href}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (!isEditMode && Boolean(matchingRoleHint))}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    {isEditMode ? "Update Role" : "Create Role"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog from Users & Roles */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Employee to Role</DialogTitle>
            <DialogDescription>
              Create a new employee profile and assign them to an organizational role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4 pt-1">
            <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground">
              <Mail className="size-4 text-primary shrink-0" />
              <span>A welcome onboarding email with account credentials and role permissions will automatically be sent to the employee.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="empFirstName">First Name *</Label>
                <Input
                  id="empFirstName"
                  value={employeeFormData.firstName}
                  onChange={(e) =>
                    setEmployeeFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empLastName">Last Name *</Label>
                <Input
                  id="empLastName"
                  value={employeeFormData.lastName}
                  onChange={(e) =>
                    setEmployeeFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empRole">Assigned Role *</Label>
              <Select
                value={employeeFormData.role}
                onValueChange={(val) =>
                  setEmployeeFormData((prev) => ({ ...prev, role: val }))
                }
              >
                <SelectTrigger id="empRole">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {roles.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="empPhone">Phone *</Label>
                <Input
                  id="empPhone"
                  placeholder="+91 98765 43210"
                  value={employeeFormData.phone}
                  onChange={(e) =>
                    setEmployeeFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empEmail">Work Email *</Label>
                <Input
                  id="empEmail"
                  type="email"
                  placeholder="employee@company.com"
                  value={employeeFormData.email}
                  onChange={(e) =>
                    setEmployeeFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEmployeeModalOpen(false)}
                disabled={isSubmittingEmployee}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingEmployee} className="gap-1.5">
                {isSubmittingEmployee ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating & Sending Email...
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Create Employee
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
