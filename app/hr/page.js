"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getEmployees, getEmployeeStats, createEmployee, exportEmployees } from "@/services/employeeService";

export default function Page() {
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ totalEmployees: 0, directors: 0, fieldTeam: 0, expenseClaimsPending: 0 });
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form data for creating a new employee
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "",
    department: "",
    phone: "",
    email: "",
    employmentType: "Full Time",
    status: "Active"
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, statsRes] = await Promise.all([
        getEmployees(),
        getEmployeeStats()
      ]);
      
      if (empRes.success) setEmployees(empRes.data.employees);
      if (statsRes.success) setStats(statsRes.data);
    } catch (error) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await createEmployee(formData);
      if (res.success) {
        toast.success(res.message);
        setIsModalOpen(false);
        setFormData({
          firstName: "", lastName: "", role: "", department: "",
          phone: "", email: "", employmentType: "Full Time", status: "Active"
        });
        fetchData(); // Refresh table and stats
      }
    } catch (error) {
      toast.error(error.message || "Failed to create employee");
    } finally {
      setIsCreating(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportEmployees();
      toast.success("Employees exported successfully");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  return (
    <>
      <PageHeader 
        breadcrumb="People / HR" 
        title="Employees & HR" 
        subtitle="Manage employees across management, accounts, sales, engineering, service, purchase and HR — with leave, overtime and expense approvals." 
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>Export</Button>
            <Button onClick={() => setIsModalOpen(true)}>Create Employee</Button>
          </div>
        }
      />
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Employees" value={stats.totalEmployees} />
        <Kpi label="Directors" value={stats.directors} />
        <Kpi label="Field team" value={stats.fieldTeam} tone="accent" />
        <Kpi label="Expense claims pending" value={stats.expenseClaimsPending} tone="warning" />
      </div>
      
      <div className="mt-5">
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading employees...</div>
        ) : (
          <DataTable 
            rows={employees} 
            columns={[
              { header: "Employee", cell: (r) => (<div><p className="font-semibold">{r.fullName}</p><p className="text-xs text-muted-foreground">{r.employeeCode}</p></div>) },
              { header: "Role", cell: (r) => <StatusBadge value={r.role} /> },
              { header: "Department", cell: (r) => r.department },
              { header: "Phone", cell: (r) => r.phone },
              { header: "Email", cell: (r) => <span className="text-muted-foreground">{r.email}</span> },
              { header: "Present days", cell: (r) => r.presentDays },
              { header: "Leave", cell: (r) => r.leaveDays },
              { header: "Overtime", cell: (r) => `${r.overtimeHours} hrs` },
            ]} 
            searchKeys={["fullName", "employeeCode", "email", "phone", "role", "department"]} 
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input id="role" name="role" value={formData.role} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input id="department" name="department" value={formData.department} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={formData.employmentType} onValueChange={(val) => handleSelectChange('employmentType', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full Time">Full Time</SelectItem>
                    <SelectItem value="Part Time">Part Time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? "Creating..." : "Create Employee"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
