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
  Building2
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
import { globalSearch, notifications, fmtDateTime } from "@/lib/crm-data";
import { toast } from "sonner";
import { getUser, clearAuthData, canAccessModule, canAccessRecord, canAccessPath, getSidebarPermissions, getFirstAllowedHref } from "@/lib/authUtils";
import { SIDEBAR_MODULES } from "@/lib/sidebarModules";
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
  "Create Lead",
  "Add Customer",
  "Create Quotation",
  "Create Proforma Invoice",
  "Create Sales Order",
  "Create Delivery Note",
  "Create Sales Invoice",
  "Record Payment",
  "Create Project",
  "Create Service Request",
  "Add Follow-up"
];

const getFilteredNav = () => {
  const user = getUser();
  if (!user) return [];
  const role = (user?.role || '').toLowerCase().trim();
  const isSuperAdmin = role === 'admin' || role === 'director' || role === 'admin manager';

  // Admins always see everything.
  if (isSuperAdmin) {
    return NAV;
  }

  const sidebarPermissions = getSidebarPermissions();

  // No role configured in Users & Roles yet for this account's role -- show
  // everything rather than silently locking the user out.
  if (!sidebarPermissions) {
    return NAV;
  }

  return NAV
    .map(group => ({
      ...group,
      items: group.items.filter(it => !!sidebarPermissions[it.key]),
    }))
    .filter(group => group.items.length > 0);
};

function SidebarNav({ onNavigate }) {
  const pathname = usePathname();
  const filteredNav = getFilteredNav();
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

  useEffect(() => {
    setMounted(true);
    const u = getUser();
    setUser(u);

    if (!u) {
      if (pathname !== '/login') {
        router.replace('/login');
      }
      return;
    }

    const role = (u.role || '').toLowerCase().trim();
    const isSuperAdmin = role === 'admin' || role === 'director' || role === 'admin manager';
    if (isSuperAdmin) return;

    if (!canAccessPath(pathname)) {
      toast.error("You are not authorized to view this module.");
      const fallback = getFirstAllowedHref();
      if (fallback && fallback !== pathname) {
        router.replace(fallback);
      }
    }
  }, [pathname, router]);

  // Extract all navigable sidebar pages according to user access (HOOKS MUST PRECEDE EARLY RETURNS)
  const allNavPages = useMemo(() => {
    const nav = getFilteredNav();
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
  }, [user]);

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

  // Filter business records matching search query strictly by user permission
  const hits = useMemo(() => {
    if (!q.trim()) return [];
    const allHits = globalSearch(q);
    return allHits.filter((h) => canAccessRecord(h.kind));
  }, [q, user]);

  const QUICK_ACTION_MODULE_MAP = {
    "Create Lead": "leads",
    "Add Customer": "customers",
    "Create Quotation": "quotations",
    "Create Proforma Invoice": "proformas",
    "Create Sales Order": "orders",
    "Create Delivery Note": "deliveries",
    "Create Sales Invoice": "invoices",
    "Record Payment": "payments",
    "Create Project": "projects",
    "Create Service Request": "service",
    "Add Follow-up": "follow_ups"
  };

  const permittedQuickActions = useMemo(() => {
    return QUICK_ACTIONS.filter((action) => {
      const mod = QUICK_ACTION_MODULE_MAP[action];
      return mod ? canAccessModule(mod) : true;
    });
  }, [user]);

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

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex overflow-hidden">
        <SidebarNav />
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
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
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
              <Button className="h-10 gap-1.5 bg-accent font-bold text-accent-foreground hover:bg-accent/90">
                <Plus className="size-4" /> <span className="hidden sm:inline">Quick Action</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Create new</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {permittedQuickActions.map((a) => (
                <DropdownMenuItem
                  key={a}
                  onSelect={() => toast.info(a, { description: "Prototype form — connect backend to persist this record." })}
                >
                  {a}
                </DropdownMenuItem>
              ))}
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
            <SheetContent className="w-full sm:max-w-md">
              <SheetTitle className="px-4 pt-4">Notification centre</SheetTitle>
              <div className="space-y-2 overflow-y-auto p-4">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge value={n.type} />
                      <span className="text-[11px] text-muted-foreground">{fmtDateTime(n.at)}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.detail}</p>
                  </div>
                ))}
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

          {hits.length > 0 && (
            <CommandGroup heading={`Business Records (${hits.length})`}>
              {hits.map((h, idx) => (
                <CommandItem
                  key={`record-${h.kind}-${h.label}-${idx}`}
                  value={`${h.label} ${h.sub} ${h.kind}`}
                  onSelect={() => {
                    setSearchOpen(false);
                    setQ("");
                    router.push(h.to || h.href || "/");
                  }}
                  asChild
                >
                  <Link
                    href={h.to || h.href || "/"}
                    onClick={() => {
                      setSearchOpen(false);
                      setQ("");
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-md transition-colors hover:bg-accent/15"
                  >
                    <StatusBadge value={h.kind} />
                    <span className="font-medium text-sm text-foreground">{h.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{h.sub}</span>
                  </Link>
                </CommandItem>
              ))}
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
