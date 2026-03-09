import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useProfiles,
  useNewsletterPosts,
  useAreas,
  useMemberships,
} from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { Award, Cake, Megaphone, Plus, Pencil, Heart, MessageCircle, Share2, Sparkles, PartyPopper, Send, Trash2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, isSameDay, formatDistanceToNow, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NewsletterPostFormDialog from "@/components/NewsletterPostFormDialog";

interface NewsletterComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  avatar: string;
  comment: string;
  created_at: string;
}

function useNewsletterComments() {
  return useQuery({
    queryKey: ["newsletter_comments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("newsletter_comments").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data as NewsletterComment[];
    },
  });
}

export default function NewsletterPortalPage() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: posts = [] } = useNewsletterPosts();
  const { data: areas = [] } = useAreas();
  const { data: memberships = [] } = useMemberships();
  const { data: allComments = [] } = useNewsletterComments();
  const { user, profile, hasRole, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const canManage = hasRole("super_admin") || hasRole("admin_area");

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const submitComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("newsletter_comments").insert({
      post_id: postId,
      user_id: user.id,
      user_name: profile?.name ?? "",
      avatar: profile?.avatar ?? "",
      comment: text,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    qc.invalidateQueries({ queryKey: ["newsletter_comments"] });
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from("newsletter_comments").delete().eq("id", commentId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["newsletter_comments"] });
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

      {/* Birthday Calendar */}
      {(() => {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = endOfMonth(calendarMonth);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const startDayOfWeek = getDay(monthStart); // 0=Sun

        // Map day-of-month → birthdays
        const bdByDay: Record<number, typeof profiles> = {};
        profiles.forEach((p) => {
          if (!p.birthday) return;
          const bd = parseISO(p.birthday);
          if (bd.getMonth() === calendarMonth.getMonth()) {
            const d = bd.getDate();
            if (!bdByDay[d]) bdByDay[d] = [];
            bdByDay[d].push(p);
          }
        });

        const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

        return (
          <div className="bg-card rounded-2xl border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Calendario de cumpleaños
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium min-w-[120px] text-center capitalize">
                  {format(calendarMonth, "MMMM yyyy", { locale: es })}
                </span>
                <button
                  onClick={() => setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Week header */}
            <div className="grid grid-cols-7 mb-1">
              {weekDays.map((wd) => (
                <div key={wd} className="text-[10px] font-semibold text-muted-foreground text-center py-1">
                  {wd}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-px">
              {/* Empty cells for offset */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const d = day.getDate();
                const bds = bdByDay[d] || [];
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={d}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative group transition-colors ${
                      bds.length > 0
                        ? "bg-[hsl(var(--warning)/0.1)] hover:bg-[hsl(var(--warning)/0.2)] cursor-pointer"
                        : "hover:bg-muted/50"
                    } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    <span className={`text-xs ${bds.length > 0 ? "font-bold text-foreground" : "text-muted-foreground"} ${isToday ? "text-primary font-bold" : ""}`}>
                      {d}
                    </span>
                    {bds.length > 0 && (
                      <span className="text-[8px]">🎂</span>
                    )}

                    {/* Tooltip */}
                    {bds.length > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-30 pointer-events-none">
                        <div className="bg-popover border rounded-lg shadow-lg p-2 min-w-[140px]">
                          {bds.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 py-0.5">
                              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  <span className="text-[8px] font-bold text-primary">{getInitials(p.name)}</span>
                                )}
                              </div>
                              <span className="text-[11px] font-medium truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
            const postComments = allComments.filter((c) => c.post_id === post.id);
            const isCommentsOpen = expandedComments.has(post.id);
            const commentInput = commentInputs[post.id] ?? "";

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
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`p-2 rounded-full transition-colors ${
                      isCommentsOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <MessageCircle className={`w-5 h-5 ${isCommentsOpen ? "fill-primary/20" : ""}`} />
                  </button>
                  <button className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  {postComments.length > 0 && (
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="text-xs text-muted-foreground hover:text-foreground ml-1"
                    >
                      {postComments.length} comentario{postComments.length !== 1 ? "s" : ""}
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="px-4 pb-3">
                  <h3 className="text-sm font-bold">{post.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Comments Section */}
                {isCommentsOpen && (
                  <div className="border-t px-4 py-3 space-y-3 bg-muted/20">
                    {/* Existing comments */}
                    {postComments.length > 0 && (
                      <div className="space-y-2.5">
                        {postComments.map((c) => (
                          <div key={c.id} className="flex gap-2.5 group">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                              {c.avatar ? (
                                <img src={c.avatar} alt={c.user_name} className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <span className="text-[9px] font-bold text-primary">
                                  {getInitials(c.user_name || "?")}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="bg-card rounded-xl px-3 py-2 border">
                                <p className="text-xs font-semibold">{c.user_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{c.comment}</p>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 px-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                                </span>
                                {(c.user_id === user?.id || isSuperAdmin) && (
                                  <button
                                    onClick={() => deleteComment(c.id)}
                                    className="text-[10px] text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment input */}
                    {user && (
                      <div className="flex gap-2 items-center">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {profile?.avatar ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-[9px] font-bold text-primary">
                              {getInitials(profile?.name ?? "?")}
                            </span>
                          )}
                        </div>
                        <Input
                          placeholder="Escribe un comentario…"
                          value={commentInput}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && !submitting && submitComment(post.id)}
                          className="h-8 text-xs rounded-full bg-muted border-0 focus-visible:ring-1"
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          disabled={submitting || !commentInput.trim()}
                          className="text-primary disabled:text-muted-foreground p-1.5 shrink-0 hover:bg-primary/10 rounded-full transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
