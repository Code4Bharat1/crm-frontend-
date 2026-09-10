"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BellRing,
  FileText,
  Receipt,
  ClipboardList,
  Truck,
  IndianRupee,
  Landmark,
  Package,
  Boxes,
  Barcode,
  FolderKanban,
  TrendingUp,
  Wrench,
  ShieldCheck,
  ShoppingCart,
  BookOpen,
  Users2,
  CalendarCheck,
  BarChart3,
  Lock,
  ScrollText,
  Server,
  Search,
  Plus,
  Menu,
  Bell,
  LogOut,
  Bot,
  Mail,
  MessageCircle,
  Percent,
  Building2,
  Check,
  CheckCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { StatusBadge } from "@/components/crm-ui";
import { fmtDateTime } from "@/lib/crm-data";
import { toast } from "sonner";
import {
  getUser,
  getAuthData,
  setAuthData,
  clearAuthData,
  canAccessModule,
  canAccessPath,
  getSidebarPermissions,
  getFirstAllowedHref,
  isSuperAdminRole
} from "@/lib/authUtils";
import { SIDEBAR_MODULES, isRoleMatch } from "@/lib/sidebarModules";
import { getRoles } from "@/services/roleService";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/services/notificationService";
import { useRouter } from "next/navigation";

// Presentation-only: maps each SIDEBAR_MODULES key to its sidebar icon.
// SIDEBAR_MODULES itself (label/href/key) is shared with the Users & Roles
// permission editor so the two can never drift apart.
const MODULE_ICONS = {
  dashboard: LayoutDashboard,
  leads: UserPlus,
  customers: Users,
  whatsapp: MessageCircle,
  email: Mail,
  ai_processing: Bot,
  follow_ups: BellRing,
  quotations: FileText,
  proformas: Receipt,
  orders: ClipboardList,
  deliveries: Truck,
  invoices: Receipt,
  payments: IndianRupee,
  products: Package,
  inventory: Boxes,
  serial_numbers: Barcode,
  suppliers: Users2,
  purchase: ShoppingCart,
  projects: FolderKanban,
  profitability: TrendingUp,
  service: Wrench,
  warranty: ShieldCheck,
  ledger: BookOpen,
  banking: Landmark,
  gst: Percent,
  hr: Users2,
  attendance: CalendarCheck,
  sales_performance: BarChart3,
  reports: BarChart3,
  notifications: Bell,
  company_settings: Building2,
  users_roles: Lock,
  audit_logs: ScrollText,
  deployment: Server,
};

const NAV = SIDEBAR_MODULES.map((group) => ({
  group: group.group,
  items: group.items.map((item) => ({ ...item, icon: MODULE_ICONS[item.key] })),
}));

const QUICK_ACTIONS = [
  { label: "Create Lead", href: "/leads?action=create", module: "leads", icon: UserPlus },
  { label: "Add Customer", href: "/customers?action=create", module: "customers", icon: Users },
  { label: "Create Quotation", href: "/quotations?action=create", module: "quotations", icon: FileText },
  { label: "Create Proforma Invoice", href: "/proformas?action=create", module: "proformas", icon: FileText },
  { label: "Create Sales Order", href: "/orders?action=create", module: "orders", icon: ShoppingCart },
  { label: "Create Delivery Note", href: "/deliveries?action=create", module: "deliveries", icon: Truck },
  { label: "Create Sales Invoice", href: "/invoices?action=create", module: "invoices", icon: Receipt },
  { label: "Record Payment", href: "/payments?action=create", module: "payments", icon: IndianRupee },
  { label: "Add Product", href: "/products?action=create", module: "products", icon: Package },
  { label: "Create Project", href: "/projects?action=create", module: "projects", icon: FolderKanban },
  { label: "Create Service Request", href: "/service?action=create", module: "service", icon: Wrench },
  { label: "Add Follow-up", href: "/follow-ups?action=create", module: "follow_ups", icon: CalendarCheck },
  { label: "New Purchase Order", href: "/purchase?action=create", module: "purchase", icon: ShoppingCart },
  { label: "Bank Reconciliation", href: "/banking", module: "banking", icon: Landmark },
];

