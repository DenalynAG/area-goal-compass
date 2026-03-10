import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useSupabaseData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Map, Building, Plus, CheckCircle, Clock, Loader2, CheckSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TOWERS = ["A", "B", "C"];
const FLOORS = [1, 2, 3, 4, 5];
const TASK_TYPES = [
  { value: "limpieza", label: "Limpieza General" },
  { value: "checkout", label: "Checkout / Salida" },
  { value: "inspeccion", label: "Inspección" },
];

function useComfortRooms() {
  return useQuery({
    queryKey: ["comfort_rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comfort_rooms" as any)
        .select("*")
        .eq("status", "activo")
        .order("room_number");
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

function useComfortAssignments(date: string) {
  return useQuery({
    queryKey: ["comfort_assignments", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comfort_assignments" as any)
        .select("*")
        .eq("assignment_date", date);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export default function ComfortMapPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profiles = [] } = useProfiles();
  const { data: rooms = [] } = useComfortRooms();

  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTower, setSelectedTower] = useState("A");
  const { data: assignments = [] } = useComfortAssignments(selectedDate);

  // Single room dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [taskType, setTaskType] = useState("limpieza");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Bulk selection mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkUserId, setBulkUserId] = useState("");
  const [bulkTaskType, setBulkTaskType] = useState("limpieza");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const roomsByTowerFloor = useMemo(() => {
    const map: Record<string, Record<number, any[]>> = {};
    for (const t of TOWERS) {
      map[t] = {};
      for (const f of FLOORS) {
        map[t][f] = rooms.filter((r: any) => r.tower === t && r.floor === f);
      }
    }
    return map;
  }, [rooms]);

  const getAssignmentsForRoom = (roomId: string) =>
    assignments.filter((a: any) => a.room_id === roomId);

  const getRoomStatus = (roomId: string) => {
    const ra = getAssignmentsForRoom(roomId);
    if (ra.length === 0) return "sin_asignar";
    if (ra.every((a: any) => a.status === "completada")) return "completada";
    if (ra.some((a: any) => a.status === "en_progreso")) return "en_progreso";
    return "pendiente";
  };

  const statusColors: Record<string, string> = {
    sin_asignar: "bg-muted text-muted-foreground border-border",
    pendiente: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
    en_progreso: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    completada: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  };

  const statusLabels: Record<string, string> = {
    sin_asignar: "Sin asignar",
    pendiente: "Pendiente",
    en_progreso: "En progreso",
    completada: "Completada",
  };

  const getProfileName = (id: string | null) => profiles.find((p) => p.id === id)?.name || "—";

  // Single room actions
  const openAssignDialog = (room: any) => {
    if (bulkMode) {
      toggleRoomSelection(room.id);
      return;
    }
    setSelectedRoom(room);
    setAssignUserId("");
    setTaskType("limpieza");
    setNotes("");
    setDialogOpen(true);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || !selectedRoom) {
      toast.error("Selecciona una auxiliar");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("comfort_assignments" as any).insert({
      assignment_date: selectedDate,
      room_id: selectedRoom.id,
      assigned_user_id: assignUserId,
      task_type: taskType,
      notes: notes.trim(),
      created_by: user?.id,
    } as any);
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Esta tarea ya está asignada para esta habitación hoy");
      else toast.error("Error al asignar");
      return;
    }
    toast.success(`Tarea asignada a ${getProfileName(assignUserId)}`);
    qc.invalidateQueries({ queryKey: ["comfort_assignments", selectedDate] });
    setDialogOpen(false);
  };

  const handleToggleStatus = async (assignment: any) => {
    const nextStatus = assignment.status === "pendiente"
      ? "en_progreso"
      : assignment.status === "en_progreso"
        ? "completada"
        : "pendiente";
    const update: any = { status: nextStatus };
    if (nextStatus === "completada") update.completed_at = new Date().toISOString();
    else update.completed_at = null;
    const { error } = await supabase
      .from("comfort_assignments" as any)
      .update(update)
      .eq("id", assignment.id);
    if (error) { toast.error("Error al actualizar"); return; }
    qc.invalidateQueries({ queryKey: ["comfort_assignments", selectedDate] });
  };

  // Bulk selection
  const toggleRoomSelection = (roomId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  };

  const selectFloor = (tower: string, floor: number) => {
    const floorRooms = roomsByTowerFloor[tower]?.[floor] || [];
    const floorIds = floorRooms.map((r: any) => r.id);
    const allSelected = floorIds.every((id: string) => selectedRoomIds.has(id));
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      floorIds.forEach((id: string) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedRoomIds(new Set());
  };

  const openBulkDialog = () => {
    if (selectedRoomIds.size === 0) {
      toast.error("Selecciona al menos una habitación");
      return;
    }
    setBulkUserId("");
    setBulkTaskType("limpieza");
    setBulkNotes("");
    setBulkDialogOpen(true);
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUserId) {
      toast.error("Selecciona una auxiliar");
      return;
    }
    setBulkSaving(true);
    const rows = Array.from(selectedRoomIds).map((roomId) => ({
      assignment_date: selectedDate,
      room_id: roomId,
      assigned_user_id: bulkUserId,
      task_type: bulkTaskType,
      notes: bulkNotes.trim(),
      created_by: user?.id,
    }));

    const { error } = await supabase.from("comfort_assignments" as any).insert(rows as any);
    setBulkSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Algunas habitaciones ya tienen esta tarea asignada hoy");
      else toast.error("Error al asignar");
      return;
    }
    toast.success(`${selectedRoomIds.size} habitaciones asignadas a ${getProfileName(bulkUserId)}`);
    qc.invalidateQueries({ queryKey: ["comfort_assignments", selectedDate] });
    setBulkDialogOpen(false);
    exitBulkMode();
  };

  // Stats
  const towerRooms = roomsByTowerFloor[selectedTower] || {};
  const totalRooms = Object.values(towerRooms).flat().length;
  const assignedRooms = Object.values(towerRooms).flat().filter((r: any) => getRoomStatus(r.id) !== "sin_asignar").length;
  const completedRooms = Object.values(towerRooms).flat().filter((r: any) => getRoomStatus(r.id) === "completada").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Map className="h-6 w-6" /> OSH Comfort Map
          </h1>
          <p className="text-muted-foreground text-sm">Distribución y asignación de tareas por habitación</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="whitespace-nowrap text-sm">Fecha:</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          {bulkMode ? (
            <>
              <Button variant="default" size="sm" onClick={openBulkDialog} disabled={selectedRoomIds.size === 0}>
                <Plus className="h-4 w-4 mr-1" /> Asignar {selectedRoomIds.size > 0 ? `(${selectedRoomIds.size})` : ""}
              </Button>
              <Button variant="outline" size="sm" onClick={exitBulkMode}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setBulkMode(true)}>
              <CheckSquare className="h-4 w-4 mr-1" /> Selección Masiva
            </Button>
          )}
        </div>
      </div>

      {/* Bulk mode banner */}
      {bulkMode && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-foreground">
            <strong>Modo selección masiva:</strong> Haz clic en las habitaciones para seleccionarlas. Usa los botones de piso para seleccionar pisos completos.
          </p>
          <Badge variant="secondary">{selectedRoomIds.size} seleccionadas</Badge>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalRooms}</p>
          <p className="text-xs text-muted-foreground">Total Habitaciones</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{assignedRooms}</p>
          <p className="text-xs text-muted-foreground">Asignadas</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{completedRooms}</p>
          <p className="text-xs text-muted-foreground">Completadas</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalRooms - assignedRooms}</p>
          <p className="text-xs text-muted-foreground">Sin Asignar</p>
        </CardContent></Card>
      </div>

      {/* Tower Tabs */}
      <Tabs value={selectedTower} onValueChange={setSelectedTower}>
        <TabsList className="grid w-full grid-cols-3 max-w-xs">
          {TOWERS.map((t) => (
            <TabsTrigger key={t} value={t} className="flex items-center gap-1">
              <Building className="h-4 w-4" /> Torre {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {TOWERS.map((tower) => (
          <TabsContent key={tower} value={tower} className="space-y-4 mt-4">
            {FLOORS.map((floor) => {
              const floorRooms = roomsByTowerFloor[tower]?.[floor] || [];
              if (floorRooms.length === 0) return null;
              const floorIds = floorRooms.map((r: any) => r.id);
              const allFloorSelected = bulkMode && floorIds.every((id: string) => selectedRoomIds.has(id));
              return (
                <Card key={floor}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      Piso {floor}
                      {bulkMode && (
                        <Button
                          size="sm"
                          variant={allFloorSelected ? "default" : "outline"}
                          className="h-6 text-xs px-2"
                          onClick={() => selectFloor(tower, floor)}
                        >
                          {allFloorSelected ? "Deseleccionar piso" : "Seleccionar piso"}
                        </Button>
                      )}
                      <Badge variant="outline" className="ml-auto text-xs">
                        {floorRooms.filter((r: any) => getRoomStatus(r.id) !== "sin_asignar").length}/{floorRooms.length} asignadas
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-2">
                      {floorRooms.map((room: any) => {
                        const status = getRoomStatus(room.id);
                        const roomAssignments = getAssignmentsForRoom(room.id);
                        const isSelected = bulkMode && selectedRoomIds.has(room.id);
                        return (
                          <button
                            key={room.id}
                            onClick={() => openAssignDialog(room)}
                            className={cn(
                              "relative rounded-lg border p-2 text-center transition-all hover:shadow-md hover:scale-105 cursor-pointer min-h-[60px] flex flex-col items-center justify-center gap-0.5",
                              isSelected
                                ? "ring-2 ring-primary border-primary bg-primary/10 text-primary"
                                : statusColors[status]
                            )}
                            title={`${room.room_number} — ${statusLabels[status]}`}
                          >
                            {isSelected && (
                              <CheckCircle className="absolute top-1 right-1 h-3 w-3 text-primary" />
                            )}
                            <span className="font-bold text-xs">{room.room_number}</span>
                            {roomAssignments.length > 0 && (
                              <div className="flex gap-0.5 mt-0.5">
                                {roomAssignments.map((a: any) => (
                                  <span
                                    key={a.id}
                                    className={cn(
                                      "w-2 h-2 rounded-full",
                                      a.status === "completada" ? "bg-emerald-500" :
                                      a.status === "en_progreso" ? "bg-blue-500" : "bg-amber-500"
                                    )}
                                  />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("w-3 h-3 rounded border", statusColors[key])} />
            {label}
          </div>
        ))}
      </div>

      {/* Single Room Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Habitación {selectedRoom?.room_number} — Torre {selectedRoom?.tower}, Piso {selectedRoom?.floor}
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && getAssignmentsForRoom(selectedRoom.id).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tareas asignadas</Label>
              {getAssignmentsForRoom(selectedRoom.id).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-2 text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{TASK_TYPES.find(t => t.value === a.task_type)?.label}</span>
                    <span className="text-muted-foreground"> — {getProfileName(a.assigned_user_id)}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={a.status === "completada" ? "default" : "outline"}
                    onClick={() => handleToggleStatus(a)}
                    className="shrink-0"
                  >
                    {a.status === "pendiente" && <><Clock className="h-3 w-3 mr-1" />Iniciar</>}
                    {a.status === "en_progreso" && <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Completar</>}
                    {a.status === "completada" && <><CheckCircle className="h-3 w-3 mr-1" />Hecho</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAssign} className="space-y-4 border-t pt-4">
            <Label className="text-sm font-semibold">Nueva asignación</Label>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Auxiliar *</Label>
                <SearchableSelect
                  options={profiles.map((p) => ({ value: p.id, label: `${p.name}${p.position ? ` — ${p.position}` : ""}` }))}
                  value={assignUserId}
                  onValueChange={setAssignUserId}
                  placeholder="Buscar auxiliar"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Tarea *</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Instrucciones adicionales..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cerrar</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Asignando..." : <><Plus className="h-4 w-4 mr-1" />Asignar</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Asignación Masiva — {selectedRoomIds.size} habitaciones
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {Array.from(selectedRoomIds).map((id) => {
              const room = rooms.find((r: any) => r.id === id);
              return room ? (
                <Badge key={id} variant="secondary" className="text-xs">{room.room_number}</Badge>
              ) : null;
            })}
          </div>
          <form onSubmit={handleBulkAssign} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Auxiliar *</Label>
                <SearchableSelect
                  options={profiles.map((p) => ({ value: p.id, label: `${p.name}${p.position ? ` — ${p.position}` : ""}` }))}
                  value={bulkUserId}
                  onValueChange={setBulkUserId}
                  placeholder="Buscar auxiliar"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Tarea *</Label>
                <Select value={bulkTaskType} onValueChange={setBulkTaskType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} rows={2} placeholder="Instrucciones para todas las habitaciones..." />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={bulkSaving}>
                {bulkSaving ? "Asignando..." : `Asignar ${selectedRoomIds.size} habitaciones`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
