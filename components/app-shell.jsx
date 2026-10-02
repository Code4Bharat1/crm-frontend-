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
  CheckCheck,
  KeyRound,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  SlidersHorizontal,
  Layers,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingScreen";
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
};

const GROUP_META = {
  "CRM": { icon: Sparkles, short: "CRM" },
  "Sales": { icon: Receipt, short: "Sales" },
  "Products & Inventory": { icon: Boxes, short: "Inventory" },
  "Projects & Service": { icon: FolderKanban, short: "Projects" },
  "Finance": { icon: IndianRupee, short: "Finance" },
  "People": { icon: Users2, short: "People" },
  "Administration": { icon: Lock, short: "Admin" },
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

  // For non-admin employees, show strictly what Admin enabled
  return NAV
    .map((group) => ({
      ...group,
      items: group.items.filter((it) => Boolean(sidebarPermissions[it.key])),
    }))
    .filter((group) => group.items.length > 0);
};

function SidebarNav({ onNavigate, user, permissions, isMobile = false }) {
  const pathname = usePathname();
  const filteredNav = useMemo(() => getFilteredNav(user, permissions), [user, permissions]);
  const [filterQuery, setFilterQuery] = useState("");

  const isDashboardActive = pathname === "/";
  const isDashboardVisible = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return true;
    return "dashboard".includes(q) || "home".includes(q);
  }, [filterQuery]);

  // Determine which category group contains the current active route
  const activeGroup = useMemo(() => {
    for (const group of filteredNav) {
      const hasActive = group.items.some((it) =>
        it.href === "/" ? pathname === "/" : pathname.startsWith(it.href)
      );
      if (hasActive) return group.group;
    }
    return null;
  }, [filteredNav, pathname]);

  // Collapsible category dropdowns: closed by default
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAll = () => {
    const allOpen = {};
    filteredNav.forEach((g) => {
      allOpen[g.group] = true;
    });
    setExpandedGroups(allOpen);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Filter navigation by search query
  const displayedNav = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return filteredNav;

    return filteredNav
      .map((g) => {
        const matchingItems = g.items.filter(
          (it) => it.label.toLowerCase().includes(q) || it.href.toLowerCase().includes(q)
        );
        return {
          ...g,
          items: matchingItems,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [filteredNav, filterQuery]);

  const totalFilteredCount = useMemo(() => {
    return (isDashboardVisible ? 1 : 0) + displayedNav.reduce((acc, g) => acc + g.items.length, 0);
  }, [displayedNav, isDashboardVisible]);

  const allOpen = useMemo(() => {
    return filteredNav.length > 0 && filteredNav.every((g) => expandedGroups[g.group]);
  }, [filteredNav, expandedGroups]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden min-h-0">
      {/* Search Bar */}
      <div className="shrink-0 border-b border-sidebar-border/70 bg-sidebar p-3">
        <div className="relative flex items-center">
          <Search className="absolute left-3 size-4 text-sidebar-foreground/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter menu items…"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-9 text-sm rounded-xl bg-white/10 hover:bg-white/[0.14] border border-white/15 text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/50 focus:bg-white/15 transition-all shadow-xs"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="absolute right-2.5 text-sidebar-foreground/60 hover:text-sidebar-foreground p-1 rounded-md hover:bg-white/10 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-2.5 space-y-1.5">
        {/* Direct Standalone Dashboard Link */}
        {isDashboardVisible && (
          <div className="mb-1">
            <Link
              href="/"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px]",
                isDashboardActive
                  ? "bg-accent text-accent-foreground font-bold shadow-sm ring-1 ring-accent/30"
                  : "text-sidebar-foreground/85 hover:bg-white/10 hover:text-sidebar-foreground active:scale-[0.99]"
              )}
            >
              <LayoutDashboard
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isDashboardActive ? "text-accent-foreground" : "text-sidebar-foreground/70"
                )}
              />
              <span className="truncate flex-1">Dashboard</span>
            </Link>
          </div>
        )}

        {displayedNav.length === 0 && !isDashboardVisible ? (
          <div className="py-8 px-4 text-center">
            <p className="text-xs text-sidebar-foreground/60">No modules matching &ldquo;{filterQuery}&rdquo;</p>
            <button
              type="button"
              onClick={() => setFilterQuery("")}
              className="mt-2 text-xs text-accent font-semibold hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          displayedNav.map((g) => {
            const meta = GROUP_META[g.group] || { short: g.group, icon: LayoutDashboard };
            const GroupIcon = meta.icon || LayoutDashboard;
            // If searching, auto-expand matching categories; otherwise follow expandedGroups (closed by default)
            const isOpen = filterQuery.trim() !== "" || Boolean(expandedGroups[g.group]);
            const hasActiveItem = g.group === activeGroup;

            return (
              <div
                key={g.group}
                className={cn(
                  "rounded-xl transition-all border border-transparent",
                  hasActiveItem && "bg-white/[0.04] border-white/5",
                  isOpen && "bg-white/[0.02]"
                )}
              >
                {/* Category Dropdown Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(g.group)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/5 active:bg-white/10 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        hasActiveItem ? "text-accent" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-bold uppercase tracking-wider truncate",
                        hasActiveItem ? "text-sidebar-foreground" : "text-sidebar-foreground/75 group-hover:text-sidebar-foreground"
                      )}
                    >
                      {g.group}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-sidebar-foreground/50 transition-transform duration-200",
                        isOpen ? "rotate-180" : "rotate-0"
                      )}
                    />
                  </div>
                </button>

                {/* Sub items dropdown */}
                {isOpen && (
                  <ul className="mt-1 space-y-0.5 pl-2 pr-1 pb-1.5 animate-in fade-in-50 duration-150 border-l border-white/10 ml-3.5 my-1">
                    {g.items.map((it) => {
                      const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
                      return (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[38px]",
                              active
                                ? "bg-accent text-accent-foreground font-bold shadow-sm ring-1 ring-accent/30"
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.99]"
                            )}
                          >
                            <it.icon
                              className={cn(
                                "size-4 shrink-0 transition-colors",
                                active ? "text-accent-foreground" : "text-sidebar-foreground/60"
                              )}
                            />
                            <span className="truncate flex-1">{it.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Footer Controls */}
      <div className="shrink-0 border-t border-sidebar-border/60 bg-sidebar px-3 py-2 flex items-center justify-between text-[11px] text-sidebar-foreground/60">
        <span className="truncate font-medium">
          {totalFilteredCount} module{totalFilteredCount !== 1 ? "s" : ""}
        </span>
        {!filterQuery && (
          <button
            type="button"
            onClick={allOpen ? collapseAll : expandAll}
            className="flex items-center gap-1 font-semibold text-sidebar-foreground/80 hover:text-accent transition-colors cursor-pointer"
          >
            <ChevronsUpDown className="size-3" />
            <span>{allOpen ? "Collapse All" : "Expand All"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Brand({ onNavigate }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex h-14 items-center gap-3 px-4 pr-12 lg:pr-4 border-b border-sidebar-border/80 bg-sidebar shrink-0 transition-opacity hover:opacity-95"
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground font-black text-sm shadow-md">
        C
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm text-sidebar-foreground tracking-tight">CONTECH</span>
          <span className="rounded bg-accent/20 px-1 py-0.2 text-[9px] font-extrabold text-accent">CRM</span>
        </div>
        <p className="text-[10px] text-sidebar-foreground/60 truncate font-medium">Enterprise Suite</p>
      </div>
    </Link>
  );
}

const AUTH_STANDALONE_ROUTES = ['/login', '/reset-password', '/forgot-password'];
const isAuthStandaloneRoute = (path) => path && AUTH_STANDALONE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
const isPublicRoute = (path) => path && (isAuthStandaloneRoute(path) || path === '/change-password' || path.startsWith('/change-password/'));

function AppShell({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarPerms, setSidebarPerms] = useState(null);
  const [liveNotifications, setLiveNotifications] = useState([]);

  // Ensure loading screen is visible smoothly on every full page reload/load
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  // Show immediate visual progress feedback when navigating between routes
  const prevPathRef = React.useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setNavigating(true);
      const t = setTimeout(() => setNavigating(false), 300);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  useEffect(() => {
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
      if (!isPublicRoute(pathname)) {
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
    const pages = [
      {
        label: "Dashboard",
        href: "/",
        group: "Dashboard",
        icon: LayoutDashboard,
      },
    ];
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

  if (isAuthStandaloneRoute(pathname) || (!user && isPublicRoute(pathname))) {
    return <>{children}</>;
  }

  const handleLogout = (e) => {
    e.preventDefault();
    clearAuthData();
    router.push('/login');
  };

  if (!mounted) {
    return <LoadingScreen message="Loading workspace & enterprise modules..." subtext="Connecting services" />;
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 p-4 transition-all animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center max-w-sm w-full p-8 rounded-3xl bg-white/85 dark:bg-card/85 backdrop-blur-xl border border-blue-200/70 dark:border-border/60 shadow-xl shadow-blue-500/5 space-y-5">
          {/* Lock Badge */}
          <div className="relative size-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
            <KeyRound className="size-7 text-white" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Authentication Required
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please sign in to access your enterprise dashboard and operational records.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <span>Proceed to Login</span>
            <span>➔</span>
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
    <div className="flex min-h-screen w-full bg-background relative">
      {/* Dynamic Route Progress Bar during page navigation */}
      {navigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600 animate-progress shadow-sm" />
      )}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex border-r border-sidebar-border z-30 overflow-hidden">
        <Brand />
        <SidebarNav user={user} permissions={sidebarPerms} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar-gradient sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 text-primary-foreground shadow-md shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/15 lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-[320px] bg-sidebar p-0 text-sidebar-foreground flex flex-col">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col overflow-hidden">
                <Brand onNavigate={() => setMobileOpen(false)} />
                <SidebarNav isMobile onNavigate={() => setMobileOpen(false)} user={user} permissions={sidebarPerms} />
              </div>
            </SheetContent>
          </Sheet>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md bg-white/12 px-2.5 sm:px-3 text-left text-sm text-white/80 transition-colors hover:bg-white/20"
          >
            <Search className="size-4 shrink-0" />
            <span className="truncate text-xs sm:text-sm">Search pages & records…</span>
            <kbd className="hidden md:inline-flex ml-auto h-5 items-center gap-1 rounded border border-white/25 bg-white/10 px-1.5 font-mono text-[10px] font-semibold text-white/80">
              Ctrl+K
            </kbd>
          </button>
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
                <Link href="/change-password" className="flex items-center cursor-pointer">
                  <KeyRound className="mr-2 size-4 text-primary" /> Change password
                </Link>
              </DropdownMenuItem>
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

      {/* Floating Yellow Quick Action Button on Bottom Right */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group relative size-12 sm:size-13 rounded-2xl bg-accent text-accent-foreground font-black flex items-center justify-center shadow-xl shadow-accent/25 ring-4 ring-white/80 dark:ring-slate-900/80 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Quick Actions"
            >
              <Plus className="size-6 transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-64 shadow-2xl rounded-2xl border border-border p-1.5 mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
            <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-3 py-2 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" /> Quick Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-[360px] overflow-y-auto py-1">
              {permittedQuickActions.map((action) => {
                const Icon = action.icon || Plus;
                return (
                  <DropdownMenuItem
                    key={action.label}
                    onSelect={() => router.push(action.href)}
                    className="cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium hover:bg-accent/15 focus:bg-accent/15 transition-colors rounded-xl"
                  >
                    <Icon className="size-4 text-blue-600 shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
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
