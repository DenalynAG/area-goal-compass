import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 10;

export const BLOQUE_OPTIONS = [
  { value: "A", label: "Bloque A", color: "bg-blue-600 hover:bg-blue-700 text-white" },
  { value: "B", label: "Bloque B", color: "bg-orange-500 hover:bg-orange-600 text-white" },
  { value: "C", label: "Bloque C", color: "bg-green-600 hover:bg-green-700 text-white" },
];

export function useHotelZones() {
  return useQuery({
    queryKey: ["hotel_zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_zones" as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export default function ZonasHotelTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: zones = [], isLoading } = useHotelZones();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [name, setName] = useState("");
  const [bloque, setBloque] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setName(""); setBloque(""); setDescription(""); setEditRecord(null);
  };

  const populate = (z: any) => {
    setEditRecord(z);
    setName(z.name || "");
    setBloque(z.bloque || "");
    setDescription(z.description || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("El nombre de la zona es obligatorio"); return; }
    setSaving(true);
    const payload: any = {
      name: name.trim(),
      bloque: bloque || null,
      description: description.trim() || null,
    };
    if (editRecord) {
      const { error } = await supabase.from("hotel_zones" as any).update(payload).eq("id", editRecord.id);
      setSaving(false);
      if (error) { toast.error("Error al actualizar la zona"); return; }
      toast.success("Zona actualizada");
    } else {
      payload.created_by = user?.id ?? null;
      const { error } = await supabase.from("hotel_zones" as any).insert(payload);
      setSaving(false);
      if (error) { toast.error("Error al registrar la zona"); return; }
      toast.success("Zona registrada");
    }
    qc.invalidateQueries({ queryKey: ["hotel_zones"] });
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("hotel_zones" as any).delete().eq("id", deleteId);
    if (error) { toast.error("Error al eliminar la zona"); return; }
    toast.success("Zona eliminada");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["hotel_zones"] });
  };

  const filtered = zones.filter((z: any) =>
    [z.name, z.bloque, z.description].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Zonas del Hotel ({filtered.length})
          </CardTitle>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Buscar zona o bloque..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="max-w-xs"
            />
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nueva Zona
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No hay zonas registradas</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zona</TableHead>
                    <TableHead>Bloque</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((z: any) => (
                    <TableRow key={z.id}>
                      <TableCell className="font-medium">{z.name}</TableCell>
                      <TableCell>
                        {z.bloque ? (
                          <Badge className={BLOQUE_OPTIONS.find((b) => b.value === z.bloque)?.color}>
                            Bloque {z.bloque}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{z.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Editar"
                            onClick={() => { populate(z); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Eliminar"
                            onClick={() => setDeleteId(z.id)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> {editRecord ? "Editar Zona" : "Nueva Zona del Hotel"}
            </DialogTitle>
            <DialogDescription>Las zonas se usan para autocompletar el campo Zona o Requerimiento y asignar el bloque.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Zona *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} placeholder="Ej: Lobby, Piso 3, Cocina Central" required />
            </div>
            <div className="space-y-2">
              <Label>Bloque</Label>
              <div className="flex gap-2">
                {BLOQUE_OPTIONS.map((b) => (
                  <Button key={b.value} type="button" size="sm"
                    className={bloque === b.value ? b.color : "bg-muted text-muted-foreground hover:bg-muted/80"}
                    onClick={() => setBloque(bloque === b.value ? "" : b.value)}>
                    {b.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
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
            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
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