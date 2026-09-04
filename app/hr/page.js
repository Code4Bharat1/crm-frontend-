"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  UserPlus,
  Shield,
  Search,
  Users,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  Building2,
  Trash2,
  ExternalLink,
  Loader2,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Kpi, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from "@/services/employeeService";
import { getRoles, createRole, deleteRole } from "@/services/roleService";

const cleanRoleStr = (s) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const getRoleStem = (s) => cleanRoleStr(s).replace(/(?:es|s)$/, "");

const isRoleMatch = (a, b) => {
  if (!a || !b) return false;
  const na = cleanRoleStr(a), nb = cleanRoleStr(b);
  if (na === nb) return true;
  const sa = getRoleStem(a), sb = getRoleStem(b);
  if (sa.length >= 3 && sa === sb) return true;
  return na === nb + "s" || nb === na + "s";
};

export default function Page() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | staffed | vacant

  // Expanded role cards to see member details
  const [expandedRoles, setExpandedRoles] = useState(new Set());

  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false);
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Employee creation form data (no department required)
  const [employeeFormData, setEmployeeFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    email: "",
    employmentType: "Full Time",
    status: "Active",
  });

  // Employee editing form data & state
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingEmployeeCode, setEditingEmployeeCode] = useState("");
  const [isSubmittingEditEmployee, setIsSubmittingEditEmployee] = useState(false);
  const [editEmployeeFormData, setEditEmployeeFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    phone: "",
    email: "",
    employmentType: "Full Time",
    status: "Active",
  });

  const handleOpenEditEmployee = (emp) => {
    setEditingEmployeeId(emp._id);
    setEditingEmployeeCode(emp.employeeCode || "");
    setEditEmployeeFormData({
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      role: emp.role || (rolesData[0]?.name || ""),
      phone: emp.phone || "",
      email: emp.email || "",
      employmentType: emp.employmentType || "Full Time",
      status: emp.status || "Active",
    });
    setIsEditEmployeeModalOpen(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editEmployeeFormData.firstName.trim() || !editEmployeeFormData.lastName.trim() || !editEmployeeFormData.role || !editEmployeeFormData.email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmittingEditEmployee(true);
    try {
      const res = await updateEmployee(editingEmployeeId, editEmployeeFormData);
      if (res && res.success) {
        toast.success(res.message || `Employee ${editEmployeeFormData.firstName} ${editEmployeeFormData.lastName} updated and notification email sent`);
        setIsEditEmployeeModalOpen(false);
        fetchData();
      } else {
        toast.error(res?.message || "Failed to update employee");
      }
    } catch (error) {
      toast.error(error.message || "Failed to update employee");
    } finally {
      setIsSubmittingEditEmployee(false);
    }
  };

  // Quick Role creation form data
  const [roleFormData, setRoleFormData] = useState({
    name: "",
    description: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, rolesRes] = await Promise.all([
        getEmployees({ limit: 100 }),
        getRoles(),
      ]);

      if (empRes?.success) {
        setEmployees(empRes.data.employees || []);
      }
      if (rolesRes?.success && Array.isArray(rolesRes.data)) {
        setRoles(rolesRes.data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to load roles and employee data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute aggregated real data ONLY for roles explicitly created in database
  const rolesData = useMemo(() => {
    return roles.map((r) => {
      const assignedEmployees = employees.filter((emp) =>
        isRoleMatch(emp.role, r.name)
      );

      return {
        id: r._id,
        name: r.name,
        description: r.description || "",
        permissions: r.permissions || {},
        isCustomRole: true,
        employees: assignedEmployees,
        staffCount: assignedEmployees.length,
        isVacant: assignedEmployees.length === 0,
        createdAt: r.createdAt,
      };
    });
  }, [roles, employees]);

  // Filtered roles based on search and status tabs
  const filteredRoles = useMemo(() => {
    return rolesData.filter((r) => {
      const matchesSearch =
        !searchQuery.trim() ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employees.some((e) => e.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "staffed" && !r.isVacant) ||
        (statusFilter === "vacant" && r.isVacant);

      return matchesSearch && matchesStatus;
    });
  }, [rolesData, searchQuery, statusFilter]);

  // Toggle role employee expansion
  const toggleRoleExpand = (roleName) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleName)) next.delete(roleName);
      else next.add(roleName);
      return next;
    });
  };

  // Open employee modal prefilled with role
  const handleOpenAssignEmployee = (roleName = "") => {
    setEmployeeFormData({
      firstName: "",
      lastName: "",
      role: roleName || (rolesData[0]?.name || ""),
      phone: "",
      email: "",
      employmentType: "Full Time",
      status: "Active",
    });
    setIsEmployeeModalOpen(true);
  };

  // Create real employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!employeeFormData.role) {
      toast.error("Please select a role");
      return;
    }

    setIsSubmittingEmployee(true);
    try {
      const res = await createEmployee(employeeFormData);
      if (res && res.success) {
        toast.success(res.message || `Employee created and email sent to ${employeeFormData.email}`);
        setIsEmployeeModalOpen(false);
        fetchData(); // Refresh real data
      }
    } catch (error) {
      toast.error(error.message || "Failed to create employee");
    } finally {
      setIsSubmittingEmployee(false);
    }
  };

  // Live hint if creating a role matching an existing designation
  const hrMatchingRoleHint = useMemo(() => {
    if (!roleFormData.name.trim()) return null;
    return rolesData.find((r) => isRoleMatch(r.name, roleFormData.name.trim()));
  }, [roleFormData.name, rolesData]);

  // Create role directly
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (hrMatchingRoleHint) {
      toast.error(`Role "${hrMatchingRoleHint.name}" is already defined`);
      return;
    }

    setIsSubmittingRole(true);
    try {
      const res = await createRole({
        name: roleFormData.name.trim(),
        description: roleFormData.description.trim(),
        permissions: { dashboard: true },
      });
      if (res && res.success) {
        toast.success(res.message || `Role "${roleFormData.name}" saved successfully`);
        setIsRoleModalOpen(false);
        setRoleFormData({ name: "", description: "" });
        fetchData();
      }
    } catch (error) {
      toast.error(error.message || "Failed to create role");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) return;
    try {
      await deleteRole(roleId);
      toast.success(`Role "${roleName}" deleted`);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to delete role");
    }
  };

  // KPI calculations from real data
  const totalRolesCount = rolesData.length;
  const staffedRolesCount = rolesData.filter((r) => !r.isVacant).length;
  const vacantRolesCount = rolesData.filter((r) => r.isVacant).length;
  const uniqueDepartmentsCount = useMemo(() => {
    const depts = new Set();
    employees.forEach((e) => e.department && depts.add(e.department));
    return depts.size;
  }, [employees]);

  return (
    <>
      <PageHeader
        breadcrumb="People / HR"
        title="Roles & Designations"
        subtitle="Manage organizational roles, designations, permissions, and active team member staffing allocations."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              asChild
              className="gap-1.5"
            >
              <Link href="/users-roles">
                <Lock className="size-3.5" />
                Configure Permissions
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsRoleModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              Create Role
            </Button>
            <Button
              onClick={() => handleOpenAssignEmployee(rolesData[0]?.name || "")}
              className="gap-1.5"
            >
              <UserPlus className="size-4" />
              Assign Employee
            </Button>
          </div>
        }
      />

      {/* Real Data KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Created Roles"
          value={totalRolesCount}
          sub={`${staffedRolesCount} staffed, ${vacantRolesCount} vacant`}
        />
        <Kpi
          label="Active Staff"
          value={employees.length}
          sub="Employees in database"
          tone="accent"
        />
        <Kpi
          label="Vacant Positions"
          value={vacantRolesCount}
          tone={vacantRolesCount > 0 ? "warning" : "default"}
          sub={vacantRolesCount > 0 ? "Roles requiring staffing" : "All created roles staffed"}
        />
        <Kpi
          label="Staffed Roles"
          value={staffedRolesCount}
          sub="Roles with assigned members"
        />
      </div>

      {/* Main Roles & Designations Content */}
      <div className="mt-6">
        <Section
          title="Organizational Roles & Designations"
          description="Detailed breakdown of all roles with real staff allocations, departments, and permissions"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {filteredRoles.length} of {rolesData.length} designations
              </span>
            </div>
          }
        >
          {/* Search & Filter Bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                All Roles ({rolesData.length})
              </button>
              <button
                onClick={() => setStatusFilter("staffed")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  statusFilter === "staffed"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                Staffed ({staffedRolesCount})
              </button>
              <button
                onClick={() => setStatusFilter("vacant")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  statusFilter === "vacant"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>Vacant</span>
                {vacantRolesCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-600">
                    {vacantRolesCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search role, employee, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {/* Roles Table with Real Data */}
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">
              <Loader2 className="mx-auto size-7 animate-spin text-primary mb-2" />
              Loading roles and employee data...
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="py-14 text-center rounded-lg border border-dashed border-border bg-card">
              <Shield className="size-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No roles match your search</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search criteria or create a new role.
              </p>
              <Button
                size="sm"
                onClick={() => setIsRoleModalOpen(true)}
                className="mt-3 gap-1.5"
              >
                <Plus className="size-3.5" />
                Create Role
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoles.map((r) => {
                const isExpanded = expandedRoles.has(r.name);
                const permissionsCount = r.permissions
                  ? Object.values(r.permissions).filter(Boolean).length
                  : 0;

                return (
                  <div
                    key={r.name}
                    className={cn(
                      "rounded-lg border border-border bg-card transition-all overflow-hidden",
                      r.isVacant ? "border-dashed border-amber-500/40 bg-amber-500/5" : "hover:border-border/90"
                    )}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4">
                      {/* Left: Role Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => toggleRoleExpand(r.name)}
                          className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                          title="Toggle employee list"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-primary" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-foreground text-base leading-none">
                              {r.name}
                            </h3>
                            {r.isCustomRole && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold border-primary/40 text-primary py-0"
                              >
                                Synced Role
                              </Badge>
                            )}
                            {r.isVacant ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                                <AlertCircle className="size-3" />
                                Vacant Position
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                                <CheckCircle2 className="size-3" />
                                {r.staffCount} {r.staffCount === 1 ? "Employee" : "Employees"} Assigned
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {r.description || "Configured organizational role"}
                          </p>
                        </div>
                      </div>

                      {/* Right: Stats & Actions */}
                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        {/* Permissions badge */}
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            Sidebar Access
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {permissionsCount > 0 ? `${permissionsCount} / 37 modules` : "Standard Access"}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenAssignEmployee(r.name)}
                            className="gap-1.5 text-xs h-8"
                          >
                            <UserPlus className="size-3.5" />
                            Assign Employee
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="text-xs h-8 text-muted-foreground hover:text-foreground"
                            title="Configure role permissions in Users & Roles"
                          >
                            <Link href="/users-roles" className="gap-1">
                              <Lock className="size-3.5" />
                              Permissions
                            </Link>
                          </Button>

                          {r.isCustomRole && r.isVacant && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteRole(r.id, r.name)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              title="Delete vacant role"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Section: Real Assigned Employees List */}
                    {isExpanded && (
                      <div className="border-t border-border/80 bg-muted/20 p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center justify-between">
                          <span>Team Members Assigned to {r.name} ({r.employees.length})</span>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => handleOpenAssignEmployee(r.name)}
                            className="h-auto p-0 text-xs text-primary font-medium"
                          >
                            + Add New Employee
                          </Button>
                        </h4>

                        {r.employees.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground rounded-md border border-dashed border-border/70 bg-card/50">
                            <p className="font-medium text-foreground">No employees assigned yet</p>
                            <p className="mt-0.5">Click &ldquo;Assign Employee&rdquo; above to add a team member to this designation.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {r.employees.map((emp) => (
                              <div
                                key={emp._id || emp.employeeCode}
                                className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-card shadow-2xs hover:border-primary/40 transition-colors"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary font-mono">
                                  {emp.firstName?.[0]}{emp.lastName?.[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="font-semibold text-xs text-foreground truncate">
                                      {emp.fullName}
                                    </p>
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                      {emp.employeeCode}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground mt-0.5">
                                    <span className="truncate flex items-center gap-1">
                                      <Mail className="size-2.5 shrink-0" />
                                      {emp.email}
                                    </span>
                                    {emp.phone && (
                                      <span className="text-[10px] text-muted-foreground/80 shrink-0">
                                        {emp.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleOpenEditEmployee(emp)}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    title={`Edit ${emp.fullName}`}
                                  >
                                    <Edit2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Assign / Create Employee Dialog */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Assign Employee to Role</DialogTitle>
            <DialogDescription>
              Enter team member details to assign them to an organizational role.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEmployee} className="space-y-4 pt-1">
            <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground">
              <Mail className="size-4 text-primary shrink-0" />
              <span>A welcome email with account details and role permissions will automatically be sent to the employee.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
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
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
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

            {/* Role Select Dropdown populated ONLY from Created Roles */}
            <div className="space-y-1.5">
              <Label htmlFor="role">Role / Designation *</Label>
              <Select
                value={employeeFormData.role}
                onValueChange={(val) =>
                  setEmployeeFormData((prev) => ({ ...prev, role: val }))
                }
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {rolesData.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
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
                    Assigning...
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Save & Assign
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Create Role Dialog */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Add a new organizational designation. You can configure granular permissions anytime in Users & Roles.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="newRoleName">Role Name *</Label>
              <Input
                id="newRoleName"
                placeholder="e.g. Operations Head, QA Inspector"
                value={roleFormData.name}
                onChange={(e) =>
                  setRoleFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                autoFocus
              />
              {hrMatchingRoleHint && (
                <p className="text-[11px] text-destructive font-semibold flex items-center gap-1.5 mt-1.5">
                  <span>⚠️</span>
                  Role &ldquo;{hrMatchingRoleHint.name}&rdquo; is already defined.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newRoleDesc">Description (Optional)</Label>
              <Input
                id="newRoleDesc"
                placeholder="Brief role responsibilities"
                value={roleFormData.description}
                onChange={(e) =>
                  setRoleFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRoleModalOpen(false)}
                disabled={isSubmittingRole}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingRole || Boolean(hrMatchingRoleHint)}
                className="gap-1.5"
              >
                {isSubmittingRole ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeModalOpen} onOpenChange={setIsEditEmployeeModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
            <DialogDescription>
              Update team member profile and role assignment for {editingEmployeeCode || "employee"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateEmployee} className="space-y-4 pt-1">
            <div className="flex items-center gap-2.5 p-2.5 rounded-md bg-primary/5 border border-primary/20 text-xs text-foreground">
              <Mail className="size-4 text-primary shrink-0" />
              <span>An update notification email will automatically be sent to the employee with their updated profile details.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input
                  id="editFirstName"
                  value={editEmployeeFormData.firstName}
                  onChange={(e) =>
                    setEditEmployeeFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editLastName">Last Name *</Label>
                <Input
                  id="editLastName"
                  value={editEmployeeFormData.lastName}
                  onChange={(e) =>
                    setEditEmployeeFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            {/* Role Select Dropdown populated ONLY from Created Roles */}
            <div className="space-y-1.5">
              <Label htmlFor="editRole">Role / Designation *</Label>
              <Select
                value={editEmployeeFormData.role}
                onValueChange={(val) =>
                  setEditEmployeeFormData((prev) => ({ ...prev, role: val }))
                }
              >
                <SelectTrigger id="editRole">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {editEmployeeFormData.role && !rolesData.some(r => r.name.toLowerCase() === editEmployeeFormData.role.toLowerCase()) && (
                    <SelectItem value={editEmployeeFormData.role}>
                      {editEmployeeFormData.role}
                    </SelectItem>
                  )}
                  {rolesData.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editPhone">Phone *</Label>
                <Input
                  id="editPhone"
                  placeholder="+91 98765 43210"
                  value={editEmployeeFormData.phone}
                  onChange={(e) =>
                    setEditEmployeeFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editEmail">Work Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="colleague@company.com"
                  value={editEmployeeFormData.email}
                  onChange={(e) =>
                    setEditEmployeeFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={editEmployeeFormData.status}
                  onValueChange={(val) =>
                    setEditEmployeeFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editEmployment">Employment Type</Label>
                <Select
                  value={editEmployeeFormData.employmentType}
                  onValueChange={(val) =>
                    setEditEmployeeFormData((prev) => ({ ...prev, employmentType: val }))
                  }
                >
                  <SelectTrigger id="editEmployment">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full Time">Full Time</SelectItem>
                    <SelectItem value="Part Time">Part Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditEmployeeModalOpen(false)}
                disabled={isSubmittingEditEmployee}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingEditEmployee} className="gap-1.5">
                {isSubmittingEditEmployee ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Save Changes
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
