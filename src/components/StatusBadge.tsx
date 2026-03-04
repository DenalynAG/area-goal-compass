import { cn } from '@/lib/utils';
import { ObjectiveStatus, Priority, TrafficLight } from '@/types';

interface StatusBadgeProps {
  status: ObjectiveStatus | 'activo' | 'inactivo';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<string, { class: string; label: string }> = {
    activo: { class: 'status-active', label: 'Activo' },
    borrador: { class: 'status-muted', label: 'Borrador' },
    en_riesgo: { class: 'status-danger', label: 'En Riesgo' },
    cerrado: { class: 'status-muted', label: 'Cerrado' },
    cumplido: { class: 'status-active', label: 'Cumplido' },
    no_cumplido: { class: 'status-danger', label: 'No Cumplido' },
    inactivo: { class: 'status-muted', label: 'Inactivo' },
  };
  const c = config[status] ?? config.activo;
  return <span className={cn('status-badge', c.class, className)}>{c.label}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config: Record<Priority, { class: string; label: string }> = {
    alta: { class: 'status-danger', label: 'Alta' },
    media: { class: 'status-warning', label: 'Media' },
    baja: { class: 'status-active', label: 'Baja' },
  };
  const c = config[priority];
  return <span className={cn('status-badge', c.class)}>{c.label}</span>;
}

export function TrafficLightBadge({ light }: { light: TrafficLight }) {
  const config: Record<TrafficLight, { class: string; label: string }> = {
    verde: { class: 'status-active', label: '● Verde' },
    amarillo: { class: 'status-warning', label: '● Amarillo' },
    rojo: { class: 'status-danger', label: '● Rojo' },
  };
  const c = config[light];
  return <span className={cn('status-badge', c.class)}>{c.label}</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 70 ? 'bg-success' : value >= 40 ? 'bg-warning' : 'bg-danger';
  return (
    <div className={cn('w-full bg-muted rounded-full h-2', className)}>
      <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
