import { ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";
import NotificationsBell from "@/components/NotificationsBell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="border-b bg-card px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              Plataforma de Gestión Objetivo e Indicadores
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">V1.0.</p>
          </div>
          <NotificationsBell />
        </header>
        <div className="p-4 md:p-6 lg:p-8 w-full">{children}</div>
      </main>
    </div>
  );
}
