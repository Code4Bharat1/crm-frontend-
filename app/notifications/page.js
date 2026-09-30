"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader, Kpi, StatusBadge } from "@/components/crm-ui";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/crm-data";
import { getUser } from "@/lib/authUtils";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/services/notificationService";
import {
  Bell,
  Check,
  CheckCheck,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Page() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("All");

  const loadNotifs = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const res = await getNotifications();
      if (res?.notifications) {
        setItems(res.notifications);
        if (showToast) toast.success("Notifications refreshed");
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setItems((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
      );
      toast.success("Notification marked as read");
    } catch {
      setItems((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
      );
      toast.success("Notification marked as read");
    }
  };

  const handleMarkAllRead = async () => {
    const user = getUser();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead(user?.name);
      toast.success("All notifications marked as read");
    } catch {
      toast.success("All notifications marked as read");
    }
  };

  const unreadCount = items.filter((n) => !n.read).length;
  const projectCount = items.filter((n) => n.type === "Project").length;
  const serviceCount = items.filter((n) => n.type === "Service").length;
  const customerCount = items.filter((n) => n.type === "Customer").length;

  const filteredItems = items.filter((n) => {
    if (filterType === "All") return true;
    if (filterType === "Unread") return !n.read;
    return n.type === filterType;
  });

  const filterTabs = [
    { id: "All", label: "All", count: items.length },
    { id: "Unread", label: "Unread", count: unreadCount, highlight: unreadCount > 0 },
    { id: "Service", label: "Technician Dispatch", count: serviceCount },
    { id: "Project", label: "Project Manager", count: projectCount },
    { id: "Customer", label: "Salesperson", count: customerCount },
  ];

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto">
      <PageHeader
        breadcrumb="Administration / Notifications"
        title="Notification Centre"
        subtitle="Live notifications for technician dispatches, PM assignments, and alerts."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadNotifs(true)}
              disabled={refreshing}
              className="h-8.5 px-2.5 sm:px-3 text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className={cn("size-3.5", refreshing && "animate-spin text-primary")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-8.5 px-3 text-xs gap-1.5 cursor-pointer shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark All Read</span>
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Cards: Compact 2-column on mobile, 3-col on tablet, 5-col on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <Kpi label="Unread" value={unreadCount} tone="accent" />
        <Kpi label="Technician Dispatches" value={serviceCount} tone="success" sub="Field tickets" />
        <Kpi label="Project Alerts" value={projectCount} sub="PM Assignments" />
        <Kpi label="Customer Alerts" value={customerCount} sub="Salesperson" />
        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
          <Kpi label="Total Alerts" value={items.length} />
        </div>
      </div>

      {/* Touch-Friendly Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 sm:mx-0 sm:px-0">
        {filterTabs.map((tab) => {
          const isActive = filterType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground border border-border/80 hover:bg-muted/40"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : tab.highlight
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="panel p-8 sm:p-12 text-center bg-card rounded-xl border border-border">
            <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <Inbox className="size-6" />
            </div>
            <h4 className="text-sm font-bold text-foreground">No notifications found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              {loading
                ? "Loading notification stream…"
                : filterType !== "All"
                ? `There are currently no alerts matching the "${filterType}" filter.`
                : "You have no active notifications or assignment alerts at this time."}
            </p>
            {filterType !== "All" && (
              <button
                type="button"
                onClick={() => setFilterType("All")}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                View all notifications
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((n) => {
            const notifId = n._id || n.id;
            const isUnread = !n.read;

            return (
              <div
                key={notifId}
                className={cn(
                  "panel p-3.5 sm:p-4 transition-all rounded-xl border",
                  isUnread
                    ? "bg-blue-50/50 dark:bg-blue-950/25 border-blue-300/80 dark:border-blue-800/80 shadow-xs"
                    : "bg-card border-border/80"
                )}
              >
                {/* Header Row: Badge, Recipient, Unread Dot, Timestamp */}
                <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge value={n.type} />
                    {n.recipient && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        To: {n.recipient}
                      </span>
                    )}
                    {isUnread && (
                      <span className="size-2 rounded-full bg-blue-600 animate-pulse" title="Unread alert" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono ml-auto">
                    {n.at ? fmtDateTime(new Date(n.at)) : ""}
                  </span>
                </div>

                {/* Content */}
                <h4 className="mt-2 text-sm font-bold text-foreground leading-snug">
                  {n.title}
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {n.detail}
                </p>

                {/* Footer Action Row */}
                <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-border/50 gap-2 flex-wrap sm:flex-nowrap">
                  {n.link ? (
                    <Link
                      href={n.link}
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Open Assigned Record</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  ) : (
                    <span />
                  )}

                  {isUnread ? (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notifId)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/80 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800/80 border border-blue-300/60 dark:border-blue-700/60 transition-all cursor-pointer shadow-2xs active:scale-95 ml-auto"
                    >
                      <Check className="size-3 text-blue-600 dark:text-blue-400" />
                      <span>Mark as read</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 font-medium ml-auto">
                      <Check className="size-3 text-emerald-500" /> Read
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
