import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";

type Status = "operational" | "down" | "checking";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Estimated recovery when auth is unreachable (minutes from first failure)
const ETA_MINUTES = 5;

export default function StatusPage() {
  const [authStatus, setAuthStatus] = useState<Status>("checking");
  const [dbStatus, setDbStatus] = useState<Status>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [firstFailureAt, setFirstFailureAt] = useState<Date | null>(null);

  const checkAuth = useCallback(async () => {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
        method: "GET",
        headers: { apikey: ANON_KEY },
        signal: controller.signal,
      });
      clearTimeout(t);
      setLatencyMs(Math.round(performance.now() - start));
      if (res.ok) {
        setAuthStatus("operational");
        setFirstFailureAt(null);
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch {
      setAuthStatus("down");
      setLatencyMs(null);
      setFirstFailureAt((prev) => prev ?? new Date());
    }
  }, []);

  const checkDb = useCallback(async () => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      // HEAD a real table; PostgREST responds reachable even si RLS filtra filas.
      const res = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id&limit=1`, {
        method: "HEAD",
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        signal: controller.signal,
      });
      clearTimeout(t);
      // Cualquier respuesta HTTP < 500 significa que PostgREST está respondiendo.
      setDbStatus(res.status < 500 ? "operational" : "down");
    } catch {
      setDbStatus("down");
    }
  }, []);

  const runChecks = useCallback(async () => {
    setAuthStatus("checking");
    setDbStatus("checking");
    await Promise.all([checkAuth(), checkDb()]);
    setLastCheck(new Date());
  }, [checkAuth, checkDb]);

  useEffect(() => {
    runChecks();
    const id = setInterval(runChecks, 30000);
    return () => clearInterval(id);
  }, [runChecks]);

  const etaText = (() => {
    if (authStatus !== "down" || !firstFailureAt) return null;
    const elapsed = (Date.now() - firstFailureAt.getTime()) / 60000;
    const remaining = Math.max(0, ETA_MINUTES - elapsed);
    if (remaining === 0) return "Debería restablecerse en breve. Si persiste, contactar soporte.";
    return `Tiempo estimado de recuperación: ~${Math.ceil(remaining)} min`;
  })();

  const overall: Status =
    authStatus === "checking" || dbStatus === "checking"
      ? "checking"
      : authStatus === "operational" && dbStatus === "operational"
      ? "operational"
      : "down";

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Estado del sistema</h1>
          <Button variant="outline" size="sm" onClick={runChecks}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
        </div>

        <div
          className={`rounded-lg border p-6 mb-6 ${
            overall === "operational"
              ? "border-green-500/40 bg-green-500/5"
              : overall === "down"
              ? "border-red-500/40 bg-red-500/5"
              : "border-border bg-muted/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <StatusIcon status={overall} />
            <div>
              <p className="text-lg font-semibold">
                {overall === "operational"
                  ? "Todos los sistemas operativos"
                  : overall === "down"
                  ? "Hay una interrupción en curso"
                  : "Verificando servicios..."}
              </p>
              {lastCheck && (
                <p className="text-sm text-muted-foreground">
                  Última verificación: {lastCheck.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {etaText && (
            <p className="mt-4 text-sm font-medium text-red-700 dark:text-red-400">
              {etaText}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <ServiceRow
            name="Autenticación"
            description="Inicio de sesión y sesiones de usuario"
            status={authStatus}
            latencyMs={authStatus === "operational" ? latencyMs : null}
          />
          <ServiceRow
            name="Base de datos"
            description="Lectura y escritura de datos"
            status={dbStatus}
          />
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted/20 p-5 text-sm text-muted-foreground space-y-2">
          <p><strong className="text-foreground">¿No puedes iniciar sesión?</strong></p>
          <p>
            Si el servicio de autenticación aparece como caído, la página de
            inicio de sesión mostrará un error de conexión. La recuperación
            suele ser automática en pocos minutos.
          </p>
          <p>Esta página se actualiza automáticamente cada 30 segundos.</p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm underline text-muted-foreground hover:text-foreground">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "operational") return <CheckCircle2 className="h-7 w-7 text-green-600" />;
  if (status === "down") return <AlertCircle className="h-7 w-7 text-red-600" />;
  return <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />;
}

function ServiceRow({
  name,
  description,
  status,
  latencyMs,
}: {
  name: string;
  description: string;
  status: Status;
  latencyMs?: number | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {latencyMs != null && (
          <span className="text-xs text-muted-foreground">{latencyMs} ms</span>
        )}
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const map = {
    operational: { label: "Operativo", cls: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30" },
    down: { label: "Caído", cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
    checking: { label: "Verificando", cls: "bg-muted text-muted-foreground border-border" },
  } as const;
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.cls}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "operational" ? "bg-green-600" : status === "down" ? "bg-red-600 animate-pulse" : "bg-muted-foreground"
        }`}
      />
      {s.label}
    </span>
  );
}