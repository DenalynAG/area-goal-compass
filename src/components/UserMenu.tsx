import { useAuth } from "@/contexts/AuthContext";
import { getRoleLabel } from "@/types";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UserMenu() {
  const { user, profile, roles, logout } = useAuth();
  if (!user) return null;

  const initials = (profile?.name ?? user?.email ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const displayName = profile?.name ?? user.email;
  const roleLabel = roles[0] ? getRoleLabel(roles[0] as any) : "Sin rol";

  return (
    <div className="flex items-center gap-2 pl-2 border-l border-border/60">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
          "bg-primary/15 text-primary"
        )}
      >
        {initials}
      </div>
      <div className="hidden sm:flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground whitespace-normal break-words">
          {displayName}
        </span>
        <span className="text-[11px] text-muted-foreground whitespace-normal break-words">
          {roleLabel}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={logout}
        aria-label="Cerrar sesión"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
