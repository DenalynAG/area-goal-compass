import { useState, useRef } from 'react';
import { useActivityLog, usePositions, useAreas, useSubareas, useSystemParameters } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Clock, User, Briefcase, Plus, Pencil, Trash2, Upload, ChevronDown, ChevronRight, Building2, FolderOpen, Check, X, GripVertical, ClipboardList, CalendarClock, Award, ListChecks, Menu as MenuIcon, Users, ScrollText, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import CargoFormDialog from '@/components/CargoFormDialog';
import EvaluacionCriteriaSection from '@/components/EvaluacionCriteriaSection';
import MenuPermissionsSection from '@/components/MenuPermissionsSection';
import LeaderPassAdminSection from '@/components/LeaderPassAdminSection';
import KpiMonthLocksSection from '@/components/KpiMonthLocksSection';
import UserManagementSection from '@/components/UserManagementSection';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'parametros', label: 'Parámetros del Sistema', icon: Settings },
  { key: 'kpilocks', label: 'Cierre de KPI por Mes', icon: CalendarClock },
  { key: 'cargos', label: 'Cargos por Área y Subárea', icon: Briefcase },
  { key: 'leaderpass', label: 'Leader Pass', icon: Award },
  { key: 'evaluacion', label: 'Indicadores de Evaluación', icon: ListChecks },
  { key: 'menus', label: 'Gestión de Menús', icon: MenuIcon },
  { key: 'usuarios', label: 'Gestión de Usuarios', icon: Users },
  { key: 'auditoria', label: 'Registro de Auditoría', icon: ScrollText },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function AdministracionPage() {
  const { data: activityLog = [], isLoading } = useActivityLog();
  const { data: positions = [], isLoading: loadingPositions } = usePositions();
  const { data: areas = [] } = useAreas();
  const { data: subareas = [] } = useSubareas();
  const { data: systemParams = [], isLoading: loadingParams } = useSystemParameters();
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole('super_admin') || hasRole('admin_area');
  const isSuperAdmin = hasRole('super_admin');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('parametros');
  const [cargoOpen, setCargoOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<any>(null);
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [editParamValue, setEditParamValue] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const visibleTabs = TABS.filter(t => {
    if (t.key === 'menus' || t.key === 'usuarios') return isSuperAdmin;
    return true;
  });

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const handleDeleteCargo = async (id: string) => {
    const { error } = await supabase.from('positions').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cargo eliminado');
    qc.invalidateQueries({ queryKey: ['positions'] });
  };

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
        const { error } = await supabase.from('positions').insert({ name: cargoName, area_id: areaId, subarea_id: subareaId });
        if (error) errors++;
        else imported++;
      }
      toast.success(`Importación completada: ${imported} cargos creados${errors > 0 ? `, ${errors} errores` : ''}`);
      qc.invalidateQueries({ queryKey: ['positions'] });
    } catch {
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

      {/* Tabs */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-muted/20">
          <nav className="flex flex-wrap gap-2">
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:bg-muted hover:border-primary/40"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-5">
          {/* Parámetros del Sistema */}
          {activeTab === 'parametros' && (
            <div>
              {loadingParams ? (
                <div className="py-4 text-center text-muted-foreground text-sm">Cargando...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {systemParams.map(param => (
                    <div key={param.key} className="flex items-center justify-between py-2 border-b gap-3">
                      <span className="text-muted-foreground whitespace-nowrap">{param.label}</span>
                      {editingParam === param.key ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editParamValue}
                            onChange={e => setEditParamValue(e.target.value)}
                            className="h-8 text-sm w-48"
                            autoFocus
                            onKeyDown={async e => {
                              if (e.key === 'Enter') {
                                const { error } = await supabase.from('system_parameters').update({ value: editParamValue, updated_at: new Date().toISOString() }).eq('key', param.key);
                                if (error) toast.error(error.message);
                                else { toast.success('Parámetro actualizado'); qc.invalidateQueries({ queryKey: ['system_parameters'] }); }
                                setEditingParam(null);
                              }
                              if (e.key === 'Escape') setEditingParam(null);
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
                            const { error } = await supabase.from('system_parameters').update({ value: editParamValue, updated_at: new Date().toISOString() }).eq('key', param.key);
                            if (error) toast.error(error.message);
                            else { toast.success('Parámetro actualizado'); qc.invalidateQueries({ queryKey: ['system_parameters'] }); }
                            setEditingParam(null);
                          }}>
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingParam(null)}>
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="font-medium">{param.value}</span>
                          {isSuperAdmin && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditingParam(param.key); setEditParamValue(param.value); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cargos */}
          {activeTab === 'cargos' && (
            <div>
              {canManage && (
                <div className="flex gap-2 mb-4 justify-end">
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                    <Upload className="w-4 h-4 mr-1" />
                    {importing ? 'Importando...' : 'Importar Excel'}
                  </Button>
                  <Button size="sm" onClick={() => { setEditingCargo(null); setCargoOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" /> Nuevo Cargo
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mb-3">{positions.length} cargos registrados</p>

              <div className="space-y-2">
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
                            {directPositions.length > 0 && (
                              <div className="ml-6">
                                {directPositions.map((pos: any) => <PositionRow key={pos.id} pos={pos} />)}
                              </div>
                            )}
                            {subareaGroups.map(({ subarea, positions: subPositions }) => (
                              <div key={subarea.id} className="ml-6">
                                <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  {subarea.name}
                                  <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] normal-case">{subPositions.length}</span>
                                </div>
                                <div className="ml-4">
                                  {subPositions.map((pos: any) => <PositionRow key={pos.id} pos={pos} />)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {unassignedPositions.length > 0 && (
                      <div className="border rounded-lg overflow-hidden border-dashed">
                        <div className="px-4 py-3 bg-muted/20 flex items-center gap-3">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-sm text-muted-foreground">Sin área asignada</span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{unassignedPositions.length}</span>
                        </div>
                        <div className="px-2 py-2 ml-6">
                          {unassignedPositions.map((pos: any) => <PositionRow key={pos.id} pos={pos} />)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {canManage && (
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    📋 Para importar, usa un archivo Excel con columnas: <strong>Área</strong>, <strong>Subárea</strong> (opcional), <strong>Cargo</strong>.
                    Los nombres de área y subárea deben coincidir con los registrados en el sistema.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Leader Pass */}
          {activeTab === 'leaderpass' && <LeaderPassAdminSection canManage={canManage} />}

          {/* Cierre de KPI por Mes */}
          {activeTab === 'kpilocks' && <KpiMonthLocksSection canManage={isSuperAdmin} />}

          {/* Indicadores de Evaluación */}
          {activeTab === 'evaluacion' && <EvaluacionCriteriaSection canManage={canManage} />}

          {/* Gestión de Menús */}
          {activeTab === 'menus' && isSuperAdmin && <MenuPermissionsSection />}

          {/* Gestión de Usuarios */}
          {activeTab === 'usuarios' && isSuperAdmin && <UserManagementSection />}

          {/* Registro de Auditoría */}
          {activeTab === 'auditoria' && (
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por usuario, tabla, acción o ID..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {(['all','crear','editar','eliminar'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => setAuditAction(a)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize',
                      auditAction === a ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
                    )}
                  >
                    {a === 'all' ? 'Todas' : a}
                  </button>
                ))}
              </div>
              <div className="divide-y border rounded-md overflow-hidden">
                {isLoading ? (
                  <div className="px-5 py-8 text-center text-muted-foreground">Cargando registros...</div>
                ) : (() => {
                  const filtered = activityLog.filter((log: any) => {
                    if (auditAction !== 'all') {
                      const a = String(log.action || '').toLowerCase();
                      if (!a.includes(auditAction)) return false;
                    }
                    if (auditSearch.trim()) {
                      const s = auditSearch.toLowerCase();
                      const hay = `${log.user_name || ''} ${log.action || ''} ${log.entity || ''} ${log.table_name || ''} ${log.entity_id || ''}`.toLowerCase();
                      if (!hay.includes(s)) return false;
                    }
                    return true;
                  });
                  if (filtered.length === 0) {
                    return <div className="px-5 py-8 text-center text-muted-foreground">No hay registros de auditoría</div>;
                  }
                  return filtered.map((log: any) => {
                    const expanded = expandedLogs[log.id];
                    const details = log.details as any;
                    const actionLower = String(log.action || '').toLowerCase();
                    const actionColor = actionLower.includes('crear') ? 'bg-emerald-100 text-emerald-800'
                      : actionLower.includes('editar') ? 'bg-blue-100 text-blue-800'
                      : actionLower.includes('eliminar') ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-800';
                    const hasDetails = !!details;
                    return (
                      <div key={log.id} className="bg-background">
                        <div
                          className={cn('flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors', hasDetails && 'cursor-pointer')}
                          onClick={() => hasDetails && setExpandedLogs(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{log.user_name || 'Sistema'}</span>
                              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', actionColor)}>
                                {log.action}
                              </span>
                              <span className="text-xs text-muted-foreground">en</span>
                              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {log.table_name || log.entity}
                              </span>
                              {log.entity_id && (
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                                  #{log.entity_id}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                          {hasDetails && (
                            <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform mt-2', expanded && 'rotate-180')} />
                          )}
                        </div>
                        {expanded && hasDetails && (
                          <div className="px-4 pb-4 pl-15 bg-muted/20">
                            {details.cambios && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cambios</p>
                                <div className="border rounded overflow-hidden bg-background">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/50">
                                      <tr>
                                        <th className="text-left px-2 py-1.5 font-medium">Campo</th>
                                        <th className="text-left px-2 py-1.5 font-medium text-red-700">Antes</th>
                                        <th className="text-left px-2 py-1.5 font-medium text-emerald-700">Después</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {Object.entries(details.cambios).map(([field, val]: [string, any]) => (
                                        <tr key={field}>
                                          <td className="px-2 py-1.5 font-mono text-[11px]">{field}</td>
                                          <td className="px-2 py-1.5 text-red-700 break-all">{JSON.stringify(val?.antes) ?? '—'}</td>
                                          <td className="px-2 py-1.5 text-emerald-700 break-all">{JSON.stringify(val?.despues) ?? '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                            {details.nuevo && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos creados</p>
                                <pre className="text-[11px] bg-background border rounded p-2 overflow-x-auto max-h-60">{JSON.stringify(details.nuevo, null, 2)}</pre>
                              </div>
                            )}
                            {details.eliminado && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Datos eliminados</p>
                                <pre className="text-[11px] bg-background border rounded p-2 overflow-x-auto max-h-60">{JSON.stringify(details.eliminado, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      <CargoFormDialog open={cargoOpen} onOpenChange={setCargoOpen} position={editingCargo} />
    </div>
  );
}
