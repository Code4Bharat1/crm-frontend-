"use client";
import React from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  MapPin,
  MessagesSquare,
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
  Upload,
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
import { getUser, hasPermission, clearAuthData } from "@/lib/authUtils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
const NAV = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }] },
  {
    group: "CRM",
    items: [
      { label: "Leads", href: "/leads", icon: UserPlus },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Visits", href: "/visits", icon: MapPin },
      { label: "Communications", href: "/communications", icon: MessagesSquare },
      { label: "WhatsApp Inbox", href: "/whatsapp", icon: MessageCircle },
      { label: "Email", href: "/email", icon: Mail },
      { label: "AI Processing", href: "/ai-processing", icon: Bot },
      { label: "Follow-ups", href: "/follow-ups", icon: BellRing }
    ]
  },
  {
    group: "Sales",
    items: [
      { label: "Quotations", href: "/quotations", icon: FileText },
      { label: "Proforma Invoices", href: "/proformas", icon: Receipt },
      { label: "Sales Orders", href: "/orders", icon: ClipboardList },
      { label: "Delivery Notes", href: "/deliveries", icon: Truck },
      { label: "Sales Invoices", href: "/invoices", icon: Receipt },
      { label: "Payments", href: "/payments", icon: IndianRupee }
    ]
  },
  {
    group: "Products & Inventory",
    items: [
      { label: "Product Master", href: "/products", icon: Package },
      { label: "Inventory & Stock", href: "/inventory", icon: Boxes },
      { label: "Serial Numbers", href: "/serial-numbers", icon: Barcode },
      { label: "Suppliers", href: "/suppliers", icon: Users2 },
      { label: "Purchase Orders", href: "/purchase", icon: ShoppingCart }
    ]
  },
  {
    group: "Projects & Service",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Project Profitability", href: "/profitability", icon: TrendingUp },
      { label: "Service Requests", href: "/service", icon: Wrench },
      { label: "Warranty", href: "/warranty", icon: ShieldCheck }
    ]
  },
  {
    group: "Finance",
    items: [
      { label: "Customer Ledger", href: "/ledger", icon: BookOpen },
      { label: "Bank Reconciliation", href: "/banking", icon: Landmark },
      { label: "GST", href: "/gst", icon: Percent }
    ]
  },
  {
    group: "People",
    items: [
      { label: "Employees & HR", href: "/hr", icon: Users2 },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck },
      { label: "Sales Performance", href: "/sales-performance", icon: BarChart3 }
    ]
  },
  {
    group: "Administration",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Company Settings", href: "/company-settings", icon: Building2 },
      { label: "Data Migration", href: "/migration", icon: Upload },
      { label: "Users & Roles", href: "/users-roles", icon: Lock },
      { label: "Audit Logs", href: "/audit-logs", icon: ScrollText },
      { label: "Deployment", href: "/administration", icon: Server }
    ]
  }
];
const QUICK_ACTIONS = [
  "Create Lead",
  "Add Customer",
  "Add Visit",
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
  const isFinancial = hasPermission('financial');
  const isAdmin = hasPermission('admin');
  const isApprove = hasPermission('approve'); // Often used for HR and Admin

  return NAV.map(group => {
    if (group.group === "Finance" && !isFinancial) return null;
    if (group.group === "Administration" && !isAdmin) return null;
    if (group.group === "People" && !isAdmin && !isApprove) return null;
    return group;
  }).filter(Boolean);
};