const getFilteredNav = (currentUser, customPerms) => {
  const user = currentUser || getUser();
  if (!user) return [];
  const isSuperAdmin = isSuperAdminRole(user?.role);

  // Strictly Admin gets all permissions and full sidebar
  if (isSuperAdmin) {
    return NAV;
  }

  const sidebarPermissions = customPerms || getSidebarPermissions() || {};

  // For non-admin employees, show strictly what Admin enabled + dashboard
  return NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((it) => it.key === "dashboard" || Boolean(sidebarPermissions[it.key])),
    }))
    .filter((group) => group.items.length > 0);
};

function SidebarNav({ onNavigate, user, permissions }) {
  const pathname = usePathname();
  const filteredNav = useMemo(() => getFilteredNav(user, permissions), [user, permissions]);
  return /* @__PURE__ */ React.createElement("nav", { className: "flex-1 overflow-y-auto no-scrollbar px-2 py-3" }, filteredNav.map((g) => /* @__PURE__ */ React.createElement("div", { key: g.group, className: "mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/50" }, g.group), /* @__PURE__ */ React.createElement("ul", { className: "space-y-0.5" }, g.items.map((it) => {
    const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
    return /* @__PURE__ */ React.createElement("li", { key: it.href }, /* @__PURE__ */ React.createElement(
      Link,
      {
        href: it.href,
        onClick: onNavigate,
        className: cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      },
      /* @__PURE__ */ React.createElement(it.icon, { className: "size-4 shrink-0" }),
      /* @__PURE__ */ React.createElement("span", { className: "truncate" }, it.label)
    ));
  })))));
}
function Brand() {
  return null;
}
function AppShell({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarPerms, setSidebarPerms] = useState(null);
  const [liveNotifications, setLiveNotifications] = useState([]);

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    setUser(u);
    const localPerms = getSidebarPermissions();
    if (localPerms) {
      setSidebarPerms(localPerms);
    }

    if (u) {
      getNotifications({ limit: 20 })
        .then((res) => setLiveNotifications(res?.notifications || []))
        .catch(() => { });
    }

    if (!u) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    const isSuperAdmin = isSuperAdminRole(u.role);

    // Live permission sync: non-admins immediately fetch latest role permissions from DB
    if (!isSuperAdmin) {
      getRoles()
        .then((res) => {
          if (res && res.success && Array.isArray(res.data)) {
            const matchedRole = res.data.find((r) => isRoleMatch(r.name, u.role));
            if (matchedRole && matchedRole.permissions) {
              const updatedPerms = { ...matchedRole.permissions, dashboard: true };
              setSidebarPerms(updatedPerms);
              const authData = getAuthData();
              if (authData) {
                authData.sidebarPermissions = updatedPerms;
                setAuthData(authData);
              }
            }
          }
        })
        .catch((err) => console.warn("Live role sync warning:", err));

      if (!canAccessPath(pathname)) {
        toast.error("You are not authorized to view this module.");
        const fallback = getFirstAllowedHref();
        if (fallback && fallback !== pathname) {
          router.replace(fallback);
        }
      }
    }
  }, [pathname, router]);

  // Extract all navigable sidebar pages according to user access (HOOKS MUST PRECEDE EARLY RETURNS)
  const allNavPages = useMemo(() => {
    const nav = getFilteredNav(user, sidebarPerms);
    const pages = [];
    nav.forEach((group) => {
      group.items.forEach((item) => {
        pages.push({
          label: item.label,
          href: item.href,
          group: group.group,
          icon: item.icon
        });
      });
    });
    return pages;
  }, [user, sidebarPerms]);

  // Filter sidebar pages matching search query strictly from permitted navigation
  const matchingPages = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return allNavPages;
    return allNavPages.filter((p) => {
      const matchLabel = p.label.toLowerCase().includes(query);
      const matchGroup = p.group.toLowerCase().includes(query);
      const matchHref = p.href.toLowerCase().includes(query);
      return matchLabel || matchGroup || matchHref;
    });
  }, [allNavPages, q]);

  // Business-record search (customers, invoices, etc.) has no real backend
  // yet -- no cross-collection search endpoint exists, so this stays empty
  // rather than showing fabricated results. Sidebar page search above is
  // real (driven by actual permissions), this just doesn't extend to records.
  const hits = [];

  const permittedQuickActions = useMemo(() => {
    return QUICK_ACTIONS.filter((action) => {
      return !action.module || canAccessModule(action.module);
    });
  }, [user, sidebarPerms]);

  // Global keyboard shortcut: Ctrl+K or Cmd+K to open search dialog
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const handleLogout = (e) => {
    e.preventDefault();
    clearAuthData();
    router.push('/login');
  };

  if (!mounted) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <span className="text-xs text-gray-500 font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-center p-6 bg-white rounded-2xl shadow-sm border border-gray-200 max-w-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Redirecting to Login</h3>
            <p className="text-xs text-gray-500 mt-1">Please sign in to access the CRM platform.</p>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold shadow hover:bg-blue-700 transition-colors"
          >
            Go to Login Now →
          </Link>
        </div>
      </div>
    );
  }

  const currentUser = {
    name: user?.name || user?.email?.split('@')[0] || "User",
    email: user?.email || "",
    role: user?.role || "Member"
  };

  const unread = liveNotifications.filter((n) => !n.read).length;

  const handleMarkSingleNotifRead = async (id) => {
    setLiveNotifications((prev) =>
      prev.map((n) => (n._id === id || n.id === id ? { ...n, read: true } : n))
    );
    try {
      await markNotificationAsRead(id);
      toast.success("Notification marked as read");
    } catch (err) {
      console.warn("Mark notification fallback:", err);
      toast.success("Notification marked as read");
    }
  };

  const handleMarkAllSheetRead = async () => {
    setLiveNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead(user?.name);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.warn("Mark all notifications fallback:", err);
      toast.success("All notifications marked as read");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex overflow-hidden">
        <SidebarNav user={user} permissions={sidebarPerms} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar-gradient sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 text-primary-foreground shadow-md">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/15 lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col overflow-hidden">
                <SidebarNav onNavigate={() => setMobileOpen(false)} user={user} permissions={sidebarPerms} />
              </div>
            </SheetContent>
          </Sheet>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 flex-1 items-center gap-2 rounded-md bg-white/12 px-3 text-left text-sm text-white/80 transition-colors hover:bg-white/20"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate">Search permitted pages and records…</span>
            <kbd className="hidden sm:inline-flex ml-auto h-5 items-center gap-1 rounded border border-white/25 bg-white/10 px-1.5 font-mono text-[10px] font-semibold text-white/80">
              Ctrl+K
            </kbd>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 gap-1.5 bg-accent font-bold text-accent-foreground hover:bg-accent/90 cursor-pointer shadow-sm">
                <Plus className="size-4" /> <span className="hidden sm:inline">Quick Action</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 shadow-xl rounded-xl border border-gray-100">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5">
                Quick Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[380px] overflow-y-auto py-1">
                {permittedQuickActions.map((action) => {
                  const Icon = action.icon || Plus;
                  return (
                    <DropdownMenuItem
                      key={action.label}
                      onSelect={() => router.push(action.href)}
                      className="cursor-pointer flex items-center gap-2.5 px-3 py-2 text-sm font-medium hover:bg-accent/15 focus:bg-accent/15 transition-colors"
                    >
                      <Icon className="size-4 text-blue-600 shrink-0" />
                      <span className="truncate">{action.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-white/15">
                <Bell className="size-5" />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                    {unread}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/60">
                <div>
                  <SheetTitle className="text-base font-bold">Notification centre</SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {unread > 0 ? `${unread} unread alert${unread > 1 ? "s" : ""}` : "All alerts are up to date"}
                  </p>
                </div>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllSheetRead}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
                {liveNotifications.length === 0 && (
                  <p className="py-12 text-center text-sm text-muted-foreground">No notifications yet.</p>
                )}
                {liveNotifications.map((n) => {
                  const notifId = n._id || n.id;
                  return (
                    <div
                      key={notifId}
                      className={`rounded-xl border p-3.5 transition-all ${
                        !n.read
                          ? "border-blue-300/80 bg-blue-50/40 dark:bg-blue-950/30 dark:border-blue-800/80 shadow-xs"
                          : "border-border bg-card/60 opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge value={n.type} />
                        <span className="text-[11px] text-muted-foreground font-mono">{fmtDateTime(n.at)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground leading-snug">{n.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.detail}</p>
                      
                      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-border/50 text-xs">
                        {n.link ? (
                          <Link
                            href={n.link}
                            className="text-primary font-semibold hover:underline text-[11px] inline-flex items-center gap-1"
                          >
                            Open Details →
                          </Link>
                        ) : (
                          <span />
                        )}

                        {!n.read ? (
                          <button
                            type="button"
                            onClick={() => handleMarkSingleNotifRead(notifId)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100/70 hover:bg-blue-200/80 dark:bg-blue-900/50 dark:hover:bg-blue-800/70 border border-blue-300/50 dark:border-blue-700/50 transition-all cursor-pointer shadow-2xs"
                            title="Mark this message as read"
                          >
                            <Check className="size-3 text-blue-600 dark:text-blue-400" />
                            <span>Mark read</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 font-medium">
                            <Check className="size-3 text-emerald-500" /> Read
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/15">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {currentUser.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-xs font-semibold">{currentUser.name}</span>
                  <span className="block text-[11px] text-white/70">{currentUser.role}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{currentUser.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canAccessPath("/users-roles") && (
                <DropdownMenuItem asChild>
                  <Link href="/users-roles">Role &amp; permissions</Link>
                </DropdownMenuItem>
              )}
              {canAccessPath("/audit-logs") && (
                <DropdownMenuItem asChild>
                  <Link href="/audit-logs">My audit trail</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <button onClick={handleLogout} className="w-full text-left text-destructive flex items-center">
                  <LogOut className="mr-2 size-4" /> Sign out
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput
          placeholder="Search permitted pages (e.g. Leads, Quotations, Attendance) or records…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList className="max-h-[380px] overflow-y-auto">
          {matchingPages.length === 0 && hits.length === 0 && (
            <CommandEmpty>No sidebar pages or records found for &ldquo;{q}&rdquo;.</CommandEmpty>
          )}

          {matchingPages.length > 0 && (
            <CommandGroup heading={`Sidebar Pages (${matchingPages.length})`}>
              {matchingPages.map((page) => {
                const IconComponent = page.icon;
                return (
                  <CommandItem
                    key={`nav-${page.href}`}
                    value={`${page.label} ${page.group} ${page.href} page navigation`}
                    onSelect={() => {
                      setSearchOpen(false);
                      setQ("");
                      router.push(page.href);
                    }}
                    asChild
                  >
                    <Link
                      href={page.href}
                      onClick={() => {
                        setSearchOpen(false);
                        setQ("");
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-md transition-colors hover:bg-accent/15"
                    >
                      {IconComponent ? <IconComponent className="size-4 text-primary shrink-0" /> : null}
                      <span className="font-semibold text-sm text-foreground">{page.label}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {page.group}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground/70 hidden sm:inline">
                          {page.href}
                        </span>
                      </div>
                    </Link>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

        </CommandList>
      </CommandDialog>
    </div>
  );
}
export {
  AppShell
};
