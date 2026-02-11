import { mockRoles } from '@/data/mockData';
import { Shield, Check, X } from 'lucide-react';

const modules = ['Dashboard', 'Estructura', 'Colaboradores', 'Objetivos', 'Indicadores', 'Reportes', 'Administración'];
const actions = ['Ver', 'Crear', 'Editar', 'Eliminar'];

const permMatrix: Record<string, Record<string, string[]>> = {
  super_admin: Object.fromEntries(modules.map(m => [m, actions])),
  admin_area: {
    Dashboard: ['Ver'], Estructura: ['Ver', 'Crear', 'Editar'], Colaboradores: ['Ver', 'Crear', 'Editar'],
    Objetivos: actions, Indicadores: actions, Reportes: ['Ver'], Administración: [],
  },
  lider_subarea: {
    Dashboard: ['Ver'], Estructura: ['Ver'], Colaboradores: ['Ver'],
    Objetivos: ['Ver', 'Crear', 'Editar'], Indicadores: ['Ver', 'Crear', 'Editar'], Reportes: ['Ver'], Administración: [],
  },
  colaborador: {
    Dashboard: ['Ver'], Estructura: ['Ver'], Colaboradores: ['Ver'],
    Objetivos: ['Ver'], Indicadores: ['Ver', 'Editar'], Reportes: ['Ver'], Administración: [],
  },
  solo_lectura: Object.fromEntries(modules.map(m => [m, ['Ver']])),
};

export default function RolesPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Roles y Accesos</h1>
        <p className="page-subtitle">Matriz de permisos por módulo</p>
      </div>

      <div className="space-y-6">
        {mockRoles.map(role => {
          const perms = permMatrix[role.code] || {};
          return (
            <div key={role.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center gap-3">
                <Shield className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-semibold">{role.name}</h3>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
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