function SidebarNav({ onNavigate }) {
  const pathname = usePathname();
  const filteredNav = getFilteredNav();
  return /* @__PURE__ */ React.createElement("nav", { className: "flex-1 overflow-y-auto px-2 py-3" }, filteredNav.map((g) => /* @__PURE__ */ React.createElement("div", { key: g.group, className: "mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/50" }, g.group), /* @__PURE__ */ React.createElement("ul", { className: "space-y-0.5" }, g.items.map((it) => {
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
  return /* @__PURE__ */ React.createElement(Link, { href: "/", className: "flex items-center gap-2 border-b border-sidebar-border px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: "rounded-md bg-white px-2 py-1.5" }, /* @__PURE__ */ React.createElement("img", { src: "/assets/contech-logo.png", alt: "CONTECH Integrated Automation Solutions", width: 132, height: 26, className: "h-6 w-auto" })));
}
function AppShell({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  const currentUser = getUser();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentUser) {
      if (pathname !== '/login') {
        router.push('/login');
      }
    } else {
      const isFinancePath = pathname.startsWith('/ledger') || pathname.startsWith('/banking') || pathname.startsWith('/gst');
      const isAdminPath = pathname.startsWith('/users-roles') || pathname.startsWith('/audit-logs') || pathname.startsWith('/company-settings') || pathname.startsWith('/administration');
      
      if (isFinancePath && !hasPermission('financial')) {
        toast.error("You are not authorized to view financial modules.");
        router.push('/');
      } else if (isAdminPath && !hasPermission('admin')) {
        toast.error("You are not authorized to view administrative modules.");
        router.push('/');
      }
    }
  }, [currentUser, router, pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const handleLogout = (e) => {
    e.preventDefault();
    clearAuthData();
    router.push('/login');
  };

  if (!mounted) return null; // Wait for client hydration
  
  if (!currentUser) return null; // Avoid rendering before redirect

  const hits = globalSearch(q);
  const unread = notifications.filter((n) => !n.read).length;
  return /* @__PURE__ */ React.createElement("div", { className: "flex min-h-screen bg-background" }, /* @__PURE__ */ React.createElement("aside", { className: "sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex" }, /* @__PURE__ */ React.createElement(Brand, null), /* @__PURE__ */ React.createElement(SidebarNav, null), /* @__PURE__ */ React.createElement("div", { className: "border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/60" }, "CONTECH Platform \xB7 Prototype v0.9")), /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 flex-1 flex-col" }, /* @__PURE__ */ React.createElement("header", { className: "topbar-gradient sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 text-primary-foreground shadow-md" }, /* @__PURE__ */ React.createElement(Sheet, { open: mobileOpen, onOpenChange: setMobileOpen }, /* @__PURE__ */ React.createElement(SheetTrigger, { asChild: true }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "text-primary-foreground hover:bg-white/15 lg:hidden" }, /* @__PURE__ */ React.createElement(Menu, { className: "size-5" }))), /* @__PURE__ */ React.createElement(SheetContent, { side: "left", className: "w-72 bg-sidebar p-0 text-sidebar-foreground" }, /* @__PURE__ */ React.createElement(SheetTitle, { className: "sr-only" }, "Navigation"), /* @__PURE__ */ React.createElement("div", { className: "flex h-full flex-col" }, /* @__PURE__ */ React.createElement(Brand, null), /* @__PURE__ */ React.createElement(SidebarNav, { onNavigate: () => setMobileOpen(false) })))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSearchOpen(true),
      className: "flex h-10 flex-1 items-center gap-2 rounded-md bg-white/12 px-3 text-left text-sm text-white/80 transition-colors hover:bg-white/20"
    },
    /* @__PURE__ */ React.createElement(Search, { className: "size-4" }),
    /* @__PURE__ */ React.createElement("span", { className: "truncate" }, "Search customers, SO-1024, invoices, serials, projects\u2026")
  ), /* @__PURE__ */ React.createElement(DropdownMenu, null, /* @__PURE__ */ React.createElement(DropdownMenuTrigger, { asChild: true }, /* @__PURE__ */ React.createElement(Button, { className: "h-10 gap-1.5 bg-accent font-bold text-accent-foreground hover:bg-accent/90" }, /* @__PURE__ */ React.createElement(Plus, { className: "size-4" }), " ", /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Quick Action"))), /* @__PURE__ */ React.createElement(DropdownMenuContent, { align: "end", className: "w-56" }, /* @__PURE__ */ React.createElement(DropdownMenuLabel, null, "Create new"), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), QUICK_ACTIONS.map((a) => /* @__PURE__ */ React.createElement(
    DropdownMenuItem,
    {
      key: a,
      onSelect: () => toast.info(a, { description: "Prototype form \u2014 connect backend to persist this record." })
    },
    a
  )))), /* @__PURE__ */ React.createElement(Sheet, null, /* @__PURE__ */ React.createElement(SheetTrigger, { asChild: true }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "relative text-primary-foreground hover:bg-white/15" }, /* @__PURE__ */ React.createElement(Bell, { className: "size-5" }), unread > 0 ? /* @__PURE__ */ React.createElement("span", { className: "absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground" }, unread) : null)), /* @__PURE__ */ React.createElement(SheetContent, { className: "w-full sm:max-w-md" }, /* @__PURE__ */ React.createElement(SheetTitle, { className: "px-4 pt-4" }, "Notification centre"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 overflow-y-auto p-4" }, notifications.map((n) => /* @__PURE__ */ React.createElement("div", { key: n.id, className: "rounded-md border border-border bg-card p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement(StatusBadge, { value: n.type }), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-muted-foreground" }, fmtDateTime(n.at))), /* @__PURE__ */ React.createElement("p", { className: "mt-1.5 text-sm font-semibold" }, n.title), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, n.detail)))))), /* @__PURE__ */ React.createElement(DropdownMenu, null, /* @__PURE__ */ React.createElement(DropdownMenuTrigger, { asChild: true }, /* @__PURE__ */ React.createElement("button", { className: "flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/15" }, /* @__PURE__ */ React.createElement("span", { className: "flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground" }, currentUser.name.split(" ").map((n) => n[0]).join("")), /* @__PURE__ */ React.createElement("span", { className: "hidden text-left leading-tight sm:block" }, /* @__PURE__ */ React.createElement("span", { className: "block text-xs font-semibold" }, currentUser.name), /* @__PURE__ */ React.createElement("span", { className: "block text-[11px] text-white/70" }, currentUser.role)))), /* @__PURE__ */ React.createElement(DropdownMenuContent, { align: "end", className: "w-52" }, /* @__PURE__ */ React.createElement(DropdownMenuLabel, null, currentUser.email), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, { asChild: true }, /* @__PURE__ */ React.createElement(Link, { href: "/users-roles" }, "Role & permissions")), /* @__PURE__ */ React.createElement(DropdownMenuItem, { asChild: true }, /* @__PURE__ */ React.createElement(Link, { href: "/audit-logs" }, "My audit trail")), /* @__PURE__ */ React.createElement(DropdownMenuSeparator, null), /* @__PURE__ */ React.createElement(DropdownMenuItem, { asChild: true }, /* @__PURE__ */ React.createElement("button", { onClick: handleLogout, className: "w-full text-left text-destructive flex items-center" }, /* @__PURE__ */ React.createElement(LogOut, { className: "mr-2 size-4" }), " Sign out"))))), /* @__PURE__ */ React.createElement("main", { className: "min-w-0 flex-1 p-4 sm:p-6" }, children)), /* @__PURE__ */ React.createElement(CommandDialog, { open: searchOpen, onOpenChange: setSearchOpen }, /* @__PURE__ */ React.createElement(CommandInput, { placeholder: "Try SO-1024, INV-1004, Shakti, CT-ISO, PRJ-303\u2026", value: q, onValueChange: setQ }), /* @__PURE__ */ React.createElement(CommandList, null, /* @__PURE__ */ React.createElement(CommandEmpty, null, "Type a customer, document number, product code or serial number."), hits.length > 0 ? /* @__PURE__ */ React.createElement(CommandGroup, { heading: `${hits.length} matches across all modules` }, hits.map((h) => /* @__PURE__ */ React.createElement(CommandItem, { key: `${h.kind}-${h.label}`, value: `${h.label} ${h.sub} ${h.kind}`, asChild: true }, /* @__PURE__ */ React.createElement(Link, { href: h.href, onClick: () => setSearchOpen(false), className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(StatusBadge, { value: h.kind }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, h.label), /* @__PURE__ */ React.createElement("span", { className: "ml-auto text-xs text-muted-foreground" }, h.sub))))) : null)));
}
export {
  AppShell
};
