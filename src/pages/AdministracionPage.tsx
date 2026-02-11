import { useState } from 'react';
import { useActivityLog, usePositions } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Clock, User, Briefcase, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CargoFormDialog from '@/components/CargoFormDialog';

export default function AdministracionPage() {
  const { data: activityLog = [], isLoading } = useActivityLog();
  const { data: positions = [], isLoading: loadingPositions } = usePositions();
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('super_admin') || hasRole('admin_area');

  const [cargoOpen, setCargoOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<any>(null);

  const handleDeleteCargo = async (id: string) => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cargo eliminado');
    qc.invalidateQueries({ queryKey: ['positions'] });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">Administración</h1>
        <p className="page-subtitle">Parámetros generales y auditoría</p>
      </div>

      {/* Parameters */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <Settings className="w-5 h-5 text-accent" />
          <h3 className="font-semibold">Parámetros del Sistema</h3>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Período actual</span>
              <span className="font-medium">2026-Q1</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Frecuencia de revisión</span>
              <span className="font-medium">Mensual</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Prioridades</span>
              <span className="font-medium">Alta, Media, Baja</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Estados de objetivo</span>
              <span className="font-medium">Borrador, Activo, En Riesgo, Cerrado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cargos */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">Cargos</h3>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => { setEditingCargo(null); setCargoOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo Cargo
            </Button>
          )}
        </div>
        <div className="divide-y">
          {loadingPositions ? (
            <div className="px-5 py-8 text-center text-muted-foreground">Cargando cargos...</div>
          ) : positions.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground">No hay cargos registrados</div>
          ) : positions.map((pos: any) => (
            <div key={pos.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
              <span className="text-sm font-medium">{pos.name}</span>
              {canManage && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCargo(pos); setCargoOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCargo(pos.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Audit log */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center gap-3">
          <Clock className="w-5 h-5 text-accent" />
          <h3 className="font-semibold">Registro de Auditoría</h3>
        </div>
        <div className="divide-y">
          {isLoading ? (
            <div className="px-5 py-8 text-center text-muted-foreground">Cargando registros...</div>
          ) : activityLog.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground">No hay registros de auditoría</div>
          ) : activityLog.map(log => (
            <div key={log.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{log.user_name}</span>
                  {' '}<span className="text-muted-foreground">{log.action}</span>
                  {' '}<span className="font-medium">{log.entity}</span>
                </p>
                <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <CargoFormDialog open={cargoOpen} onOpenChange={setCargoOpen} position={editingCargo} />
    </div>
  );
}
