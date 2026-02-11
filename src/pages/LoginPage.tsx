import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@empresa.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!login(email, password)) {
      setError('Credenciales inválidas. Usa un correo de la lista de colaboradores.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-4">
            <Building2 className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">Gestión de Áreas y Objetivos</h1>
          <p className="text-primary-foreground/60 mt-1">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-2xl p-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" placeholder="correo@empresa.com" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" required />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Iniciar Sesión</Button>
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-medium">Usuarios de prueba:</p>
            <p>admin@empresa.com — Super Admin</p>
            <p>carlos@empresa.com — Admin de Área</p>
            <p>ana@empresa.com — Líder de Subárea</p>
            <p>camila@empresa.com — Colaborador</p>
          </div>
        </form>
      </div>
    </div>
  );
}
