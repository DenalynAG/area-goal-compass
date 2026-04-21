import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const isForced = searchParams.get('force') === '1' && !!user?.user_metadata?.must_change_password;

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for recovery token
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    const { error: err } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        if (isForced) {
          navigate('/', { replace: true });
          window.location.reload();
        } else {
          navigate('/login');
        }
      }, 2000);
    }
    setIsLoading(false);
  };

  if (!isRecovery && !isForced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-sidebar-foreground">Enlace de recuperación inválido o expirado.</p>
          <Button className="mt-4" onClick={() => navigate('/login')}>Volver al login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img
            src="https://dnifnjmiqbrtnmeqjizw.supabase.co/storage/v1/object/public/OSH-B/OSH-B.png"
            alt="OSHOME logo"
            className="w-20 h-20 rounded-2xl object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-display font-extrabold text-sidebar-foreground">
            {isForced ? 'Cambia tu contraseña' : 'Nueva Contraseña'}
          </h1>
          <p className="text-sidebar-foreground/70 mt-1 text-sm">
            {isForced ? 'Por seguridad, define una nueva contraseña antes de continuar.' : 'Ingresa tu nueva contraseña'}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-sm text-foreground">Contraseña actualizada correctamente.</p>
              <p className="text-xs text-muted-foreground">Redirigiendo al login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-10" placeholder="Repite la contraseña" required minLength={6} />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
              {isForced && (
                <button
                  type="button"
                  onClick={async () => { await logout(); navigate('/login'); }}
                  className="w-full text-sm text-muted-foreground hover:underline"
                >
                  Cancelar y cerrar sesión
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
