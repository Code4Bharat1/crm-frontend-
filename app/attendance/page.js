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
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { getAttendanceSummary, getAttendanceStats, createAttendance } from "@/services/attendanceService";
import { getExpenseClaims, exportExpenseClaims } from "@/services/expenseClaimService";
import { getEmployees } from "@/services/employeeService";

export default function Page() {
  const [stats, setStats] = useState({ apiStatus: "Not Configured", lastSynchronization: null, recordsSynchronized: 0, failedRecords: 0 });
  const [summary, setSummary] = useState([]);
  const [claims, setClaims] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Pagination and Search for Claims
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    date: new Date().toISOString().split('T')[0],
    status: "Present",
    overtimeHours: 0,
    remarks: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, summaryRes, empRes] = await Promise.all([
        getAttendanceStats(),
        getAttendanceSummary(),
        getEmployees({ limit: 100 }) // fetch all for dropdown
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (summaryRes.success) setSummary(summaryRes.data);
      if (empRes.success) setEmployees(empRes.data.employees);
      
      await fetchClaims(1, searchTerm);
    } catch (error) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async (page = 1, search = "") => {
    try {
      setClaimsLoading(true);
      const claimsRes = await getExpenseClaims({ page, limit: 10, search });
      if (claimsRes.success) {
        setClaims(claimsRes.data.claims);
        setClaimsPage(claimsRes.data.pagination.page);
        setClaimsTotalPages(claimsRes.data.pagination.totalPages);
      }
    } catch (error) {
      toast.error("Failed to fetch claims");
    } finally {
      setClaimsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debounced search for claims
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!loading) fetchClaims(1, searchTerm);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

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
      const res = await createAttendance({
        ...formData,
        overtimeHours: Number(formData.overtimeHours)
      });
      if (res.success) {
        toast.success(res.message);
        setIsModalOpen(false);
        setFormData({
          employeeId: "", date: new Date().toISOString().split('T')[0], status: "Present", overtimeHours: 0, remarks: ""
        });
        // Refresh summary
        const summaryRes = await getAttendanceSummary();
        if (summaryRes.success) setSummary(summaryRes.data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to create attendance");
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportClaims = async () => {
    try {
      await exportExpenseClaims();
      toast.success("Claims exported successfully");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const showEssAlert = () => {
    toast.error("ESS integration will be available after ESS API configuration.");
  };

  return (
    <>
      <PageHeader 
        breadcrumb="People / Attendance" 
        title="Attendance & ESS Integration" 
        subtitle="Attendance, leave, overtime, expenses, approvals and payslips are pulled from the existing ESS system through its API." 
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="API status" value={stats.apiStatus} tone="warning" />
        <Kpi label="Last synchronisation" value={stats.lastSynchronization || "Not synced"} />
        <Kpi label="Records synchronised" value={stats.recordsSynchronized} />
        <Kpi label="Failed records" value={stats.failedRecords} tone="danger" />
      </div>
      
      {/* <div className="mt-4">
        <NotBuiltNotice>ESS attendance API endpoint is reachable but the API key and employee-code mapping are not configured, so no records have been synchronised. Attendance is currently managed manually.</NotBuiltNotice>
      </div> */}
      
      <div className="mt-4 grid gap-4 lg:grid-cols-1">
        <Section 
          title="Attendance summary (manual entry)" 
          className="lg:col-span-2"
          actions={<Button size="sm" onClick={() => setIsModalOpen(true)}>Create Attendance</Button>}
        >
          {loading ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Loading summary...</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {summary.length === 0 ? (
                <li className="text-muted-foreground p-2">No attendance records found for this month.</li>
              ) : summary.map((e) => (
                <li key={e.employee.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                  <span>{e.employee.fullName} <span className="text-xs text-muted-foreground">· {e.employee.role}</span></span>
                  <span className="text-muted-foreground">{e.presentDays} present · {e.leaveDays} leave · {e.overtimeHours} hrs OT</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        
        {/* <Section title="Sync configuration">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Endpoint: https://ess.vendor.example/api/v2/attendance</p>
            <p>Auth: API key (encrypted secret, not configured)</p>
            <p>Mapping: ESS employee code → CONTECH employee code</p>
            <Button variant="outline" className="mt-2 w-full" onClick={showEssAlert}>Run manual sync</Button>
            <Button variant="outline" className="w-full" onClick={showEssAlert}>Test connection</Button>
          </div>
        </Section> */}
      </div>
      
      <div className="mt-8 flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Expense Claims</h3>
        <div className="flex gap-2">
          <Input 
            placeholder="Search claims..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="w-[200px]"
          />
          <Button variant="outline" onClick={handleExportClaims}>Export</Button>
        </div>
      </div>
      
      <div className="mt-3">
        {claimsLoading && claims.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">Loading claims...</div>
        ) : (
          <>
            <DataTable 
              rows={claims} 
              columns={[
                { header: "Claim", cell: (r) => r.claimId },
                { header: "Employee", cell: (r) => r.employeeId?.fullName || "Unknown" },
                { header: "Date", cell: (r) => fmtDate(r.date) },
                { header: "Category", cell: (r) => r.category },
                { header: "Amount", cell: (r) => inr(r.amount) },
                { header: "Project", cell: (r) => r.project || "—" },
                { header: "Status", cell: (r) => <StatusBadge value={r.status} /> },
              ]} 
            />
            
            <div className="mt-4 flex justify-between items-center text-sm text-muted-foreground">
              <span>Page {claimsPage} of {claimsTotalPages || 1}</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={claimsPage <= 1} 
                  onClick={() => fetchClaims(claimsPage - 1, searchTerm)}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={claimsPage >= claimsTotalPages}
                  onClick={() => fetchClaims(claimsPage + 1, searchTerm)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Attendance (Manual)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={formData.employeeId} onValueChange={(val) => handleSelectChange('employeeId', val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp._id} value={emp._id}>{emp.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                    <SelectItem value="Half Day">Half Day</SelectItem>
                    <SelectItem value="Holiday">Holiday</SelectItem>
                    <SelectItem value="Week Off">Week Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overtimeHours">Overtime Hours</Label>
              <Input id="overtimeHours" type="number" step="0.5" min="0" name="overtimeHours" value={formData.overtimeHours} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input id="remarks" name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Optional remarks" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? "Saving..." : "Save Attendance"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
