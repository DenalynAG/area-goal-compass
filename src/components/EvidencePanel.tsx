import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEvidences, type Evidence } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, FileText, Image, FileSpreadsheet, Check, X, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Props {
  entityType: 'objective' | 'kpi' | 'leader_pass';
  entityId: string;
  entityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  image: Image,
  excel: FileSpreadsheet,
};

function getFileCategory(type: string | null): string {
  if (!type) return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return 'excel';
  return 'pdf';
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; className: string }> = {
  pendiente: { icon: Clock, label: 'Pendiente', className: 'text-warning bg-warning/10' },
  aprobada: { icon: CheckCircle, label: 'Aprobada', className: 'text-green-600 bg-green-50' },
  rechazada: { icon: XCircle, label: 'Rechazada', className: 'text-destructive bg-destructive/10' },
};

export default function EvidencePanel({ entityType, entityId, entityName, open, onOpenChange }: Props) {
  const { user, profile, isSuperAdmin, hasRole } = useAuth();
  const qc = useQueryClient();
  const { data: evidences = [], isLoading } = useEvidences(entityType, entityId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'aprobada' | 'rechazada'>('aprobada');

  const canUpload = hasRole('admin_area') || hasRole('lider_subarea') || isSuperAdmin;
  const canReview = isSuperAdmin;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }

        const filePath = `${entityType}/${entityId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Error subiendo ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { error: insertError } = await supabase.from('evidences').insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          uploaded_by_name: profile?.name ?? user.email,
        });

        if (insertError) {
          toast.error(`Error registrando ${file.name}: ${insertError.message}`);
        }
      }
      toast.success('Evidencia(s) cargada(s)');
      qc.invalidateQueries({ queryKey: ['evidences'] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReview = async (evidenceId: string, status: 'aprobada' | 'rechazada') => {
    if (!user) return;
    const { error } = await supabase.from('evidences').update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes.trim() || null,
    }).eq('id', evidenceId);

    if (error) { toast.error(error.message); return; }
    toast.success(`Evidencia ${status}`);
    setReviewingId(null);
    setReviewNotes('');
    qc.invalidateQueries({ queryKey: ['evidences'] });
  };

  const handleDelete = async (ev: Evidence) => {
    await supabase.storage.from('evidencias').remove([ev.file_path]);
    const { error } = await supabase.from('evidences').delete().eq('id', ev.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Evidencia eliminada');
    qc.invalidateQueries({ queryKey: ['evidences'] });
  };

  const handleDownload = async (ev: Evidence) => {
    const { data, error } = await supabase.storage.from('evidencias').createSignedUrl(ev.file_path, 300);
    if (error || !data?.signedUrl) { toast.error('No se pudo obtener el archivo'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Evidencias — {entityName}
          </DialogTitle>
        </DialogHeader>

        {/* Upload area */}
        {canUpload && (
          <div className="border-2 border-dashed rounded-lg p-4 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Subiendo...' : 'Cargar evidencia'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">PDF, Excel, Imágenes · Máx. 10MB</p>
          </div>
        )}

        {/* Evidence list */}
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>}

          {!isLoading && evidences.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No hay evidencias cargadas</p>
          )}

          {evidences.map(ev => {
            const category = getFileCategory(ev.file_type);
            const IconComp = FILE_ICONS[category] ?? FileText;
            const statusConf = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.pendiente;
            const StatusIcon = statusConf.icon;
            const isReviewing = reviewingId === ev.id;

            return (
              <div key={ev.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-3">
                  <IconComp className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <button onClick={() => handleDownload(ev)} className="text-sm font-medium hover:underline text-left truncate block w-full">
                      {ev.file_name}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {ev.uploaded_by_name} · {new Date(ev.created_at).toLocaleDateString('es')} · {formatSize(ev.file_size)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConf.label}
                  </span>
                </div>

                {ev.review_notes && (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
                    <span className="font-medium">Nota:</span> {ev.review_notes}
                  </p>
                )}

                {/* Review controls (Super Admin only) */}
                {canReview && ev.status === 'pendiente' && !isReviewing && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setReviewingId(ev.id); setReviewAction('aprobada'); }}>
                      <Check className="w-3 h-3" /> Aprobar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={() => { setReviewingId(ev.id); setReviewAction('rechazada'); }}>
                      <X className="w-3 h-3" /> Rechazar
                    </Button>
                  </div>
                )}

                {isReviewing && (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      placeholder="Nota de revisión (opcional)"
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={() => handleReview(ev.id, reviewAction)}>
                        Confirmar {reviewAction === 'aprobada' ? 'Aprobación' : 'Rechazo'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReviewingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Delete own pending evidence */}
                {ev.uploaded_by === user?.id && ev.status === 'pendiente' && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive gap-1" onClick={() => handleDelete(ev)}>
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
