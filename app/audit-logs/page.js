"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataTable, KeyValue, Kpi, Metric, NotBuiltNotice, PageHeader, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate, fmtDateTime, inr, inrShort } from "@/lib/crm-data";
import { getAuditLogs, getAuditStats } from "@/lib/api";

export default function Page() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ entries: 0, critical: 0, warnings: 0, retention: '7 years' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsData, logsData] = await Promise.all([
          getAuditStats(),
          getAuditLogs({ limit: 100 }) // fetching 100 recent logs for the table
        ]);
        setStats(statsData);
        setLogs(logsData.auditLogs || []);
      } catch (error) {
        console.error("Failed to load audit logs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <PageHeader breadcrumb="Administration / Audit Logs" title="Audit Logs" subtitle="Who did what, when and from where — for every important business and financial action." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Entries" value={stats.entries} />
        <Kpi label="Critical" value={stats.critical} tone="danger" />
        <Kpi label="Warnings" value={stats.warnings} tone="warning" />
        <Kpi label="Retention" value={stats.retention} />
      </div>
      <div className="mt-5">
        {loading ? (
          <div className="text-sm text-gray-500">Loading audit logs...</div>
        ) : (
          <DataTable
            rows={logs}
            columns={[
              { header: "When", cell: (r) => fmtDateTime(r.createdAt) },
              { header: "User", cell: (r) => <span className="font-semibold">{r.userName || r.userId}</span> },
              { header: "Action", cell: (r) => `${r.action} ${r.resourceType || ''} ${r.resourceId || ''} - ${r.description}` },
              { header: "IP address", cell: (r) => <span className="font-mono text-xs">{r.ipAddress}</span> },
              { header: "Severity", cell: (r) => <StatusBadge value={r.severity === 'CRITICAL' ? 'Critical' : r.severity === 'WARNING' ? 'Warning' : 'Info'} /> },
            ]}
            searchKeys={["userName", "action", "description", "module"]}
          />
        )}
      </div>
    </>
  );
}
