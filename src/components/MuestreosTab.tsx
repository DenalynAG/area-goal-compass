import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EvidencePanel from '@/components/EvidencePanel';
import {
  Trash2, Upload, Paperclip, Loader2, FileText, Download, Save, Plus, Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
} from 'recharts';

// ─── Grid Row from DB ───
interface GridRow {
  id: string;
  area_name: string;
  area: string;          // zone (e.g., Cocina)
  indicator: string;     // display indicator
  storedIndicator: string; // same as indicator (kept for compatibility)
  sort_order: number;
}

interface SamplingGridRowDB {
  id: string;
  area_name: string;
  zone_name: string;
  indicator_name: string;
  sort_order: number;
}

function useSamplingGridRows() {
  return useQuery({
    queryKey: ['sampling_grid_rows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sampling_grid_rows')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as SamplingGridRowDB[];
    },
  });
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SAMPLING_TYPES = [
  { value: 'microbiologico', label: 'Microbiológico' },
  { value: 'fisico_quimico', label: 'Físico Químico' },
];

interface SamplingRecord {
  id: string;
  area_name: string;
  zone_name: string;
  indicator_name: string;
  sampling_type: string;
  period: string;
  numeric_value: number | null;
  unit: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

function useSamplingRecords() {
  return useQuery({
    queryKey: ['sampling_records'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sampling_records')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SamplingRecord[];
    },
  });
}

interface MuestreosTabProps {
  areaFilterName?: string;
}

export default function MuestreosTab({ areaFilterName }: MuestreosTabProps = {}) {
  const { user, profile, isSuperAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const { data: records = [], isLoading } = useSamplingRecords();
  const { data: dbRows = [] } = useSamplingGridRows();
  const isRRHH = !areaFilterName || areaFilterName === 'Recursos Humanos';
  const canManage = (isSuperAdmin || hasRole('admin_area')) && isRRHH;

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [samplingType, setSamplingType] = useState('microbiologico');
  const [saving, setSaving] = useState(false);

  // Pending edits: key = `${area}|${indicator}|${monthIdx}` → value string
  const [pendingEdits, setPendingEdits] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);

  // CRUD dialogs for grid rows
  const [rowDialog, setRowDialog] = useState<null | { mode: 'add' | 'edit'; row?: SamplingGridRowDB; presetArea?: string; presetZone?: string }>(null);
  const [rowForm, setRowForm] = useState({ area_name: '', zone_name: '', indicator_name: '' });
  const [rowSaving, setRowSaving] = useState(false);
  const [deleteRow, setDeleteRow] = useState<SamplingGridRowDB | null>(null);

  // Evidence panel
  const [evidenceRecordId, setEvidenceRecordId] = useState<string | null>(null);
  const [evidenceRecordName, setEvidenceRecordName] = useState('');

  // Files for new records via dialog
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Build a lookup map: key → record
  const recordMap = useMemo(() => {
    const map: Record<string, SamplingRecord> = {};
    records.forEach(r => {
      // period is "YYYY-MM", extract month index
      const [yr, mo] = r.period.split('-').map(Number);
      if (yr === selectedYear && r.sampling_type === samplingType) {
        const key = `${r.zone_name}|${r.indicator_name}|${mo - 1}`;
        map[key] = r;
      }
    });
    return map;
  }, [records, selectedYear, samplingType]);

  // Convert DB rows to GridRow shape, filter by area if not RRHH
  const visibleRows = useMemo<GridRow[]>(() => {
    const all: GridRow[] = dbRows.map(r => ({
      id: r.id,
      area_name: r.area_name,
      area: r.zone_name,
      indicator: r.indicator_name,
      storedIndicator: r.indicator_name,
      sort_order: r.sort_order,
    }));
    if (isRRHH) return all;
    return all.filter(r => r.area_name === areaFilterName);
  }, [dbRows, isRRHH, areaFilterName]);

  // Group rows by area for display
  const groupedRows = useMemo(() => {
    const groups: { area: string; rows: typeof visibleRows }[] = [];
    let currentArea = '';
    visibleRows.forEach(row => {
      if (row.area !== currentArea) {
        currentArea = row.area;
        groups.push({ area: currentArea, rows: [] });
      }
      groups[groups.length - 1].rows.push(row);
    });
    return groups;
  }, [visibleRows]);

  const getCellKey = (area: string, indicator: string, monthIdx: number) =>
    `${area}|${indicator}|${monthIdx}`;

  const getCellValue = (area: string, indicator: string, monthIdx: number): string | null => {
    const key = getCellKey(area, indicator, monthIdx);
    if (pendingEdits[key] !== undefined) return pendingEdits[key];
    const record = recordMap[key];
    if (!record) return null;
    return record.numeric_value != null ? `${record.numeric_value}%` : (record.status === 'conforme' ? '100%' : '0%');
  };

  const getCellStatus = (area: string, indicator: string, monthIdx: number): 'conforme' | 'no_conforme' | null => {
    const key = getCellKey(area, indicator, monthIdx);
    const pending = pendingEdits[key];
    if (pending !== undefined) {
      const num = parseFloat(pending);
      if (isNaN(num)) return null;
      return num >= 100 ? 'conforme' : 'no_conforme';
    }
    const record = recordMap[key];
    if (!record) return null;
    return record.status as 'conforme' | 'no_conforme';
  };

  const handleCellClick = (area: string, indicator: string, monthIdx: number) => {
    if (!canManage) return;
    const key = getCellKey(area, indicator, monthIdx);
    setEditingCell(key);
    if (pendingEdits[key] === undefined) {
      const record = recordMap[key];
      const val = record?.numeric_value != null ? String(record.numeric_value) : '';
      setPendingEdits(prev => ({ ...prev, [key]: val }));
    }
  };

  const handleCellChange = (key: string, value: string) => {
    // Allow only numbers
    const clean = value.replace(/[^0-9.]/g, '');
    setPendingEdits(prev => ({ ...prev, [key]: clean }));
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, area: string, indicator: string, monthIdx: number) => {
    if (e.key === 'Enter') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setEditingCell(null);
      // Move to next month
      if (monthIdx < 11) {
        const nextKey = getCellKey(area, indicator, monthIdx + 1);
        setEditingCell(nextKey);
        if (pendingEdits[nextKey] === undefined) {
          const record = recordMap[nextKey];
          const val = record?.numeric_value != null ? String(record.numeric_value) : '';
          setPendingEdits(prev => ({ ...prev, [nextKey]: val }));
        }
      }
    } else if (e.key === 'Escape') {
      const key = getCellKey(area, indicator, monthIdx);
      setPendingEdits(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEditingCell(null);
    }
  };

  const hasPendingChanges = Object.keys(pendingEdits).length > 0;

  const saveAllChanges = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(pendingEdits)) {
        const [area, indicator, monthStr] = key.split('|');
        const monthIdx = parseInt(monthStr);
        const period = `${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}`;
        const numValue = value ? parseFloat(value) : null;
        const status = numValue != null && numValue >= 100 ? 'conforme' : 'no_conforme';

        const existing = recordMap[key];
        if (existing) {
          // Update
          const { error } = await supabase.from('sampling_records').update({
            numeric_value: numValue,
            status,
            unit: '%',
          }).eq('id', existing.id);
          if (error) { toast.error(`Error: ${error.message}`); continue; }
        } else if (value !== '') {
          // Lookup area_name from DB rows
          const dbRow = dbRows.find(r => r.zone_name === area && r.indicator_name === indicator);
          const areaName = dbRow?.area_name ?? (area === 'Cocina' || area === 'Bar' ? 'Alimentos y Bebidas' : 'Operaciones');
          // Insert
          const { error } = await supabase.from('sampling_records').insert({
            area_name: areaName,
            zone_name: area,
            indicator_name: indicator,
            sampling_type: samplingType,
            period,
            numeric_value: numValue,
            unit: '%',
            status,
            created_by: user.id,
          });
          if (error) { toast.error(`Error: ${error.message}`); continue; }
        }
      }
      setPendingEdits({});
      qc.invalidateQueries({ queryKey: ['sampling_records'] });
      toast.success('Muestreos guardados correctamente');
    } finally { setSaving(false); }
  };

  // ─── CRUD for grid rows ───
  const openAddRow = (presetArea?: string, presetZone?: string) => {
    setRowForm({
      area_name: presetArea ?? (areaFilterName && !isRRHH ? areaFilterName : ''),
      zone_name: presetZone ?? '',
      indicator_name: '',
    });
    setRowDialog({ mode: 'add', presetArea, presetZone });
  };
  const openEditRow = (row: SamplingGridRowDB) => {
    setRowForm({ area_name: row.area_name, zone_name: row.zone_name, indicator_name: row.indicator_name });
    setRowDialog({ mode: 'edit', row });
  };
  const saveRow = async () => {
    if (!rowForm.area_name.trim() || !rowForm.zone_name.trim() || !rowForm.indicator_name.trim()) {
      toast.error('Área, Zona e Indicador son obligatorios');
      return;
    }
    setRowSaving(true);
    try {
      if (rowDialog?.mode === 'edit' && rowDialog.row) {
        const { error } = await supabase.from('sampling_grid_rows').update({
          area_name: rowForm.area_name.trim(),
          zone_name: rowForm.zone_name.trim(),
          indicator_name: rowForm.indicator_name.trim(),
        }).eq('id', rowDialog.row.id);
        if (error) { toast.error(error.message); return; }
        toast.success('Fila actualizada');
      } else {
        // New: place at end of zone group (max sort_order in zone +1)
        const sameZone = dbRows.filter(r => r.zone_name === rowForm.zone_name.trim());
        const maxOrder = sameZone.length ? Math.max(...sameZone.map(r => r.sort_order)) : Math.max(0, ...dbRows.map(r => r.sort_order));
        const { error } = await supabase.from('sampling_grid_rows').insert({
          area_name: rowForm.area_name.trim(),
          zone_name: rowForm.zone_name.trim(),
          indicator_name: rowForm.indicator_name.trim(),
          sort_order: maxOrder + 10,
          created_by: user?.id ?? null,
        });
        if (error) { toast.error(error.message); return; }
        toast.success('Fila agregada');
      }
      setRowDialog(null);
      qc.invalidateQueries({ queryKey: ['sampling_grid_rows'] });
    } finally { setRowSaving(false); }
  };
  const confirmDeleteRow = async () => {
    if (!deleteRow) return;
    const { error } = await supabase.from('sampling_grid_rows').delete().eq('id', deleteRow.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Fila eliminada');
    setDeleteRow(null);
    qc.invalidateQueries({ queryKey: ['sampling_grid_rows'] });
  };

  // Export Excel
  const handleExportExcel = () => {
    const data: any[] = [];
    visibleRows.forEach(row => {
      const rowData: any = { 'Área': row.area, 'Indicador clave': row.indicator };
      MONTHS.forEach((m, i) => {
        const val = getCellValue(row.area, row.storedIndicator, i);
        rowData[m] = val ?? '';
      });
      data.push(rowData);
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Muestreos');
    XLSX.writeFile(wb, `Muestreos_${samplingType}_${selectedYear}.xlsx`);
    toast.success('Reporte exportado');
  };

  // Year options
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  if (isLoading) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando muestreos…</CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Muestreos Microbiológicos y Físico Químicos
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={String(selectedYear)} onValueChange={v => { setSelectedYear(Number(v)); setPendingEdits({}); }}>
            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={samplingType} onValueChange={v => { setSamplingType(v); setPendingEdits({}); }}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SAMPLING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExportExcel}>
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          {canManage && hasPendingChanges && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={saveAllChanges} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar cambios
            </Button>
          )}
        </div>
      </div>

      {/* Grid table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-primary/10">
                  <th className="text-left px-3 py-2.5 font-semibold border-b border-r border-border w-[100px] sticky left-0 bg-primary/10 z-10">Área</th>
                  <th className="text-left px-3 py-2.5 font-semibold border-b border-r border-border w-[140px] sticky left-[100px] bg-primary/10 z-10">Indicador clave</th>
                  {MONTHS.map(m => (
                    <th key={m} className="text-center px-1 py-2.5 font-semibold border-b border-r border-border min-w-[70px]">{m}</th>
                  ))}
                  <th className="text-center px-2 py-2.5 font-semibold border-b border-border min-w-[70px] bg-primary/15">% Acum.</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map(group => (
                  group.rows.map((row, rowIdx) => {
                    const isFirstInGroup = rowIdx === 0;
                    const rowCount = group.rows.length;
                    return (
                      <tr key={`${row.area}-${row.indicator}-${rowIdx}`} className="border-b border-border hover:bg-muted/20 transition-colors">
                        {isFirstInGroup && (
                          <td
                            rowSpan={rowCount}
                            className="px-3 py-2 font-semibold text-foreground border-r border-border align-top sticky left-0 bg-background z-10"
                          >
                            {row.area}
                          </td>
                        )}
                        <td className="px-3 py-2 font-medium text-foreground border-r border-border sticky left-[100px] bg-background z-10">
                          {row.indicator}
                        </td>
                        {MONTHS.map((_, monthIdx) => {
                          const key = getCellKey(row.area, row.storedIndicator, monthIdx);
                          const isEditing = editingCell === key;
                          const cellValue = getCellValue(row.area, row.storedIndicator, monthIdx);
                          const cellStatus = getCellStatus(row.area, row.storedIndicator, monthIdx);

                          return (
                            <td
                              key={monthIdx}
                              className={`text-center px-1 py-1.5 border-r border-border transition-colors ${
                                canManage ? 'cursor-pointer hover:bg-accent/20' : ''
                              }`}
                              onClick={() => handleCellClick(row.area, row.storedIndicator, monthIdx)}
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={pendingEdits[key] ?? ''}
                                  onChange={e => handleCellChange(key, e.target.value)}
                                  onBlur={handleCellBlur}
                                  onKeyDown={e => handleCellKeyDown(e, row.area, row.storedIndicator, monthIdx)}
                                  className="w-full text-center text-xs border rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              ) : cellValue ? (
                                <span className={`font-semibold ${
                                  cellStatus === 'conforme'
                                    ? 'text-[hsl(var(--success))]'
                                    : cellStatus === 'no_conforme'
                                      ? 'text-destructive'
                                      : 'text-foreground'
                                }`}>
                                  {cellValue}
                                </span>
                              ) : pendingEdits[key] !== undefined ? (
                                <span className="text-muted-foreground">—</span>
                              ) : null}
                            </td>
                          );
                        })}
                        {/* % Acumulado */}
                        {(() => {
                          let filled = 0;
                          let total = 0;
                          for (let m = 0; m < 12; m++) {
                            const val = getCellValue(row.area, row.storedIndicator, m);
                            if (val) {
                              total++;
                              const num = parseFloat(val);
                              if (!isNaN(num)) filled += num;
                            }
                          }
                          if (total === 0) return <td className="text-center px-1 py-1.5 bg-muted/30 font-semibold text-muted-foreground">—</td>;
                          const avg = Math.round(filled / total);
                          return (
                            <td className={`text-center px-1 py-1.5 font-bold bg-muted/30 ${avg >= 100 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                              {avg}%
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Trazabilidad - Gráfica de avances por indicador */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Trazabilidad de avances · % Acumulado por indicador
            </h4>
            <span className="text-xs text-muted-foreground">{selectedYear} · {SAMPLING_TYPES.find(t => t.value === samplingType)?.label}</span>
          </div>
          {(() => {
            const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777'];
            const areas = groupedRows.map(g => g.area);
            // Build unified X axis with all indicators across areas; one dataKey per area
            const data: Array<Record<string, any>> = [];
            groupedRows.forEach(group => {
              group.rows.forEach((row, idx) => {
                let filled = 0; let total = 0;
                for (let m = 0; m < 12; m++) {
                  const val = getCellValue(row.area, row.storedIndicator, m);
                  if (val) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) { filled += num; total++; }
                  }
                }
                const value = total > 0 ? Math.round(filled / total) : null;
                const dup = group.rows.slice(0, idx).filter(r => r.indicator === row.indicator).length;
                const name = `${row.area} · ${row.indicator}${dup > 0 ? ` (${dup + 1})` : ''}`;
                const point: Record<string, any> = { name };
                point[row.area] = value;
                data.push(point);
              });
            });

            return (
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={data} margin={{ top: 24, right: 24, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(v: any, n: any) => v != null ? [`${v}%`, n] : ['Sin datos', n]}
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {areas.map((area, gi) => (
                    <Line
                      key={area}
                      type="monotone"
                      dataKey={area}
                      stroke={COLORS[gi % COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: COLORS[gi % COLORS.length] }}
                      connectNulls
                      name={area}
                    >
                      <LabelList
                        dataKey={area}
                        position="top"
                        formatter={(v: any) => v != null ? `${v}%` : ''}
                        style={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                      />
                    </Line>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            );
          })()}
        </CardContent>
      </Card>

      {/* Evidence Panel */}
      <EvidencePanel
        entityType="sampling"
        entityId={evidenceRecordId ?? ''}
        entityName={evidenceRecordName}
        open={!!evidenceRecordId}
        onOpenChange={open => { if (!open) setEvidenceRecordId(null); }}
      />
    </div>
  );
}
