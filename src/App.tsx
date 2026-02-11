import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import EstructuraPage from "@/pages/EstructuraPage";
import ColaboradoresPage from "@/pages/ColaboradoresPage";
import RolesPage from "@/pages/RolesPage";
import ObjetivosPage from "@/pages/ObjetivosPage";
import IndicadoresPage from "@/pages/IndicadoresPage";
import ReportesPage from "@/pages/ReportesPage";
import AdministracionPage from "@/pages/AdministracionPage";
import EvaluacionesPage from "@/pages/EvaluacionesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/estructura" element={<EstructuraPage />} />
        <Route path="/colaboradores" element={<ColaboradoresPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/objetivos" element={<ObjetivosPage />} />
        <Route path="/indicadores" element={<IndicadoresPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
        <Route path="/evaluaciones" element={<EvaluacionesPage />} />
        <Route path="/administracion" element={<AdministracionPage />} />
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
