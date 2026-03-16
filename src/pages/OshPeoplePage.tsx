import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Award,
  Plus,
  Star,
  Heart,
  Zap,
  Shield,
  Target,
  Users,
  Smile,
  HandHelping,
  Globe,
  MessageSquare,
  Flame,
  TrendingUp,
  Lightbulb,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "excelencia_sin_limites", label: "Excelencia sin Límites", icon: Star, color: "from-amber-500 to-yellow-400", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { key: "sello_de_calidad", label: "Sello de Calidad", icon: CheckCircle2, color: "from-emerald-500 to-green-400", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { key: "energia_positiva", label: "Energía Positiva", icon: Zap, color: "from-orange-500 to-amber-400", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { key: "esfuerzo_extra", label: "Esfuerzo Extra", icon: Flame, color: "from-red-500 to-rose-400", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  { key: "sinergia_en_accion", label: "Sinergia en Acción", icon: Users, color: "from-violet-500 to-purple-400", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  { key: "guardianes_inocuidad", label: "Guardianes de la Inocuidad", icon: Shield, color: "from-teal-500 to-cyan-400", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  { key: "planificacion_estrategica", label: "Planificación Estratégica", icon: Target, color: "from-blue-600 to-blue-400", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { key: "liderazgo_inspirador", label: "Liderazgo Inspirador", icon: Award, color: "from-indigo-500 to-blue-400", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  { key: "cultura_positiva", label: "Cultura Positiva", icon: Smile, color: "from-pink-500 to-rose-400", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  { key: "corazon_y_apoyo", label: "Corazón y Apoyo", icon: Heart, color: "from-rose-500 to-pink-400", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  { key: "embajador_mision_cero", label: "Embajador Misión Cero OSH", icon: Globe, color: "from-cyan-600 to-teal-400", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  { key: "comunicacion_que_conecta", label: "Comunicación que Conecta", icon: MessageSquare, color: "from-sky-500 to-blue-400", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  { key: "compromiso_inquebrantable", label: "Compromiso Inquebrantable", icon: HandHelping, color: "from-fuchsia-500 to-purple-400", bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200" },
  { key: "crecimiento_imparable", label: "Crecimiento Imparable", icon: TrendingUp, color: "from-lime-600 to-green-400", bg: "bg-lime-50", text: "text-lime-700", border: "border-lime-200" },
  { key: "mentes_innovadoras", label: "Mentes Innovadoras", icon: Lightbulb, color: "from-yellow-500 to-amber-400", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  { key: "tiempo_de_oro", label: "Tiempo de Oro", icon: Clock, color: "from-amber-600 to-yellow-500", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
];

const getCategoryMeta = (key: string) => CATEGORIES.find(c => c.key === key) || CATEGORIES[0];

interface RecognitionPost {
  id: string;
  category: string;
  nominee_user_id: string | null;
  nominated_by: string | null;
  message: string;
  created_at: string;
}

function useRecognitionPosts() {
  return useQuery({
    queryKey: ["recognition_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recognition_posts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RecognitionPost[];
    },
  });
}

export default function OshPeoplePage() {
  const { user, profile, isSuperAdmin, hasRole } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { data: posts = [], isLoading } = useRecognitionPosts();
  const qc = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [nomineeId, setNomineeId] = useState("");
  const [message, setMessage] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canCreate = isSuperAdmin || hasRole("admin_area") || hasRole("lider_subarea");

  const filteredPosts = useMemo(() => {
    if (!filterCategory) return posts;
    return posts.filter(p => p.category === filterCategory);
  }, [posts, filterCategory]);

  const getProfileName = (id: string | null) => {
    if (!id) return "";
    return profiles.find(p => p.id === id)?.name ?? "";
  };

  const getProfileAvatar = (id: string | null) => {
    if (!id) return null;
    const p = profiles.find(pr => pr.id === id);
    return p?.avatar || null;
  };

  const handleSave = async () => {
    if (!selectedCategory || !nomineeId) {
      toast.error("Selecciona categoría y colaborador");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("recognition_posts" as any).insert({
      category: selectedCategory,
      nominee_user_id: nomineeId,
      nominated_by: user?.id,
      message,
    } as any);
    if (error) {
      toast.error("Error al crear reconocimiento");
    } else {
      toast.success("¡Reconocimiento creado!");
      qc.invalidateQueries({ queryKey: ["recognition_posts"] });
      setDialogOpen(false);
      setSelectedCategory("");
      setNomineeId("");
      setMessage("");
    }
    setSaving(false);
  };

  const profileOptions = profiles.map(p => ({ value: p.id, label: p.name }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">OSH People</h1>
            <p className="text-sm text-muted-foreground">Programa de Reconocimiento de Colaboradores</p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo Reconocimiento
          </Button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
            !filterCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          )}
        >
          Todas
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilterCategory(filterCategory === cat.key ? null : cat.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5",
              filterCategory === cat.key
                ? `${cat.bg} ${cat.text} ${cat.border}`
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando reconocimientos...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay reconocimientos aún. ¡Sé el primero en reconocer a un compañero!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map(post => {
            const cat = getCategoryMeta(post.category);
            const CatIcon = cat.icon;
            const nomineeName = getProfileName(post.nominee_user_id);
            const nominatedByName = getProfileName(post.nominated_by);
            const nomineeAvatar = getProfileAvatar(post.nominee_user_id);
            const initials = nomineeName
              .split(" ")
              .map(n => n[0])
              .join("")
              .slice(0, 2);

            return (
              <div
                key={post.id}
                className={cn(
                  "rounded-xl border-2 bg-card overflow-hidden hover:shadow-lg transition-shadow",
                  cat.border
                )}
              >
                {/* Category header with gradient background */}
                <div className="relative px-4 pt-4 pb-8">
                  <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-br", cat.color)} />
                  <div className="relative flex items-center justify-between">
                    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold", cat.bg, cat.text)}>
                      <CatIcon className="w-3.5 h-3.5" />
                      {cat.label}
                    </span>
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br shadow-md", cat.color)}>
                      <Award className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-4 pb-4 -mt-4">
                  <div className="flex items-center gap-3 mb-2">
                    {nomineeAvatar ? (
                      <img src={nomineeAvatar} alt={nomineeName} className="w-10 h-10 rounded-full object-cover border-2 border-card shadow" />
                    ) : (
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-card shadow", cat.bg, cat.text)}>
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{nomineeName || "Colaborador"}</p>
                      <p className="text-xs text-muted-foreground">
                        Por {nominatedByName || "Anónimo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(post.created_at), "d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  </div>
                  {post.message && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.message}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Nuevo Reconocimiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Categoría</label>
              <SearchableSelect
                options={CATEGORIES.map(c => ({ value: c.key, label: c.label }))}
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                placeholder="Seleccionar categoría..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Colaborador</label>
              <SearchableSelect
                options={profileOptions}
                value={nomineeId}
                onValueChange={setNomineeId}
                placeholder="Seleccionar colaborador..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mensaje (opcional)</label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="¡Buen trabajo equipo!"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Crear Reconocimiento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
