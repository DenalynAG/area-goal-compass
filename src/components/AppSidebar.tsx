import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Newspaper,
  Building2,
  Users,
  ClipboardCheck,
  ClipboardList,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
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
import { useState, useEffect, useMemo } from "react";
import { getRoleLabel } from "@/types";
import { Button } from "@/components/ui/button";
import { useVisibleMenuKeys } from "@/hooks/useMenuPermissions";

interface NavChild {
  to: string;
  label: string;
  icon?: LucideIcon;
  children?: { to: string; label: string; icon?: LucideIcon }[];
}

interface NavItem {
  to: string;
  icon: typeof Newspaper;
  label: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { to: "/", icon: Newspaper, label: "NotiOSH" },
  { to: "/aplicaciones", icon: Monitor, label: "Aplicaciones" },
  {
    to: "/ayb",
    icon: UtensilsCrossed,
    label: "Alimentos y Bebidas",
    children: [
      { to: "/ayb/objetivos", label: "Objetivos", icon: Target },
      { to: "/ayb/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/ayb/calidad", label: "Calidad", icon: ShieldCheck },
      { to: "/ayb/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
    ],
  },
  {
    to: "/comercial",
    icon: Briefcase,
    label: "Comercial",
    children: [
      { to: "/comercial/colaboradores", label: "Colaboradores", icon: Users },
      { to: "/comercial/comercial", label: "Comercial", icon: Handshake },
      { to: "/comercial/hospitalidad", label: "Hospitalidad", icon: Hotel },
      { to: "/comercial/reservas", label: "Reservas", icon: CalendarCheck },
      { to: "/comercial/objetivos", label: "Objetivos", icon: Target },
      { to: "/comercial/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/comercial/calidad", label: "Calidad", icon: ShieldCheck },
      { to: "/comercial/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
    ],
  },
  {
    to: "/compras",
    icon: ShoppingCart,
    label: "Compras",
    children: [
      { to: "/compras/colaboradores", label: "Colaboradores", icon: Users },
      { to: "/compras/objetivos", label: "Objetivos", icon: Target },
      { to: "/compras/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/compras/calidad", label: "Calidad", icon: ShieldCheck },
      { to: "/compras/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
    ],
  },
  {
    to: "/contraloria",
    icon: Calculator,
    label: "Contraloría",
    children: [
      { to: "/contraloria/colaboradores", label: "Colaboradores", icon: Users },
      { to: "/contraloria/objetivos", label: "Objetivos", icon: Target },
      { to: "/contraloria/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/contraloria/calidad", label: "Calidad", icon: ShieldCheck },
      { to: "/contraloria/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
    ],
  },
  {
    to: "/mercadeo",
    icon: Megaphone,
    label: "Mercadeo",
    children: [
      { to: "/mercadeo/colaboradores", label: "Colaboradores", icon: Users },
      { to: "/mercadeo/objetivos", label: "Objetivos", icon: Target },
      { to: "/mercadeo/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/mercadeo/calidad", label: "Calidad", icon: ShieldCheck },
      { to: "/mercadeo/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
    ],
  },
  {
    to: "/operaciones",
    icon: Wrench,
    label: "Operaciones",
    children: [
      { to: "/operaciones/colaboradores", label: "Colaboradores", icon: Users },
      { to: "/operaciones/glowingdesk", label: "GlowingDesk", icon: Lamp },
      {
        to: "/operaciones/housekeeping",
        label: "Comfort & Housekeeping",
        icon: Sparkles,
        children: [
          { to: "/operaciones/housekeeping/comfort-map", label: "OSH Comfort Map", icon: Map },
        ],
      },
      { to: "/operaciones/mantenimiento", label: "Mantenimiento", icon: Hammer },
      {
        to: "/operaciones/seguridad",
        label: "Seguridad",
        icon: Shield,
        children: [
          { to: "/operaciones/seguridad/control-acceso", label: "Control de Acceso", icon: DoorOpen },
          { to: "/operaciones/seguridad/control-activos", label: "Control de Activos", icon: Package },
        ],
      },
      { to: "/operaciones/objetivos", label: "Objetivos", icon: Target },
      { to: "/operaciones/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/operaciones/calidad", label: "Calidad", icon: ShieldCheck },
      { to: "/operaciones/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
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
    children: [
      { to: "/tecnologia/colaboradores", label: "Colaboradores", icon: Users },
      { to: "/tecnologia/objetivos", label: "Objetivos", icon: Target },
      { to: "/tecnologia/leader-pass", label: "Leader Pass", icon: ClipboardList },
      { to: "/tecnologia/calidad", label: "Calidad", icon: ShieldCheck },
      { to: "/tecnologia/evaluaciones", label: "Evaluaciones", icon: ClipboardCheck },
    ],
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
  const visibleMenuKeys = useVisibleMenuKeys();

  // Filter nav items based on permissions
  const filteredNavItems = useMemo(() => {
    return navItems
      .filter(item => visibleMenuKeys.has(item.to))
      .map(item => {
        if (!item.children) return item;
        const filteredChildren = item.children
          .filter(child => visibleMenuKeys.has(child.to))
          .map(child => {
            if (!child.children) return child;
            return {
              ...child,
              children: child.children.filter(sub => visibleMenuKeys.has(sub.to)),
            };
          })
          .filter(child => !child.children || child.children.length > 0);
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      })
      .filter(Boolean) as NavItem[];
  }, [visibleMenuKeys]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <img
          src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
          alt="EasyConnect logo"
          className="w-9 h-9 rounded-lg object-contain shrink-0"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-display font-extrabold truncate text-sidebar-foreground">
              Bienvenido a
            </h1>
            <p className="text-xs font-bold text-sidebar-primary tracking-wide">EasyConnect</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto flex lg:hidden items-center justify-center w-7 h-7 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));

          if (item.children && item.children.length > 0) {
            const isGroupExpanded = expandedGroups.has(item.to);
            return (
              <div key={item.to}>
                <button
                  onClick={() => toggleGroup(item.to)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all w-full group",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-sidebar-primary")} />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 opacity-50", isGroupExpanded && "rotate-180")} />
                    </>
                  )}
                </button>
                {isGroupExpanded && !collapsed && (
                  <div className="ml-5 pl-3 border-l border-sidebar-border/50 space-y-0.5 mt-0.5">
                    {item.children.map((child) => {
                      const childActive = location.pathname === child.to;
                      const hasSubChildren = child.children && child.children.length > 0;
                      const isSubExpanded = expandedGroups.has(child.to);

                      if (hasSubChildren) {
                        return (
                          <div key={child.to}>
                            <button
                              onClick={() => toggleGroup(child.to)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all w-full",
                                childActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                              )}
                            >
                              {child.icon && <child.icon className={cn("w-4 h-4 shrink-0", childActive && "text-sidebar-primary")} />}
                              <span className="truncate flex-1 text-left">{child.label}</span>
                              <ChevronDown className={cn("w-3 h-3 transition-transform duration-200 opacity-50", isSubExpanded && "rotate-180")} />
                            </button>
                            {isSubExpanded && (
                              <div className="ml-4 pl-3 border-l border-sidebar-border/50 space-y-0.5 mt-0.5">
                                {child.children!.map((sub) => {
                                  const subActive = location.pathname === sub.to;
                                  return (
                                    <NavLink
                                      key={sub.to}
                                      to={sub.to}
                                      className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all",
                                        subActive
                                          ? "bg-sidebar-primary/20 text-sidebar-primary font-medium"
                                          : "text-sidebar-foreground/55 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                                      )}
                                    >
                                      {sub.icon && <sub.icon className="w-3.5 h-3.5 shrink-0" />}
                                      <span className="truncate">{sub.label}</span>
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
                          key={child.to}
                          to={child.to}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all",
                            childActive
                              ? "bg-sidebar-primary/20 text-sidebar-primary font-medium"
                              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                          )}
                        >
                          {child.icon && <child.icon className={cn("w-4 h-4 shrink-0", childActive && "text-sidebar-primary")} />}
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
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-sidebar-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sm font-semibold text-sidebar-primary shrink-0">
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
            className="shrink-0 p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
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
        className="fixed top-3 left-3 z-50 lg:hidden bg-card shadow-md border"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-40 transition-all duration-300 shadow-xl",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Spacer */}
      <div className={cn("hidden lg:block shrink-0 transition-all duration-300", collapsed ? "w-[68px]" : "w-64")} />
    </>
  );
}
