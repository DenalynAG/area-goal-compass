import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Truck, ChevronLeft, ChevronRight, Upload, FileText, X } from "lucide-react";

const PAGE_SIZE = 10;

function useRecurringProviders() {
  return useQuery({
    queryKey: ["recurring_providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_providers" as any)
        .select("*")
        .order("company_name", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export default function ProveedoresRecurrentesTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: providers = [], isLoading } = useRecurringProviders();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [companyName, setCompanyName] = useState("");
  const [nit, setNit] = useState("");
  const [fullName, setFullName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [arlFile, setArlFile] = useState<File | null>(null);
  const [arlFileName, setArlFileName] = useState<string | null>(null);
  const [arlDocUrl, setArlDocUrl] = useState<string | null>(null);
  const arlInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setCompanyName(""); setNit("");
    setFullName(""); setDocumentId("");
    setArlFile(null); setArlFileName(null); setArlDocUrl(null);
    setEditRecord(null);
  };

  const populate = (r: any) => {
    setEditRecord(r);
    setCompanyName(r.company_name || "");
    setNit(r.nit || "");
    setFullName(r.full_name || "");
    setDocumentId(r.document_id || "");
    setArlDocUrl(r.arl_document_url || null);
    setArlFileName(r.arl_document_url ? (r.arl || "Soporte ARL existente") : null);
    setArlFile(null);
  };

  const handleArlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Solo se permiten archivos PDF"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("El archivo no puede superar 10MB"); return; }
    setArlFile(file);
    setArlFileName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !fullName.trim() || !documentId.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);

    let uploadedUrl: string | null = arlDocUrl;
    if (arlFile) {
      const filePath = `arl-proveedores/${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("evidencias")
        .upload(filePath, arlFile, { contentType: "application/pdf" });
      if (uploadErr) { toast.error("Error al subir soporte ARL"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(filePath);
      uploadedUrl = urlData.publicUrl;
    }

    const payload: any = {
      company_name: companyName.trim(),
      nit: nit.trim() || null,
      contact_name: null,
      full_name: fullName.trim(),
      document_id: documentId.trim(),
      arl: arlFileName || null,
      arl_document_url: uploadedUrl,
    };

    if (editRecord) {
      const { error } = await supabase.from("recurring_providers" as any).update(payload).eq("id", editRecord.id);
      setSaving(false);
      if (error) { toast.error("Error al actualizar proveedor"); return; }
      toast.success("Proveedor actualizado");
    } else {
      payload.created_by = user?.id ?? null;
      const { error } = await supabase.from("recurring_providers" as any).insert(payload);
      setSaving(false);
      if (error) { toast.error("Error al registrar proveedor"); return; }
      toast.success("Proveedor registrado");
    }
    qc.invalidateQueries({ queryKey: ["recurring_providers"] });
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("recurring_providers" as any).delete().eq("id", deleteId);
    if (error) { toast.error("Error al eliminar proveedor"); return; }
    toast.success("Proveedor eliminado");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["recurring_providers"] });
  };

  const filtered = providers.filter((p: any) =>
    [p.company_name, p.nit, p.full_name, p.document_id, p.arl]
      .filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" /> Proveedores Recurrentes ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Buscar empresa, NIT, documento..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay proveedores registrados</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre Empresa</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Nombre y Apellido</TableHead>
                    <TableHead>Documento de Identidad</TableHead>
                    <TableHead>ARL</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.company_name}</TableCell>
                      <TableCell>{p.nit || "—"}</TableCell>
                      <TableCell>{p.full_name}</TableCell>
                      <TableCell>{p.document_id}</TableCell>
                      <TableCell>
                        {p.arl_document_url ? (
                          <a href={p.arl_document_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                            <FileText className="h-4 w-4" /> Ver PDF
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                            onClick={() => { populate(p); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Eliminar"
                            onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                  <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> {editRecord ? "Editar Proveedor" : "Nuevo Proveedor Recurrente"}
            </DialogTitle>
            <DialogDescription>Datos del proveedor recurrente para el Control de Acceso Interno</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Empresa *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={150} required />
              </div>
              <div className="space-y-2">
                <Label>NIT</Label>
                <Input value={nit} onChange={(e) => setNit(e.target.value)} maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label>Nombre y Apellido *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={150} required />
              </div>
              <div className="space-y-2">
                <Label>Documento de Identidad *</Label>
                <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} maxLength={50} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>ARL (Adjuntar PDF)</Label>
                <input ref={arlInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleArlFileChange} />
                {arlFileName ? (
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm flex-1 truncate">{arlFileName}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => { setArlFile(null); setArlFileName(null); setArlDocUrl(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full max-w-xs h-12 border-dashed flex items-center gap-2"
                    onClick={() => arlInputRef.current?.click()}>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Subir soporte ARL en PDF</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : editRecord ? "Actualizar" : "Registrar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
