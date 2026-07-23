import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [forgotMessage, setForgotMessage] = useState("");

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Ingresa tu correo electrónico primero.");
      return;
    }
    setError("");
    setForgotMessage("");
    setIsLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) {
      setError(err.message);
    } else {
      setForgotMessage("Revisa tu correo electrónico para restablecer tu contraseña.");
    }
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const { error: err } = await login(email, password);
    if (err) setError(err);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="text-center mb-10">
          <img
            src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
            alt="OSHOME logo"
            className="w-24 h-24 object-contain mx-auto mb-6"
          />
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Work Plan</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">Plataforma de Gestión Objetivos e Indicadores</p>
          <p className="text-muted-foreground/60 mt-1 text-xs">Inicia sesión con tu cuenta</p>
        </div>

        <div className="bg-white border border-border/60 rounded-sm p-8 shadow-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-foreground/90 text-sm font-medium">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white border-border/60 focus:border-foreground/30 focus:ring-foreground/10"
                  placeholder="correo@empresa.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-foreground/90 text-sm font-medium">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white border-border/60 focus:border-foreground/30 focus:ring-foreground/10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {forgotMessage && (
              <p className="text-sm text-foreground bg-secondary/40 p-3 rounded-sm">{forgotMessage}</p>
            )}
            <Button type="submit" className="w-full rounded-sm" disabled={isLoading}>
              {isLoading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="text-center pt-4 border-t border-border/40">
              <a href="/status" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Ver estado del sistema
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
