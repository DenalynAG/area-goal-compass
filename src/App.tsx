import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import NewsletterPortalPage from "@/pages/NewsletterPortalPage";
import EstructuraPage from "@/pages/EstructuraPage";
import ColaboradoresPage from "@/pages/ColaboradoresPage";

import ObjetivosPage from "@/pages/ObjetivosPage";
import IndicadoresPage from "@/pages/IndicadoresPage";
import ReportesPage from "@/pages/ReportesPage";
import AdministracionPage from "@/pages/AdministracionPage";
import EvaluacionesPage from "@/pages/EvaluacionesPage";
import OrganigramaPage from "@/pages/OrganigramaPage";
import LeaderPassPage from "@/pages/LeaderPassPage";
import AuditoriasPage from "@/pages/AuditoriasPage";
import AplicacionesPage from "@/pages/AplicacionesPage";
import ControlAccesoPage from "@/pages/ControlAccesoPage";
import ControlActivosPage from "@/pages/ControlActivosPage";
import ComfortMapPage from "@/pages/ComfortMapPage";
import AreaObjetivosPage from "@/pages/AreaObjetivosPage";
import AreaModulePage from "@/pages/AreaModulePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<NewsletterPortalPage />} />
        <Route path="/aplicaciones" element={<AplicacionesPage />} />
        <Route path="/estructura" element={<EstructuraPage />} />
        <Route path="/colaboradores" element={<ColaboradoresPage />} />
        
        <Route path="/objetivos" element={<ObjetivosPage />} />
        <Route path="/indicadores" element={<IndicadoresPage />} />
        <Route path="/leader-pass" element={<LeaderPassPage />} />
        <Route path="/calidad/auditorias" element={<AuditoriasPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/evaluaciones" element={<EvaluacionesPage />} />
        <Route path="/organigrama" element={<OrganigramaPage />} />
        <Route path="/administracion" element={<AdministracionPage />} />
        <Route path="/operaciones/seguridad/control-acceso" element={<ControlAccesoPage />} />
        <Route path="/operaciones/seguridad/control-activos" element={<ControlActivosPage />} />
        <Route path="/operaciones/housekeeping/comfort-map" element={<ComfortMapPage />} />
        
        {/* Area-specific objectives */}
        {['ayb', 'comercial', 'compras', 'contraloria', 'mercadeo', 'operaciones', 'tecnologia'].map(key => (
          <Route key={`${key}-obj`} path={`/${key}/objetivos`} element={<AreaObjetivosPage areaKey={key} />} />
        ))}

        {/* Area-specific modules: colaboradores, leader-pass, calidad, evaluaciones */}
        {['ayb', 'comercial', 'compras', 'contraloria', 'mercadeo', 'operaciones', 'tecnologia'].map(key => (
          <>
            <Route key={`${key}-colab`} path={`/${key}/colaboradores`} element={<AreaModulePage areaKey={key} module="colaboradores" />} />
            <Route key={`${key}-lp`} path={`/${key}/leader-pass`} element={<AreaModulePage areaKey={key} module="leader-pass" />} />
            <Route key={`${key}-cal`} path={`/${key}/calidad`} element={<AreaModulePage areaKey={key} module="calidad" />} />
            <Route key={`${key}-eval`} path={`/${key}/evaluaciones`} element={<AreaModulePage areaKey={key} module="evaluaciones" />} />
          </>
        ))}
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
