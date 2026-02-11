import { useState } from 'react';
import { mockAreas, mockSubareas, getUserName } from '@/data/mockData';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronDown, ChevronRight, Plus, Edit, Building2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Organigrama from '@/components/Organigrama';

export default function EstructuraPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(mockAreas.map(a => [a.id, true]))
  );

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Estructura Organizacional</h1>
          <p className="page-subtitle">Áreas y subáreas de la empresa</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" />Nueva Área</Button>
      </div>

      <Organigrama />

      <div className="space-y-3">
        {mockAreas.map(area => {
          const subareas = mockSubareas.filter(s => s.area_id === area.id);
          const isOpen = expanded[area.id];
          return (
            <div key={area.id} className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <button
                onClick={() => toggle(area.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              >
                {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                <Building2 className="w-5 h-5 text-accent" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{area.name}</h3>
                    <StatusBadge status={area.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{area.description} — Líder: {getUserName(area.leader_user_id)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{subareas.length} subáreas</span>
              </button>

              {isOpen && subareas.length > 0 && (
                <div className="border-t bg-muted/20">
                  {subareas.map(sub => (
                    <div key={sub.id} className="flex items-center gap-4 px-5 py-3 pl-14 border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{sub.name}</span>
                          <StatusBadge status={sub.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">{sub.description} — Líder: {getUserName(sub.leader_user_id)}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0"><Edit className="w-4 h-4" /></Button>
                    </div>
                  ))}
                  <div className="px-5 py-2 pl-14">
                    <Button variant="ghost" size="sm" className="text-accent"><Plus className="w-4 h-4 mr-1" />Agregar subárea</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
