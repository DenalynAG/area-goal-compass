import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package, ChevronLeft, ChevronRight, LogOut as LogOutIcon } from "lucide-react";

const PAGE_SIZE = 10;

function useProviderAssets() {
  return useQuery({
    queryKey: ["provider_assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_assets" as any)
        .select("*")
        .order("entry_datetime", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

function useProvidersList() {
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

const toLocalInput = (iso?: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "");

export default function ActivosProveedoresTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: assets = [], isLoading } = useProviderAssets();
  const { data: providers = [] } = useProvidersList();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [companyName, setCompanyName] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [assetType, setAssetType] = useState("");
  const [brand, setBrand] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [entryDatetime, setEntryDatetime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [exitDatetime, setExitDatetime] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setCompanyName(""); setProviderName(""); setDocumentId("");
    setAssetType(""); setBrand(""); setSerialNumber(""); setQuantity("1");
    setEntryDatetime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setExitDatetime(""); setNotes(""); setEditRecord(null); setShowSuggestions(false);
  };

  const populate = (r: any) => {
    setEditRecord(r);
    setCompanyName(r.company_name || "");
    setProviderName(r.provider_name || "");
    setDocumentId(r.document_id || "");
    setAssetType(r.asset_type || "");
    setBrand(r.brand || "");
    setSerialNumber(r.serial_number || "");
    setQuantity(String(r.quantity ?? 1));
    setEntryDatetime(toLocalInput(r.entry_datetime));
    setExitDatetime(toLocalInput(r.exit_datetime));
    setNotes(r.notes || "");
  };

  const companySuggestions = companyName.trim().length >= 2
    ? providers.filter((p: any) => (p.company_name || "").toLowerCase().includes(companyName.toLowerCase())).slice(0, 6)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !providerName.trim() || !assetType.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);
    const payload: any = {
      company_name: companyName.trim(),
      provider_name: providerName.trim(),
      document_id: documentId.trim() || null,
      asset_type: assetType.trim(),
      brand: brand.trim() || null,
      serial_number: serialNumber.trim() || null,
      quantity: Number(quantity) || 1,
      entry_datetime: entryDatetime ? new Date(entryDatetime).toISOString() : new Date().toISOString(),
      exit_datetime: exitDatetime ? new Date(exitDatetime).toISOString() : null,
      notes: notes.trim() || null,
    };

    if (editRecord) {
      const { error } = await supabase.from("provider_assets" as any).update(payload).eq("id", editRecord.id);
      setSaving(false);
      if (error) { toast.error("Error al actualizar el activo"); return; }
      toast.success("Activo actualizado");
    } else {
      payload.created_by = user?.id ?? null;
      const { error } = await supabase.from("provider_assets" as any).insert(payload);
      setSaving(false);
      if (error) { toast.error("Error al registrar el activo"); return; }
      toast.success("Activo registrado");
    }
    qc.invalidateQueries({ queryKey: ["provider_assets"] });
    resetForm();
    setDialogOpen(false);
  };

  const registerExit = async (r: any) => {
    const { error } = await supabase
      .from("provider_assets" as any)
      .update({ exit_datetime: new Date().toISOString() })
      .eq("id", r.id);
    if (error) { toast.error("Error al registrar la salida"); return; }
    toast.success("Salida registrada");
    qc.invalidateQueries({ queryKey: ["provider_assets"] });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("provider_assets" as any).delete().eq("id", deleteId);
    if (error) { toast.error("Error al eliminar el activo"); return; }
    toast.success("Activo eliminado");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["provider_assets"] });
  };

  const filtered = assets.filter((a: any) =>
    [a.company_name, a.provider_name, a.document_id, a.asset_type, a.brand, a.serial_number]
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
            <Package className="h-5 w-5" /> Activos de Proveedores ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Buscar empresa, activo, serial..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Activo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay activos de proveedores registrados</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Salida</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.company_name}</TableCell>
                      <TableCell>{a.provider_name}</TableCell>
                      <TableCell>{a.asset_type}</TableCell>
                      <TableCell>{a.brand || "—"}</TableCell>
                      <TableCell>{a.serial_number || "—"}</TableCell>
                      <TableCell>{a.quantity}</TableCell>
                      <TableCell>{a.entry_datetime ? format(new Date(a.entry_datetime), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                      <TableCell>
                        {a.exit_datetime
                          ? format(new Date(a.exit_datetime), "dd/MM/yyyy HH:mm")
                          : <Badge variant="secondary">Dentro</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!a.exit_datetime && (
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Registrar salida"
                              onClick={() => registerExit(a)}>
                              <LogOutIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                            onClick={() => { populate(a); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Eliminar"
                            onClick={() => setDeleteId(a.id)}>
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
              <Package className="h-5 w-5" /> {editRecord ? "Editar Activo de Proveedor" : "Nuevo Activo de Proveedor"}
            </DialogTitle>
            <DialogDescription>Registro de equipos y herramientas que ingresan los proveedores</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label>Nombre Empresa *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  maxLength={150}
                  required
                />
                {showSuggestions && companySuggestions.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md max-h-56 overflow-y-auto">
                    {companySuggestions.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          setCompanyName(p.company_name || "");
                          setProviderName(p.full_name || "");
                          setDocumentId(p.document_id || "");
                          setShowSuggestions(false);
                        }}
                      >
                        <span className="font-medium">{p.company_name}</span>
                        <span className="text-muted-foreground"> · {p.full_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Nombre y Apellido del Proveedor *</Label>
                <Input value={providerName} onChange={(e) => setProviderName(e.target.value)} maxLength={150} required />
              </div>
              <div className="space-y-2">
                <Label>Documento de Identidad</Label>
                <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label>Activo / Equipo *</Label>
                <Input value={assetType} onChange={(e) => setAssetType(e.target.value)} maxLength={150} required />
              </div>
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Serial Nro.</Label>
                <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha y hora de ingreso *</Label>
                <Input type="datetime-local" value={entryDatetime} onChange={(e) => setEntryDatetime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Fecha y hora de salida</Label>
                <Input type="datetime-local" value={exitDatetime} onChange={(e) => setExitDatetime(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observaciones</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} />
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
            <AlertDialogTitle>¿Eliminar activo?</AlertDialogTitle>
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
