import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface TalentCandidate {
  id: string;
  full_name: string;
  document_id: string | null;
  phone: string | null;
  email: string | null;
  profession: string | null;
  university: string | null;
  salario_aspiracion: number | null;
  fecha_nacimiento: string | null;
  nivel_ingles: string | null;
  direccion: string | null;
  anos_experiencia: number | null;
  notes: string | null;
  created_at: string;
}

const NONE = '__none__';
const LEVELS = [{ value: 'basico', label: 'Básico' }, { value: 'intermedio', label: 'Intermedio' }, { value: 'avanzado', label: 'Avanzado' }, { value: 'nativo', label: 'Nativo' }];

export function useTalentCandidates() {
  return useQuery({
    queryKey: ['talent_candidates'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('talent_candidates').select('*').order('full_name');
      if (error) throw error;
      return (data ?? []) as TalentCandidate[];
    },
  });
}

const empty = {
  full_name: '', document_id: '', phone: '', email: '', profession: '', university: '',
  salario_aspiracion: '', fecha_nacimiento: '', nivel_ingles: NONE, direccion: '', anos_experiencia: '', notes: '',
};

export default function CandidatosTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: rows = [], isLoading } = useTalentCandidates();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TalentCandidate | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.full_name, r.document_id, r.email, r.profession].some(v => (v ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  const openNew = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (r: TalentCandidate) => {
    setEditing(r);
    setForm({
      full_name: r.full_name, document_id: r.document_id ?? '', phone: r.phone ?? '', email: r.email ?? '',
      profession: r.profession ?? '', university: r.university ?? '',
      salario_aspiracion: r.salario_aspiracion?.toString() ?? '', fecha_nacimiento: r.fecha_nacimiento ?? '',
      nivel_ingles: r.nivel_ingles ?? NONE, direccion: r.direccion ?? '',
      anos_experiencia: r.anos_experiencia?.toString() ?? '', notes: r.notes ?? '',
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(),
      document_id: form.document_id.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      profession: form.profession.trim() || null,
      university: form.university.trim() || null,
      salario_aspiracion: form.salario_aspiracion ? Number(form.salario_aspiracion) : null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      nivel_ingles: form.nivel_ingles === NONE ? null : form.nivel_ingles,
      direccion: form.direccion.trim() || null,
      anos_experiencia: form.anos_experiencia ? Number(form.anos_experiencia) : null,
      notes: form.notes.trim() || null,
    };
    const t = (supabase as any).from('talent_candidates');
    const { error } = editing
      ? await t.update(payload).eq('id', editing.id)
      : await t.insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Candidato actualizado' : 'Candidato registrado');
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['talent_candidates'] });
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from('talent_candidates').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) { toast.error(error.message); return; }
    toast.success('Candidato eliminado');
    qc.invalidateQueries({ queryKey: ['talent_candidates'] });
  };

  const f = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(s => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Base de candidatos. Luego puedes seleccionarlos al registrar un aspirante para Assessment.</p>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Registrar candidato</Button>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar candidato, documento, correo o profesión..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Candidato</th><th className="p-3">Profesión</th><th className="p-3">Universidad</th>
              <th className="p-3">Experiencia</th><th className="p-3">Inglés</th><th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No hay candidatos registrados.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{[r.document_id, r.email, r.phone].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="p-3">{r.profession ?? '—'}</td>
                <td className="p-3">{r.university ?? '—'}</td>
                <td className="p-3">{r.anos_experiencia != null ? `${r.anos_experiencia} años` : '—'}</td>
                <td className="p-3">{LEVELS.find(l => l.value === r.nivel_ingles)?.label ?? '—'}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar candidato' : 'Registrar candidato'}</DialogTitle>
            <DialogDescription>Datos personales y profesionales del candidato.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Nombre completo *</label><Input value={form.full_name} onChange={f('full_name')} required /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Documento</label><Input value={form.document_id} onChange={f('document_id')} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Teléfono</label><Input value={form.phone} onChange={f('phone')} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Correo</label><Input type="email" value={form.email} onChange={f('email')} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Profesión</label><Input value={form.profession} onChange={f('profession')} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Universidad de estudio</label><Input value={form.university} onChange={f('university')} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Aspiración salarial</label><Input type="number" min="0" step="any" value={form.salario_aspiracion} onChange={f('salario_aspiracion')} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Fecha de nacimiento</label><Input type="date" value={form.fecha_nacimiento} onChange={f('fecha_nacimiento')} /></div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nivel de inglés</label>
                <SearchableSelect
                  options={[{ value: NONE, label: 'Sin especificar' }, ...LEVELS]}
                  value={form.nivel_ingles}
                  onValueChange={v => setForm(s => ({ ...s, nivel_ingles: v }))}
                />
              </div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Años de experiencia</label><Input type="number" min="0" step="any" value={form.anos_experiencia} onChange={f('anos_experiencia')} /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Dirección</label><Input value={form.direccion} onChange={f('direccion')} /></div>
              <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Notas</label><Textarea value={form.notes} onChange={f('notes')} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar candidato?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará de la base de candidatos. Los aspirantes ya registrados no se verán afectados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
