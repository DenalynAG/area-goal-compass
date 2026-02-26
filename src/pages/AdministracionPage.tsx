import { useState, useRef } from 'react';
import { useActivityLog, usePositions, useAreas, useSubareas } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Clock, User, Briefcase, Plus, Pencil, Trash2, Upload, ChevronDown, ChevronRight, Building2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CargoFormDialog from '@/components/CargoFormDialog';
import * as XLSX from 'xlsx';

export default function AdministracionPage() {
  const { data: activityLog = [], isLoading } = useActivityLog();
  const { data: positions = [], isLoading: loadingPositions } = usePositions();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('super_admin') || hasRole('admin_area');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cargoOpen, setCargoOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<any>(null);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const handleDeleteCargo = async (id: string) => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cargo eliminado');
    qc.invalidateQueries({ queryKey: ['positions'] });
  };

  const getAreaName = (areaId: string | null) => areas.find(a => a.id === areaId)?.name ?? 'Sin área';
  const getSubareaName = (subareaId: string | null) => subareas.find(s => s.id === subareaId)?.name ?? '';

  // Group positions by area, then by subarea
  const groupedByArea = areas.map(area => {
    const areaPositions = positions.filter((p: any) => p.area_id === area.id && !p.subarea_id);
    const areaSubareas = subareas.filter(s => s.area_id === area.id);
    const subareaGroups = areaSubareas.map(sub => ({
      subarea: sub,
      positions: positions.filter((p: any) => p.subarea_id === sub.id),
    })).filter(g => g.positions.length > 0);
    const totalPositions = areaPositions.length + subareaGroups.reduce((s, g) => s + g.positions.length, 0);
    return { area, directPositions: areaPositions, subareaGroups, totalPositions };
  }).filter(g => g.totalPositions > 0);

  const unassignedPositions = positions.filter((p: any) => !p.area_id);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) { toast.error('El archivo está vacío'); setImporting(false); return; }

      let imported = 0;
      let errors = 0;

      for (const row of rows) {
        const areaName = (row['Área'] || row['Area'] || '').toString().trim();
        const subareaName = (row['Subárea'] || row['Subarea'] || row['Sub Área'] || '').toString().trim();
        const cargoName = (row['Cargo'] || row['Nombre'] || '').toString().trim();

        if (!cargoName) { errors++; continue; }

        let areaId: string | null = null;
        let subareaId: string | null = null;

        if (areaName) {
          const foundArea = areas.find(a => a.name.toLowerCase() === areaName.toLowerCase());
          if (foundArea) {
            areaId = foundArea.id;
            if (subareaName) {
              const foundSub = subareas.find(s => s.area_id === foundArea.id && s.name.toLowerCase() === subareaName.toLowerCase());
              subareaId = foundSub?.id ?? null;
            }
          }
        }

        const { error } = await supabase.from('positions').insert({
          name: cargoName,
          area_id: areaId,
          subarea_id: subareaId,
        });

        if (error) errors++;
        else imported++;
      }

      toast.success(`Importación completada: ${imported} cargos creados${errors > 0 ? `, ${errors} errores` : ''}`);
      qc.invalidateQueries({ queryKey: ['positions'] });
    } catch (err) {
      toast.error('Error al leer el archivo Excel');
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const PositionRow = ({ pos }: { pos: any }) => (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors rounded-lg group">
      <div className="flex items-center gap-2.5">
        <Briefcase className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{pos.name}</span>
      </div>
      {canManage && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingCargo(pos); setCargoOpen(true); }}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCargo(pos.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

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

      {/* Cargos - Redesigned */}
      <div className="bg-card rounded-xl border shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-accent" />
            <div>
              <h3 className="font-semibold">Cargos por Área y Subárea</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{positions.length} cargos registrados</p>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                <Upload className="w-4 h-4 mr-1" />
                {importing ? 'Importando...' : 'Importar Excel'}
              </Button>
              <Button size="sm" onClick={() => { setEditingCargo(null); setCargoOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Nuevo Cargo
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          {loadingPositions ? (
            <div className="py-8 text-center text-muted-foreground">Cargando cargos...</div>
          ) : positions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              <p>No hay cargos registrados</p>
              <p className="text-xs mt-1">Crea uno manualmente o importa desde Excel</p>
            </div>
          ) : (
            <>
              {/* Grouped by area */}
              {groupedByArea.map(({ area, directPositions, subareaGroups, totalPositions }) => (
                <div key={area.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleArea(area.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {expandedAreas[area.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{area.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {totalPositions} cargo{totalPositions !== 1 ? 's' : ''}
                    </span>
                  </button>

                  {expandedAreas[area.id] && (
                    <div className="px-2 py-2 space-y-1">
                      {/* Direct area positions */}
                      {directPositions.length > 0 && (
                        <div className="ml-6">
                          {directPositions.map((pos: any) => (
                            <PositionRow key={pos.id} pos={pos} />
                          ))}
                        </div>
                      )}

                      {/* Subarea groups */}
                      {subareaGroups.map(({ subarea, positions: subPositions }) => (
                        <div key={subarea.id} className="ml-6">
                          <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <FolderOpen className="w-3.5 h-3.5" />
                            {subarea.name}
                            <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] normal-case">
                              {subPositions.length}
                            </span>
                          </div>
                          <div className="ml-4">
                            {subPositions.map((pos: any) => (
                              <PositionRow key={pos.id} pos={pos} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Unassigned positions */}
              {unassignedPositions.length > 0 && (
                <div className="border rounded-lg overflow-hidden border-dashed">
                  <div className="px-4 py-3 bg-muted/20 flex items-center gap-3">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm text-muted-foreground">Sin área asignada</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {unassignedPositions.length}
                    </span>
                  </div>
                  <div className="px-2 py-2 ml-6">
                    {unassignedPositions.map((pos: any) => (
                      <PositionRow key={pos.id} pos={pos} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Import help text */}
        {canManage && (
          <div className="px-5 py-3 border-t bg-muted/10">
            <p className="text-xs text-muted-foreground">
              📋 Para importar, usa un archivo Excel con columnas: <strong>Área</strong>, <strong>Subárea</strong> (opcional), <strong>Cargo</strong>. 
              Los nombres de área y subárea deben coincidir con los registrados en el sistema.
            </p>
          </div>
        )}
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
