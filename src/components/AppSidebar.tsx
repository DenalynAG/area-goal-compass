import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Newspaper,
  Building2,
  Users,
  FileText,
  ClipboardCheck,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ShieldCheck,
  ChevronDown,
  UtensilsCrossed,
  Briefcase,
  ShoppingCart,
  Calculator,
  Megaphone,
  Wrench,
  Monitor,
  Target,
  Handshake,
  Hotel,
  CalendarCheck,
  Lamp,
  Sparkles,
  Hammer,
  Shield,
  DoorOpen,
  Package,
  Map,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { getRoleLabel } from "@/types";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  icon: typeof Newspaper;
  label: string;
  children?: { to: string; label: string; icon?: LucideIcon }[];
}

const navItems: NavItem[] = [
  { to: "/", icon: Newspaper, label: "NotiOSH" },
  { to: "/aplicaciones", icon: Monitor, label: "Aplicaciones" },
  {
    to: "/ayb",
    icon: UtensilsCrossed,
    label: "Alimentos y Bebidas",
    children: [],
  },
  {
    to: "/comercial",
    icon: Briefcase,
    label: "Comercial",
    children: [
      { to: "/comercial/comercial", label: "Comercial", icon: Handshake },
      { to: "/comercial/hospitalidad", label: "Hospitalidad", icon: Hotel },
      { to: "/comercial/reservas", label: "Reservas", icon: CalendarCheck },
    ],
  },
  {
    to: "/compras",
    icon: ShoppingCart,
    label: "Compras",
    children: [],
  },
  {
    to: "/contraloria",
    icon: Calculator,
    label: "Contraloría",
    children: [],
  },
  {
    to: "/mercadeo",
    icon: Megaphone,
    label: "Mercadeo",
    children: [],
  },
  {
    to: "/operaciones",
    icon: Wrench,
    label: "Operaciones",
    children: [
      { to: "/operaciones/glowingdesk", label: "GlowingDesk", icon: Lamp },
      { to: "/operaciones/housekeeping", label: "Comfort & Housekeeping", icon: Sparkles },
      { to: "/operaciones/mantenimiento", label: "Mantenimiento", icon: Hammer },
      { to: "/operaciones/seguridad", label: "Seguridad", icon: Shield },
      { to: "/operaciones/seguridad/control-acceso", label: "Control de Acceso", icon: DoorOpen },
      { to: "/operaciones/seguridad/control-activos", label: "Control de Activos", icon: Package },
    ],
  },
  {
    to: "/rrhh",
    icon: Users,
    label: "Recursos Humanos",
    children: [
      { to: "/estructura", label: "Estructura", icon: Building2 },
      { to: "/colaboradores", label: "Colaboradores", icon: Users },
      { to: "/objetivos", label: "Objetivos", icon: Target },
      { to: "/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/calidad/auditorias", label: "Calidad", icon: ShieldCheck },
      { to: "/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
    ],
  },
  {
    to: "/tecnologia",
    icon: Monitor,
    label: "Tecnología",
    children: [],
  },
  { to: "/organigrama", icon: Building2, label: "Organigrama" },
  { to: "/administracion", icon: Settings, label: "Administración" },
];

export default function AppSidebar() {
  const { user, profile, roles, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["/rrhh"]));
  const location = useLocation();

  const toggleGroup = (to: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(to)) next.delete(to); else next.add(to);
      return next;
    });
  };

  if (!user) return null;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <img
          src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
          alt="OSHOME logo"
          className="w-9 h-9 rounded-lg object-contain shrink-0"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-display font-extrabold truncate">Bienvenidos..!</h1>
            <p className="text-[10px] text-sidebar-foreground/50">OSH Hotels</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto text-primary">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));

          if (item.children && item.children.length > 0) {
            const isGroupExpanded = expandedGroups.has(item.to);
            return (
              <div key={item.to}>
                <button
                  onClick={() => toggleGroup(item.to)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isGroupExpanded && "rotate-180")} />
                    </>
                  )}
                </button>
                {isGroupExpanded && !collapsed && (
                  <div className="ml-5 pl-3 border-l border-sidebar-border space-y-0.5 mt-0.5">
                    {item.children.map((child) => {
                      const childActive = location.pathname === child.to;
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                            childActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                          )}
                        >
                          {child.icon && <child.icon className="w-4 h-4 shrink-0" />}
                          <span className="truncate">{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-accent-foreground shrink-0">
            {(profile?.name ?? user?.email ?? "?")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.name ?? user?.email}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">
                {roles[0] ? getRoleLabel(roles[0] as any) : "Sin rol"}
              </p>
            </div>
          )}
          <button
            onClick={logout}
            className="shrink-0 p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Spacer */}
      <div className={cn("hidden lg:block shrink-0 transition-all duration-300", collapsed ? "w-[68px]" : "w-64")} />
    </>
  );
}
