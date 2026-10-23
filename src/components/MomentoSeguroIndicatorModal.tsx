import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, Eye } from "lucide-react";

const NONE = "__none__";

// Estructura mínima de una observación de Momento Seguro usada por el modal
export interface IndicatorObservation {
  id: string;
  observation_date: string;
  observation_time: string | null;
  hotel_area: string | null;
  area_id: string | null;
  process: string | null;
  activity_observed: string | null;
  observed_name: string | null;
  observed_position: string | null;
  observer_name: string | null;
  description: string;
  category: string;
  risk_level: string;
  status: string;
  location: string | null;
  hazard: string | null;
  associated_risk: string | null;
  [key: string]: unknown;
}

const CATEGORY_LABEL: Record<string, { label: string; chip: string }> = {
  comportamiento_seguro: { label: "Seguro", chip: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" },
  oportunidad_mejora: { label: "Mejora", chip: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" },
  comportamiento_inseguro: { label: "Inseguro", chip: "bg-destructive/15 text-destructive" },
};

const RISK_LABEL: Record<string, { label: string; chip: string }> = {
  bajo: { label: "Bajo", chip: "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]" },
  medio: { label: "Medio", chip: "bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]" },
  alto: { label: "Alto", chip: "bg-destructive/10 text-destructive" },
  critico: { label: "Crítico", chip: "bg-destructive/15 text-destructive" },
};

const STATE_OPTIONS = [
  { value: NONE, label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_proceso", label: "En proceso" },
  { value: "cerrado", label: "Cerrado" },
  { value: "vencido", label: "Vencido" },
];

export interface ActionState {
  label: string;
  chip: string;
  key: "pendiente" | "en_proceso" | "cerrado" | "vencido";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  records: IndicatorObservation[];
  codeOf: Map<string, string>;
  areaLabel: (o: IndicatorObservation) => string;
  actionStatus: (o: IndicatorObservation) => ActionState;
  onViewDetail: (o: IndicatorObservation) => void;
  summary?: React.ReactNode;
  showStateFilter?: boolean;
}

const PAGE_SIZE = 10;

export default function MomentoSeguroIndicatorModal({
  open, onOpenChange, title, records, codeOf, areaLabel, actionStatus,
  onViewDetail, summary, showStateFilter = true,
}: Props) {
  const [q, setQ] = useState("");
  const [fState, setFState] = useState(NONE);
  const [page, setPage] = useState(1);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return records.filter((o) => {
      if (showStateFilter && fState !== NONE && actionStatus(o).key !== fState) return false;
      if (query) {
        const hay = [
          codeOf.get(o.id), o.observed_name, o.observer_name, o.description,
          o.process, o.activity_observed, o.location, o.hazard, o.associated_risk,
          areaLabel(o),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [records, q, fState, showStateFilter, codeOf, areaLabel, actionStatus]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const close = (v: boolean) => {
    if (!v) { setQ(""); setFState(NONE); setPage(1); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {records.length} {records.length === 1 ? "registro" : "registros"} en este indicador
          </DialogDescription>
        </DialogHeader>

        {summary}

        {records.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No hay registros para este indicador
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por código, colaborador, descripción..."
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                />
              </div>
              {showStateFilter && (
                <div className="sm:w-52">
                  <SearchableSelect
                    value={fState}
                    onValueChange={(v) => { setFState(v); setPage(1); }}
                    options={STATE_OPTIONS}
                    placeholder="Estado"
                  />
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Código</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Área</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Actividad / Proceso</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Colaborador</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Riesgo</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((o) => {
                    const st = actionStatus(o);
                    const cat = CATEGORY_LABEL[o.category];
                    const risk = RISK_LABEL[o.risk_level];
                    return (
                      <tr
                        key={o.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => onViewDetail(o)}
                      >
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{codeOf.get(o.id) ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {o.observation_date}{o.observation_time ? ` ${o.observation_time.slice(0, 5)}` : ""}
                        </td>
                        <td className="px-3 py-2">{areaLabel(o)}</td>
                        <td className="px-3 py-2 max-w-[220px] truncate">
                          {o.activity_observed || o.process || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {o.observed_name ?? "—"}
                          {o.observed_position && (
                            <span className="block text-[11px] text-muted-foreground">{o.observed_position}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {cat && <Badge className={`${cat.chip} border-0`}>{cat.label}</Badge>}
                        </td>
                        <td className="px-3 py-2">
                          {risk && <Badge className={`${risk.chip} border-0`}>{risk.label}</Badge>}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={`${st.chip} border-0`}>{st.label}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="ghost" size="icon" title="Ver detalle"
                            onClick={(e) => { e.stopPropagation(); onViewDetail(o); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                        Sin resultados para la búsqueda o el filtro aplicado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Página {safePage} de {totalPages} · {visible.length} registros
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                  </Button>
                  <Button
                    variant="outline" size="sm" disabled={safePage === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
