import { useState } from 'react';
import { mockCollaborators, getAreaName, getSubareaName } from '@/data/mockData';
import { getRoleLabel } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Mail, Phone } from 'lucide-react';

export default function ColaboradoresPage() {
  const [search, setSearch] = useState('');
  const filtered = mockCollaborators.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header flex-wrap gap-3">
        <div>
          <h1 className="page-title">Colaboradores</h1>
          <p className="page-subtitle">{mockCollaborators.length} colaboradores registrados</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Nuevo Colaborador</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, correo o cargo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Colaborador</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Cargo</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Área</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Subárea</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Rol</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.position}</td>
                  <td className="px-5 py-3">{getAreaName(c.area_id)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.subarea_id ? getSubareaName(c.subarea_id) : '—'}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {getRoleLabel(c.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-accent" title={c.email}><Mail className="w-4 h-4" /></a>
                      <a href={`tel:${c.phone}`} className="text-muted-foreground hover:text-accent" title={c.phone}><Phone className="w-4 h-4" /></a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
