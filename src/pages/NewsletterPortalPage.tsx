import { useState } from "react";
import {
  useProfiles,
  useNewsletterPosts,
  useAreas,
  useMemberships,
  getAreaNameFromList,
} from "@/hooks/useSupabaseData";
import { Award, Cake, Megaphone, Plus, Pencil, Heart, MessageCircle, Share2, Sparkles, PartyPopper } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const today = new Date();

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

  const allPosts = [...posts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const getAvatar = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find((p) => p.id === userId);
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Cargando portal…
      </div>
    );

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Portal OSH</h1>
          <p className="page-subtitle">Tu feed de novedades y reconocimientos</p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditingPost(null);
              setPostDialogOpen(true);
            }}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-1" /> Publicar
          </Button>
        )}
      </div>

      {/* Stories - Birthdays */}
      {birthdaysThisMonth.length > 0 && (
        <div className="bg-card rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cake className="w-4 h-4 text-[hsl(var(--warning))]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cumpleaños del mes
            </span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {birthdaysThisMonth.map((p) => {
              const bd = parseISO(p.birthday!);
              const isToday = isSameDay(
                new Date(today.getFullYear(), bd.getMonth(), bd.getDate()),
                today
              );
              return (
                <div key={p.id} className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
                  <div
                    className={`relative w-16 h-16 rounded-full p-[3px] ${
                      isToday
                        ? "bg-gradient-to-br from-[hsl(var(--warning))] via-[hsl(var(--accent))] to-[hsl(var(--destructive))]"
                        : "bg-gradient-to-br from-border to-muted-foreground/30"
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{getInitials(p.name)}</span>
                      )}
                    </div>
                    {isToday && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[hsl(var(--warning))] rounded-full flex items-center justify-center text-[10px] border-2 border-card">
                        🎂
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-center font-medium leading-tight truncate w-full">
                    {p.name.split(" ")[0]}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {format(bd, "d MMM", { locale: es })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {allPosts.length === 0 ? (
          <div className="bg-card rounded-2xl border shadow-sm p-12 text-center">
            <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No hay publicaciones aún</p>
          </div>
        ) : (
          allPosts.map((post) => {
            const isRecognition = post.type === "reconocimiento";
            const target = isRecognition ? getAvatar(post.target_user_id) : null;
            const author = getAvatar(post.created_by);
            const isLiked = likedPosts.has(post.id);

            return (
              <article
                key={post.id}
                className="bg-card rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md"
              >
                {/* Post header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {isRecognition ? (
                      <Award className="w-4 h-4 text-[hsl(var(--success))]" />
                    ) : (
                      <Megaphone className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {isRecognition ? "Reconocimiento" : "Noticia"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(post.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                      {author && ` · por ${author.name.split(" ")[0]}`}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => {
                        setEditingPost(post);
                        setPostDialogOpen(true);
                      }}
                      className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Recognition banner */}
                {isRecognition && target && (
                  <div className="mx-4 mb-3 p-4 rounded-xl bg-gradient-to-r from-[hsl(var(--success)/0.08)] to-[hsl(var(--warning)/0.06)] border border-[hsl(var(--success)/0.15)]">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--success))] to-[hsl(var(--warning))] p-[2px] shrink-0">
                        <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
                          {target.avatar ? (
                            <img src={target.avatar} alt={target.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-xs font-bold text-[hsl(var(--success))]">
                              {getInitials(target.name)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
                          <span className="text-xs font-semibold text-[hsl(var(--success))] uppercase tracking-wide">
                            Felicitaciones
                          </span>
                        </div>
                        <p className="text-sm font-bold mt-0.5">{target.name}</p>
                        {target.position && (
                          <p className="text-[11px] text-muted-foreground">{target.position}</p>
                        )}
                      </div>
                      <PartyPopper className="w-6 h-6 text-[hsl(var(--warning)/0.5)]" />
                    </div>
                  </div>
                )}

                {/* Post image */}
                {post.image_url && (
                  <div className="aspect-video w-full bg-muted overflow-hidden">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Actions bar */}
                <div className="flex items-center gap-1 px-4 py-2">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`p-2 rounded-full transition-colors ${
                      isLiked
                        ? "text-[hsl(var(--destructive))]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                  </button>
                  <button className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-4 pb-4">
                  <h3 className="text-sm font-bold">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>
                </div>
              </article>
            );
          })
        )}
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
