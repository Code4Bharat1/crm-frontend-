"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, Section, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { ROLES, employees } from "@/lib/crm-data";
const PERMS = ["View", "Create", "Edit", "Delete", "Approve", "Export", "Financial", "Admin"];
const allow = (role, perm) => {
  if (role === "Director") return true;
  if (role === "Read-only") return perm === "View";
  if (perm === "Admin") return role === "Admin Manager";
  if (perm === "Financial") return ["Accounts Manager", "Accounts Executive", "Admin Manager"].includes(role);
  if (perm === "Delete") return ["Admin Manager", "Accounts Manager"].includes(role);
  if (perm === "Approve") return ["Admin Manager", "Accounts Manager", "Project Manager", "HR"].includes(role);
  return true;
};

export default function Page() {
  return (
    <>
      <PageHeader breadcrumb="Administration / Users & Roles" title="Users & Roles" subtitle="Granular permissions per role: view, create, edit, delete, approve, export, financial access and admin access." />
      <div className="grid gap-3 sm:grid-cols-3"><Kpi label="Users" value={employees.length} /><Kpi label="Roles" value={ROLES.filter((r) => r !== "Read-only").length} /><Kpi label="Financial access" value={employees.filter((e) => ["Director", "Accounts Manager", "Accounts Executive", "Admin Manager"].includes(e.role)).length} tone="danger" /></div>
      <div className="mt-5">
        <Section title="Permission matrix" description="Sensitive financial and banking data is restricted by role">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-left text-xs uppercase text-muted-foreground"><th className="p-2">Role</th>{PERMS.map((p) => <th key={p} className="p-2 text-center">{p}</th>)}</tr></thead>
              <tbody>
                {ROLES.filter((r) => r !== "Read-only").map((r) => (
                  <tr key={r} className="border-t border-border">
                    <td className="p-2 font-semibold">{r}</td>
                    {PERMS.map((p) => (
                      <td key={p} className="p-2 text-center">{allow(r, p) ? <span className="font-bold text-success">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
      <div className="mt-4">
        <Section title="Security controls">
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Access / refresh token session architecture with server-side permission checks on every request.</li>
            <li>Encryption in transit; sensitive stored values (API credentials, bank config) encrypted at rest.</li>
            <li>Audit logging for financial, banking, permission and integration changes.</li>
            <li>Session management, forced re-authentication for financial approvals and scheduled backups.</li>
          </ul>
        </Section>
      </div>
    </>
  );
}
