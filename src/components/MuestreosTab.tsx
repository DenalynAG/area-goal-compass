import { useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EvidencePanel from '@/components/EvidencePanel';
import {
  Plus, Trash2, Pencil, FlaskConical, CheckCircle2, XCircle,
  Upload, Paperclip, Loader2, Search, FileText, Download
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// ─── Config ───
const SAMPLING_AREAS = [
  {
    area: 'Alimentos y Bebidas',
    zones: ['Cocina', 'Pastelería', 'Porcionamiento', 'Bar Cartajena', 'Bar Ajeno', 'Bar Patio', 'Centro Producción'],
    indicators: ['Alimentos', 'Superficies', 'Ambiente', 'Manipuladores', 'Bebidas', 'Hielo'],
  },
  {
    area: 'Mantenimiento',
    zones: ['Piscina Piso 1', 'Piscina Piso 5', 'Tanque Agua Potable'],
    indicators: ['Piscina 1', 'Piscina 5', 'Agua potable grifos'],
  },
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

function getPeriodOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = format(d, 'yyyy-MM');
    const label = format(d, 'MMMM yyyy', { locale: es });
    options.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

export default function MuestreosTab() {
  const { user, profile, isSuperAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const { data: records = [], isLoading } = useSamplingRecords();
  const canManage = isSuperAdmin || hasRole('admin_area');

  // Filters
  const [filterPeriod, setFilterPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [filterArea, setFilterArea] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SamplingRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({
    area_name: '',
    zone_name: '',
    indicator_name: '',
    sampling_type: 'microbiologico',
    period: format(new Date(), 'yyyy-MM'),
    numeric_value: '',
    unit: '',
    status: 'conforme',
    notes: '',
  });

  // Files
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Evidence panel
  const [evidenceRecordId, setEvidenceRecordId] = useState<string | null>(null);
  const [evidenceRecordName, setEvidenceRecordName] = useState('');

  const periodOptions = useMemo(getPeriodOptions, []);

  const selectedAreaConfig = SAMPLING_AREAS.find(a => a.area === form.area_name);
  const availableZones = selectedAreaConfig?.zones ?? [];
  const availableIndicators = selectedAreaConfig?.indicators ?? [];

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterPeriod !== 'all' && r.period !== filterPeriod) return false;
      if (filterArea !== 'all' && r.area_name !== filterArea) return false;
      if (filterType !== 'all' && r.sampling_type !== filterType) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!r.zone_name.toLowerCase().includes(s) && !r.indicator_name.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [records, filterPeriod, filterArea, filterType, searchTerm]);

  const openDialog = (record?: SamplingRecord) => {
    if (record) {
      setEditing(record);
      setForm({
        area_name: record.area_name,
        zone_name: record.zone_name,
        indicator_name: record.indicator_name,
        sampling_type: record.sampling_type,
        period: record.period,
        numeric_value: record.numeric_value?.toString() ?? '',
        unit: record.unit ?? '',
        status: record.status,
        notes: record.notes ?? '',
      });
    } else {
      setEditing(null);
      setForm({
        area_name: '', zone_name: '', indicator_name: '',
        sampling_type: 'microbiologico', period: format(new Date(), 'yyyy-MM'),
        numeric_value: '', unit: '', status: 'conforme', notes: '',
      });
    }
    setFiles([]);
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    if (!f) return;
    const valid = Array.from(f).filter(file => {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} excede 10MB`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const uploadFiles = async (recordId: string) => {
    if (files.length === 0 || !user) return;
    setUploading(true);
    try {
      for (const file of files) {
        const filePath = `sampling/${recordId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from('evidencias').upload(filePath, file);
        if (upErr) { toast.error(`Error subiendo ${file.name}`); continue; }
        await supabase.from('evidences').insert({
          entity_type: 'sampling', entity_id: recordId,
          file_name: file.name, file_path: filePath,
          file_type: file.type, file_size: file.size,
          uploaded_by: user.id, uploaded_by_name: profile?.name ?? user.email,
        });
      }
      qc.invalidateQueries({ queryKey: ['evidences'] });
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.area_name || !form.zone_name || !form.indicator_name) {
      toast.error('Completa área, zona e indicador'); return;
    }
    setSaving(true);
    try {
      const payload = {
        area_name: form.area_name,
        zone_name: form.zone_name,
        indicator_name: form.indicator_name,
        sampling_type: form.sampling_type,
        period: form.period,
        numeric_value: form.numeric_value ? parseFloat(form.numeric_value) : null,
        unit: form.unit || null,
        status: form.status,
        notes: form.notes || null,
        created_by: user?.id ?? null,
      };

      let recordId = editing?.id;
      if (editing) {
        const { error } = await supabase.from('sampling_records').update(payload).eq('id', editing.id);
        if (error) { toast.error(error.message); return; }
      } else {
        const { data, error } = await supabase.from('sampling_records').insert(payload).select('id').single();
        if (error) { toast.error(error.message); return; }
        recordId = data.id;
      }

      if (recordId && files.length > 0) await uploadFiles(recordId);

      toast.success(editing ? 'Muestreo actualizado' : 'Muestreo registrado');
      qc.invalidateQueries({ queryKey: ['sampling_records'] });
      setDialogOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sampling_records').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Muestreo eliminado');
    qc.invalidateQueries({ queryKey: ['sampling_records'] });
  };

  // Summary
  const summary = useMemo(() => {
    const periodRecords = records.filter(r => r.period === filterPeriod);
    return {
      total: periodRecords.length,
      conforme: periodRecords.filter(r => r.status === 'conforme').length,
      no_conforme: periodRecords.filter(r => r.status === 'no_conforme').length,
    };
  }, [records, filterPeriod]);

  const typeLabel = (t: string) => SAMPLING_TYPES.find(s => s.value === t)?.label ?? t;

  const handleExportExcel = () => {
    const data = filteredRecords.map(r => ({
      'Período': r.period,
      'Tipo': typeLabel(r.sampling_type),
      'Área': r.area_name,
      'Zona': r.zone_name,
      'Indicador': r.indicator_name,
      'Valor': r.numeric_value ?? '',
      'Unidad': r.unit ?? '',
      'Estado': r.status === 'conforme' ? 'Conforme' : 'No Conforme',
      'Notas': r.notes ?? '',
      'Fecha Registro': r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy HH:mm') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Muestreos');
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 30 }, { wch: 18 }];
    XLSX.writeFile(wb, `Reporte_Muestreos_${filterPeriod === 'all' ? 'Todos' : filterPeriod}.xlsx`);
    toast.success('Reporte exportado');
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <FlaskConical className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{summary.total}</p>
            <p className="text-[11px] text-muted-foreground">Total Muestreos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))] mx-auto mb-1" />
            <p className="text-xl font-bold">{summary.conforme}</p>
            <p className="text-[11px] text-muted-foreground">Conforme</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-xl font-bold">{summary.no_conforme}</p>
            <p className="text-[11px] text-muted-foreground">No Conforme</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + New button */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar zona o indicador…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los meses</SelectItem>
            {periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {SAMPLING_AREAS.map(a => <SelectItem key={a.area} value={a.area}>{a.area}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {SAMPLING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExportExcel} disabled={filteredRecords.length === 0}>
          <Download className="w-4 h-4 mr-1" /> Exportar Excel
        </Button>
        {canManage && (
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Muestreo
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando…</CardContent></Card>
      ) : filteredRecords.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No hay muestreos registrados para este período</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Valor</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {(() => {
                        const label = format(new Date(r.period + '-01'), 'MMM yyyy', { locale: es });
                        return label.charAt(0).toUpperCase() + label.slice(1);
                      })()}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{r.area_name}</TableCell>
                    <TableCell className="text-xs">{r.zone_name}</TableCell>
                    <TableCell className="text-xs">{r.indicator_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{typeLabel(r.sampling_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.numeric_value != null ? `${r.numeric_value}${r.unit ? ` ${r.unit}` : ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${r.status === 'conforme' ? 'bg-[hsl(var(--success))] text-white' : 'bg-destructive text-destructive-foreground'}`}>
                        {r.status === 'conforme' ? 'Conforme' : 'No Conforme'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7"
                          onClick={() => { setEvidenceRecordId(r.id); setEvidenceRecordName(`${r.zone_name} - ${r.indicator_name}`); }}>
                          <Paperclip className="w-3 h-3" />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openDialog(r)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── New/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Muestreo' : 'Nuevo Muestreo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Período *</Label>
                <Select value={form.period} onValueChange={v => setForm({ ...form, period: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Muestreo *</Label>
                <Select value={form.sampling_type} onValueChange={v => setForm({ ...form, sampling_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SAMPLING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Área *</Label>
              <Select value={form.area_name} onValueChange={v => setForm({ ...form, area_name: v, zone_name: '', indicator_name: '' })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
                <SelectContent>
                  {SAMPLING_AREAS.map(a => <SelectItem key={a.area} value={a.area}>{a.area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Zona *</Label>
                <Select value={form.zone_name} onValueChange={v => setForm({ ...form, zone_name: v })} disabled={!form.area_name}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar zona" /></SelectTrigger>
                  <SelectContent>
                    {availableZones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Indicador *</Label>
                <Select value={form.indicator_name} onValueChange={v => setForm({ ...form, indicator_name: v })} disabled={!form.area_name}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar indicador" /></SelectTrigger>
                  <SelectContent>
                    {availableIndicators.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Valor numérico</Label>
                <Input type="number" value={form.numeric_value} onChange={e => setForm({ ...form, numeric_value: e.target.value })} placeholder="Ej: 150" />
              </div>
              <div>
                <Label>Unidad</Label>
                <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="UFC, pH, mg/L" />
              </div>
              <div>
                <Label>Estado *</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conforme">Conforme</SelectItem>
                    <SelectItem value="no_conforme">No Conforme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Observaciones</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Notas adicionales…" />
            </div>

            {/* File attachments */}
            <div>
              <Label>Adjuntos (Reportes, Fotos)</Label>
              <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="outline" size="sm" className="gap-2 mt-1" onClick={() => fileRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Seleccionar archivos
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">PDF, PNG, JPG · Máx. 10MB por archivo</p>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1">
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || uploading}>
                {(saving || uploading) && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
