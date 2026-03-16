import { ReactNode } from "react";
import AppSidebar from "@/components/AppSidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header className="border-b bg-card px-4 md:px-6 lg:px-8 py-3">
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              EasyConnect – Plataforma de Gestión Estratégica Hotelera
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Sistema de Gestión de Objetivos e Indicadores Administrativa y Operativos.
            </p>
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
