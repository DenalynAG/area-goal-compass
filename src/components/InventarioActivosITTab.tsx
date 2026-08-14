import { useState, useMemo, useRef, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Database, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

function useCollaborators() {
  return useQuery({
    queryKey: ["profiles_it_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, position")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

function useItInventory() {
  return useQuery({
    queryKey: ["it_asset_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("it_asset_inventory" as any)
        .select("*")
        .order("collaborator_name", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export default function InventarioActivosITTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useItInventory();
  const { data: collaborators = [] } = useCollaborators();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [collaborator, setCollaborator] = useState("");
  const [position, setPosition] = useState("");
  const [asset, setAsset] = useState("");
  const [serial, setSerial] = useState("");
  const [oshCode, setOshCode] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = collaborator.trim().toLowerCase();
    if (q.length < 2) return [];
    return collaborators
      .filter((c: any) => (c.name || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [collaborator, collaborators]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const resetForm = () => {
    setCollaborator(""); setPosition(""); setAsset(""); setSerial(""); setOshCode("");
    setEditRecord(null); setShowSuggestions(false);
  };

  const populate = (r: any) => {
    setEditRecord(r);
    setCollaborator(r.collaborator_name || "");
    setPosition(r.position_name || "");
    setAsset(r.asset_name || "");
    setSerial(r.serial_number || "");
    setOshCode(r.osh_code || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collaborator.trim() || !asset.trim()) {
      toast.error("Completa colaborador y activo IT");
      return;
    }
    setSaving(true);
    const payload: any = {
      collaborator_name: collaborator.trim(),
      position_name: position.trim() || null,
      asset_name: asset.trim(),
      serial_number: serial.trim() || null,
      osh_code: oshCode.trim() || null,
    };

    if (editRecord) {
      const { error } = await supabase.from("it_asset_inventory" as any).update(payload).eq("id", editRecord.id);
      setSaving(false);
      if (error) { toast.error("Error al actualizar activo"); return; }
      toast.success("Activo actualizado");
    } else {
      payload.created_by = user?.id ?? null;
      const { error } = await supabase.from("it_asset_inventory" as any).insert(payload);
      setSaving(false);
      if (error) { toast.error("Error al registrar activo"); return; }
      toast.success("Activo registrado");
    }
    qc.invalidateQueries({ queryKey: ["it_asset_inventory"] });
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("it_asset_inventory" as any).delete().eq("id", deleteId);
    if (error) { toast.error("Error al eliminar activo"); return; }
    toast.success("Activo eliminado");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["it_asset_inventory"] });
  };

  const filtered = items.filter((i: any) =>
    [i.collaborator_name, i.position_name, i.asset_name, i.serial_number, i.osh_code]
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
            <Database className="h-5 w-5" /> Inventario de Activos IT ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Buscar colaborador, activo, serial, código OSH..."
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
          <p className="text-muted-foreground text-center py-8">No hay activos registrados</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Activo IT</TableHead>
                    <TableHead>Serial Nro.</TableHead>
                    <TableHead>Código OSH</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.collaborator_name}</TableCell>
                      <TableCell>{i.position_name || "—"}</TableCell>
                      <TableCell>{i.asset_name}</TableCell>
                      <TableCell>{i.serial_number || "—"}</TableCell>
                      <TableCell>{i.osh_code || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                            onClick={() => { populate(i); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Eliminar"
                            onClick={() => setDeleteId(i.id)}>
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
              <Database className="h-5 w-5" /> {editRecord ? "Editar Activo IT" : "Nuevo Activo IT"}
            </DialogTitle>
            <DialogDescription>Base de datos de inventario de activos IT</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative" ref={suggestionsRef}>
                <Label>Colaborador *</Label>
                <Input
                  value={collaborator}
                  onChange={(e) => { setCollaborator(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Escribe para buscar en colaboradores..."
                  autoComplete="off"
                  maxLength={150}
                  required
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-56 overflow-y-auto">
                    {suggestions.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          setCollaborator(c.name || "");
                          setPosition(c.position || "");
                          setShowSuggestions(false);
                        }}
                      >
                        <span className="font-medium">{c.name}</span>
                        {c.position && <span className="text-muted-foreground"> — {c.position}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label>Activo IT *</Label>
                <Input value={asset} onChange={(e) => setAsset(e.target.value)} maxLength={150} required />
              </div>
              <div className="space-y-2">
                <Label>Serial Nro.</Label>
                <Input value={serial} onChange={(e) => setSerial(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Código OSH</Label>
                <Input value={oshCode} onChange={(e) => setOshCode(e.target.value)} maxLength={100} />
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
