import { useState } from "react";
import {
  useProfiles,
  useNewsletterPosts,
  useAreas,
  useMemberships,
  getAreaNameFromList,
} from "@/hooks/useSupabaseData";
import { Award, Cake, Megaphone, Users, Plus, Pencil } from "lucide-react";
import { format, isSameMonth, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import NewsletterPostFormDialog from "@/components/NewsletterPostFormDialog";

export default function NewsletterPortalPage() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: posts = [] } = useNewsletterPosts();
  const { data: areas = [] } = useAreas();
  const { data: memberships = [] } = useMemberships();
  const { hasRole } = useAuth();
  const canManage = hasRole("super_admin") || hasRole("admin_area");

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);

  const today = new Date();

  // Birthdays this month
  const birthdaysThisMonth = profiles
    .filter((p) => {
      if (!p.birthday) return false;
      const bd = parseISO(p.birthday);
      return bd.getMonth() === today.getMonth();
    })
    .sort((a, b) => {
      const da = parseISO(a.birthday!).getDate();
      const db = parseISO(b.birthday!).getDate();
      return da - db;
    });

  const recognitions = posts.filter((p) => p.type === "reconocimiento");
  const generalPosts = posts.filter((p) => p.type === "general");

  if (isLoading)
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando portal…</div>;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Portal OSH</h1>
          <p className="page-subtitle">Reconocimientos, cumpleaños y novedades de la organización</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditingPost(null);
              setPostDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> Nueva Publicación
          </Button>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Colaboradores", value: profiles.length, icon: Users, accent: "text-primary" },
          { label: "Áreas", value: areas.length, icon: Megaphone, accent: "text-accent" },
          { label: "Reconocimientos", value: recognitions.length, icon: Award, accent: "text-[hsl(var(--success))]" },
          {
            label: "Cumpleaños del Mes",
            value: birthdaysThisMonth.length,
            icon: Cake,
            accent: "text-[hsl(var(--warning))]",
          },
        ].map((m) => (
          <div key={m.label} className="metric-card text-center">
            <m.icon className={`w-6 h-6 ${m.accent} mx-auto mb-2`} />
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Birthdays */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Cake className="w-5 h-5 text-[hsl(var(--warning))]" />
            <h2 className="font-semibold">Cumpleaños del Mes</h2>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {birthdaysThisMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay cumpleaños este mes</p>
            ) : (
              birthdaysThisMonth.map((p) => {
                const bd = parseISO(p.birthday!);
                const isToday = isSameDay(new Date(today.getFullYear(), bd.getMonth(), bd.getDate()), today);
                const membership = memberships.find((m) => m.user_id === p.id);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isToday ? "bg-[hsl(var(--warning)/0.1)] ring-1 ring-[hsl(var(--warning)/0.3)]" : "hover:bg-muted/50"}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--warning)/0.15)] flex items-center justify-center text-sm font-bold text-[hsl(var(--warning))]">
                      {bd.getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.position || getAreaNameFromList(areas, membership?.area_id ?? null)}
                      </p>
                    </div>
                    {isToday && <span className="text-xs font-semibold text-[hsl(var(--warning))]">🎂 ¡Hoy!</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recognitions */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Award className="w-5 h-5 text-[hsl(var(--success))]" />
            <h2 className="font-semibold">Reconocimientos</h2>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {recognitions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay reconocimientos publicados</p>
            ) : (
              recognitions.map((post) => {
                const target = profiles.find((p) => p.id === post.target_user_id);
                return (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg border bg-[hsl(var(--success)/0.04)] hover:bg-[hsl(var(--success)/0.08)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{post.title}</p>
                      {canManage && (
                        <button
                          onClick={() => {
                            setEditingPost(post);
                            setPostDialogOpen(true);
                          }}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {target && (
                      <p className="text-xs text-[hsl(var(--success))] font-medium mt-0.5">🏆 {target.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {format(new Date(post.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* General News */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Noticias Generales</h2>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {generalPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay noticias publicadas</p>
            ) : (
              generalPosts.map((post) => (
                <div key={post.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{post.title}</p>
                    {canManage && (
                      <button
                        onClick={() => {
                          setEditingPost(post);
                          setPostDialogOpen(true);
                        }}
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{post.content}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2">
                    {format(new Date(post.created_at), "d MMM yyyy", { locale: es })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <NewsletterPostFormDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        profiles={profiles}
        post={editingPost}
      />
    </div>
  );
}
