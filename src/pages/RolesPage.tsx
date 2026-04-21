import { Shield, Check, X } from 'lucide-react';
import { getRoleLabel } from '@/types';
import type { Enums } from '@/integrations/supabase/types';
import { Constants } from '@/integrations/supabase/types';

const modules = ['Dashboard', 'Estructura', 'Colaboradores', 'Objetivos', 'Indicadores', 'Reportes', 'Evaluaciones', 'Administración'];
const actions = ['Ver', 'Crear', 'Editar', 'Eliminar'];

const rolesList = Constants.public.Enums.app_role;

const permMatrix: Record<string, Record<string, string[]>> = {
  super_admin: Object.fromEntries(modules.map(m => [m, actions])),
  admin_area: {
    Dashboard: ['Ver'], Estructura: ['Ver', 'Crear', 'Editar'], Colaboradores: ['Ver', 'Crear', 'Editar'],
    Objetivos: actions, Indicadores: actions, Reportes: ['Ver'], Evaluaciones: actions, Administración: [],
  },
  lider_subarea: {
    Dashboard: ['Ver'], Estructura: ['Ver'], Colaboradores: ['Ver'],
    Objetivos: ['Ver', 'Crear', 'Editar'], Indicadores: ['Ver', 'Crear', 'Editar'], Reportes: ['Ver'], Evaluaciones: ['Ver', 'Crear', 'Editar'], Administración: [],
  },
  gestor_area: {
    Dashboard: ['Ver'], Estructura: ['Ver'], Colaboradores: ['Ver'],
    Objetivos: ['Ver', 'Editar'], Indicadores: ['Ver', 'Editar'], Reportes: ['Ver'], Evaluaciones: ['Ver'], Administración: [],
  },
  colaborador: {
    Dashboard: ['Ver'], Estructura: ['Ver'], Colaboradores: ['Ver'],
    Objetivos: ['Ver'], Indicadores: ['Ver', 'Editar'], Reportes: ['Ver'], Evaluaciones: ['Ver'], Administración: [],
  },
  solo_lectura: Object.fromEntries(modules.map(m => [m, ['Ver']])),
};

const roleDescriptions: Record<string, string> = {
  super_admin: 'Acceso total a todas las áreas y módulos',
  admin_area: 'Gestión completa de su área asignada',
  lider_subarea: 'Gestión de su subárea y visibilidad del área',
  gestor_area: 'Gestión operativa del área con permisos limitados (debajo de Líder de Subárea)',
  colaborador: 'Acceso a objetivos y KPIs asignados',
  solo_lectura: 'Visualización sin edición',
};

export default function RolesPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Roles y Accesos</h1>
        <p className="page-subtitle">Matriz de permisos por módulo</p>
      </div>

      <div className="space-y-6">
        {rolesList.map(roleCode => {
          const perms = permMatrix[roleCode] || {};
          return (
            <div key={roleCode} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center gap-3">
                <Shield className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-semibold">{getRoleLabel(roleCode)}</h3>
                  <p className="text-xs text-muted-foreground">{roleDescriptions[roleCode] ?? ''}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-5 py-2 font-medium text-muted-foreground">Módulo</th>
                      {actions.map(a => (
                        <th key={a} className="text-center px-3 py-2 font-medium text-muted-foreground">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(mod => (
                      <tr key={mod} className="border-b last:border-0">
                        <td className="px-5 py-2 font-medium">{mod}</td>
                        {actions.map(a => (
                          <td key={a} className="text-center px-3 py-2">
                            {perms[mod]?.includes(a)
                              ? <Check className="w-4 h-4 text-success inline-block" />
                              : <X className="w-4 h-4 text-muted-foreground/30 inline-block" />
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
