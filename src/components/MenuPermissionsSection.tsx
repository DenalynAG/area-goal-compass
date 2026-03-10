import { useState, useMemo } from 'react';
import { useMenuPermissions } from '@/hooks/useMenuPermissions';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getRoleLabel } from '@/types';
import { Constants } from '@/integrations/supabase/types';
import { Switch } from '@/components/ui/switch';
import { Menu, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const rolesList = Constants.public.Enums.app_role;

// Readable labels for menu keys
const MENU_LABELS: Record<string, string> = {
  '/': 'NotiOSH',
  '/aplicaciones': 'Aplicaciones',
  '/ayb': 'Alimentos y Bebidas',
  '/ayb/colaboradores': 'AyB · Colaboradores',
  '/ayb/objetivos': 'AyB · Objetivos',
  '/ayb/leader-pass': 'AyB · Leader Pass',
  '/ayb/calidad': 'AyB · Calidad',
  '/ayb/evaluaciones': 'AyB · Evaluaciones',
  '/comercial': 'Comercial',
  '/comercial/colaboradores': 'Comercial · Colaboradores',
  '/comercial/comercial': 'Comercial · Comercial',
  '/comercial/hospitalidad': 'Comercial · Hospitalidad',
  '/comercial/hospitalidad/fidelizacion': 'Comercial · Sistema Fidelización',
  '/comercial/reservas': 'Comercial · Reservas',
  '/comercial/objetivos': 'Comercial · Objetivos',
  '/comercial/leader-pass': 'Comercial · Leader Pass',
  '/comercial/calidad': 'Comercial · Calidad',
  '/comercial/evaluaciones': 'Comercial · Evaluaciones',
  '/compras': 'Compras',
  '/compras/colaboradores': 'Compras · Colaboradores',
  '/compras/objetivos': 'Compras · Objetivos',
  '/compras/leader-pass': 'Compras · Leader Pass',
  '/compras/calidad': 'Compras · Calidad',
  '/compras/evaluaciones': 'Compras · Evaluaciones',
  '/contraloria': 'Contraloría',
  '/contraloria/devoluciones': 'Contraloría · Sistema Devoluciones',
  '/contraloria/colaboradores': 'Contraloría · Colaboradores',
  '/contraloria/objetivos': 'Contraloría · Objetivos',
  '/contraloria/leader-pass': 'Contraloría · Leader Pass',
  '/contraloria/calidad': 'Contraloría · Calidad',
  '/contraloria/evaluaciones': 'Contraloría · Evaluaciones',
  '/mercadeo': 'Mercadeo',
  '/mercadeo/crm': 'Mercadeo · Sistema CRM',
  '/mercadeo/colaboradores': 'Mercadeo · Colaboradores',
  '/mercadeo/objetivos': 'Mercadeo · Objetivos',
  '/mercadeo/leader-pass': 'Mercadeo · Leader Pass',
  '/mercadeo/calidad': 'Mercadeo · Calidad',
  '/mercadeo/evaluaciones': 'Mercadeo · Evaluaciones',
  '/operaciones': 'Operaciones',
  '/operaciones/colaboradores': 'Operaciones · Colaboradores',
  '/operaciones/glowingdesk': 'Operaciones · GlowingDesk',
  '/operaciones/housekeeping': 'Operaciones · Housekeeping',
  '/operaciones/housekeeping/comfort-map': 'Operaciones · Comfort Map',
  '/operaciones/mantenimiento': 'Operaciones · Mantenimiento',
  '/operaciones/seguridad': 'Operaciones · Seguridad',
  '/operaciones/seguridad/control-acceso': 'Operaciones · Control Acceso',
  '/operaciones/seguridad/control-activos': 'Operaciones · Control Activos',
  '/operaciones/objetivos': 'Operaciones · Objetivos',
  '/operaciones/leader-pass': 'Operaciones · Leader Pass',
  '/operaciones/calidad': 'Operaciones · Calidad',
  '/operaciones/evaluaciones': 'Operaciones · Evaluaciones',
  '/rrhh': 'Recursos Humanos',
  '/estructura': 'RRHH · Estructura',
  '/colaboradores': 'RRHH · Colaboradores',
  '/objetivos': 'RRHH · Objetivos',
  '/leader-pass': 'RRHH · Leader Pass',
  '/calidad/auditorias': 'RRHH · Calidad',
  '/evaluaciones': 'RRHH · Evaluaciones',
  '/tecnologia': 'Tecnología',
  '/tecnologia/colaboradores': 'Tecnología · Colaboradores',
  '/tecnologia/objetivos': 'Tecnología · Objetivos',
  '/tecnologia/leader-pass': 'Tecnología · Leader Pass',
  '/tecnologia/calidad': 'Tecnología · Calidad',
  '/tecnologia/evaluaciones': 'Tecnología · Evaluaciones',
  '/organigrama': 'Organigrama',
  '/administracion': 'Administración',
};

// Group menus by area
const MENU_GROUPS = [
  { label: 'General', keys: ['/', '/aplicaciones', '/organigrama', '/administracion'] },
  { label: 'Alimentos y Bebidas', keys: ['/ayb', '/ayb/colaboradores', '/ayb/objetivos', '/ayb/leader-pass', '/ayb/calidad', '/ayb/evaluaciones'] },
  { label: 'Comercial', keys: ['/comercial', '/comercial/colaboradores', '/comercial/comercial', '/comercial/hospitalidad', '/comercial/hospitalidad/fidelizacion', '/comercial/reservas', '/comercial/objetivos', '/comercial/leader-pass', '/comercial/calidad', '/comercial/evaluaciones'] },
  { label: 'Compras', keys: ['/compras', '/compras/colaboradores', '/compras/objetivos', '/compras/leader-pass', '/compras/calidad', '/compras/evaluaciones'] },
  { label: 'Contraloría', keys: ['/contraloria', '/contraloria/colaboradores', '/contraloria/objetivos', '/contraloria/leader-pass', '/contraloria/calidad', '/contraloria/evaluaciones'] },
  { label: 'Mercadeo', keys: ['/mercadeo', '/mercadeo/crm', '/mercadeo/colaboradores', '/mercadeo/objetivos', '/mercadeo/leader-pass', '/mercadeo/calidad', '/mercadeo/evaluaciones'] },
  { label: 'Operaciones', keys: ['/operaciones', '/operaciones/colaboradores', '/operaciones/glowingdesk', '/operaciones/housekeeping', '/operaciones/housekeeping/comfort-map', '/operaciones/mantenimiento', '/operaciones/seguridad', '/operaciones/seguridad/control-acceso', '/operaciones/seguridad/control-activos', '/operaciones/objetivos', '/operaciones/leader-pass', '/operaciones/calidad', '/operaciones/evaluaciones'] },
  { label: 'Recursos Humanos', keys: ['/rrhh', '/estructura', '/colaboradores', '/objetivos', '/leader-pass', '/calidad/auditorias', '/evaluaciones'] },
  { label: 'Tecnología', keys: ['/tecnologia', '/tecnologia/colaboradores', '/tecnologia/objetivos', '/tecnologia/leader-pass', '/tecnologia/calidad', '/tecnologia/evaluaciones'] },
];

// Roles to show (exclude super_admin since it always sees everything)
const editableRoles = rolesList.filter(r => r !== 'super_admin');

export default function MenuPermissionsSection() {
  const { data: permissions = [], isLoading } = useMenuPermissions();
  const qc = useQueryClient();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Build lookup: { "menuKey|role" => { id, is_visible } }
  const permMap = useMemo(() => {
    const map: Record<string, { id: string; is_visible: boolean }> = {};
    for (const p of permissions) {
      map[`${p.menu_key}|${p.role}`] = { id: p.id, is_visible: p.is_visible };
    }
    return map;
  }, [permissions]);

  const handleToggle = async (menuKey: string, role: string, currentVisible: boolean) => {
    const key = `${menuKey}|${role}`;
    const perm = permMap[key];
    if (!perm) return;

    setUpdating(key);
    const { error } = await supabase
      .from('menu_permissions' as any)
      .update({ is_visible: !currentVisible, updated_at: new Date().toISOString() } as any)
      .eq('id', perm.id);

    if (error) {
      toast.error('Error al actualizar permiso');
    } else {
      qc.invalidateQueries({ queryKey: ['menu_permissions'] });
    }
    setUpdating(null);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-sm p-8 text-center text-muted-foreground">
        Cargando permisos de menú...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="px-5 py-4 border-b flex items-center gap-3">
        <Menu className="w-5 h-5 text-accent" />
        <div>
          <h3 className="font-semibold">Gestión de Menús</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configura la visibilidad de menús y submenús por rol. Super Admin siempre ve todo.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {MENU_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.label);
          // Count visible/total for summary
          const totalPerms = group.keys.length * editableRoles.length;
          const visibleCount = group.keys.reduce((acc, key) => {
            return acc + editableRoles.filter(role => permMap[`${key}|${role}`]?.is_visible).length;
          }, 0);

          return (
            <div key={group.label} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <span className="font-semibold text-sm">{group.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {visibleCount}/{totalPerms} activos
                  </span>
                  {visibleCount === totalPerms ? (
                    <Eye className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground min-w-[200px]">Menú</th>
                        {editableRoles.map(role => (
                          <th key={role} className="text-center px-2 py-2 font-medium text-muted-foreground text-xs min-w-[90px]">
                            {getRoleLabel(role)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.keys.map(menuKey => {
                        const label = MENU_LABELS[menuKey] || menuKey;
                        const isSubMenu = menuKey.split('/').filter(Boolean).length > 1;
                        return (
                          <tr key={menuKey} className="border-b last:border-0 hover:bg-muted/20">
                            <td className={cn("px-4 py-2", isSubMenu && "pl-8")}>
                              <span className={cn("text-sm", isSubMenu ? "text-muted-foreground" : "font-medium")}>
                                {label.includes('·') ? label.split('·')[1]?.trim() : label}
                              </span>
                            </td>
                            {editableRoles.map(role => {
                              const key = `${menuKey}|${role}`;
                              const perm = permMap[key];
                              const isVisible = perm?.is_visible ?? true;
                              const isUpdating = updating === key;

                              return (
                                <td key={role} className="text-center px-2 py-2">
                                  <Switch
                                    checked={isVisible}
                                    onCheckedChange={() => handleToggle(menuKey, role, isVisible)}
                                    disabled={isUpdating}
                                    className="mx-auto"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
