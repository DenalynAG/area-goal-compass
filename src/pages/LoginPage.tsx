import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ArrowRight, ShieldCheck, CircleHelp } from "lucide-react";
import misionLogo from "@/assets/mision-cerosh-logo.png.asset.json";

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
    <div className="min-h-screen flex bg-white">
      {/* Lado izquierdo — negro con identidad */}
      <div className="hidden lg:flex lg:w-1/2 bg-black text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Patrón de círculos concéntricos */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 55%, rgba(255,255,255,0.9) 0%, transparent 38%), radial-gradient(circle at 50% 55%, rgba(255,255,255,0.6) 0%, transparent 55%), radial-gradient(circle at 50% 55%, rgba(255,255,255,0.4) 0%, transparent 72%)",
          }}
        />
        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <img
            src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
            alt="Logo Oshpitality Group"
            className="w-12 h-12 object-contain brightness-0 invert"
          />
          <span className="font-display text-xl tracking-tight">Oshpitality Group</span>
        </div>

        {/* Texto central */}
        <div className="relative">
          <h2 className="font-display text-3xl xl:text-4xl leading-tight tracking-tight">
            Plataforma de Gestión<br />Objetivos e Indicadores
          </h2>
          <p className="mt-5 text-white/60 text-sm max-w-sm leading-relaxed">
            Gestiona objetivos, indicadores y reportes operativos de tu área en un solo lugar.
          </p>
          <p className="mt-6 font-display text-base text-white/80 italic">
            "Cuidarnos, es sonreír con seguridad."
          </p>
        </div>

        {/* Logo Misión CerOSH abajo */}
        <div className="relative flex items-center gap-3">
          <img
            src={misionLogo.url}
            alt="Logo Misión CerOSH"
            className="w-10 h-10 object-contain brightness-0 invert"
          />
          <span className="text-white/50 text-xs tracking-wide uppercase">Misión CerOSH</span>
        </div>
      </div>

      {/* Lado derecho — formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Logo móvil */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <img
              src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
              alt="Logo Oshpitality Group"
              className="w-10 h-10 object-contain"
            />
            <span className="font-display text-lg text-foreground tracking-tight">Oshpitality Group</span>
          </div>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
              Oshpitality Group
            </p>
            <h1 className="text-3xl sm:text-4xl font-display text-foreground tracking-tight">Bienvenido</h1>
            <p className="text-muted-foreground mt-2 text-sm">Ingresa tus datos de acceso.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">
                Correo electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-white border-border/50 focus:border-foreground/30 focus:ring-foreground/10 rounded-md"
                  placeholder="correo@empresa.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-foreground/80 text-xs font-medium uppercase tracking-wider">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white border-border/50 focus:border-foreground/30 focus:ring-foreground/10 rounded-md"
                  placeholder="••••••••"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground/70">Ingresa tu contraseña para acceder a la plataforma.</p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {forgotMessage && (
              <p className="text-sm text-foreground bg-secondary/40 p-3 rounded-md">{forgotMessage}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-md py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isLoading ? "Ingresando..." : "Iniciar sesión"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>

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
          </form>

          {/* Separador + acceso */}
          <div className="mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">¿Necesitas acceso?</p>
              <a
                href="/status"
                className="text-sm font-medium text-foreground underline decoration-foreground/40 underline-offset-4 hover:decoration-foreground transition-colors inline-flex items-center gap-1"
              >
                Estado del sistema
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground/60 leading-relaxed">
              Al iniciar sesión aceptas el uso interno de esta plataforma.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
