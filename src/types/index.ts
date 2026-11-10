import { getKpiComplianceLight } from '@/lib/kpiCompliance';

export type AppRole = 'super_admin' | 'admin_area' | 'lider_subarea' | 'gestor_area' | 'colaborador' | 'solo_lectura';

export type ObjectiveStatus = 'borrador' | 'activo' | 'en_riesgo' | 'cerrado' | 'cumplido' | 'no_cumplido';
export type Priority = 'alta' | 'media' | 'baja';
export type EntityStatus = 'activo' | 'inactivo';
export type KPIFrequency = 'semanal' | 'mensual' | 'trimestral';
export type TrafficLight = 'verde' | 'amarillo' | 'rojo';

export interface Area {
  id: string;
  name: string;
  description: string;
  leader_user_id: string;
  status: EntityStatus;
  created_at: string;
}

export interface Subarea {
  id: string;
  area_id: string;
  name: string;
  description: string;
  leader_user_id: string;
  status: EntityStatus;
  created_at: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  area_id: string;
  subarea_id?: string;
  role: AppRole;
  status: EntityStatus;
  avatar?: string;
  created_at: string;
}

export interface Role {
  id: string;
  code: AppRole;
  name: string;
  description: string;
}

export interface Objective {
  id: string;
  scope_type: 'area' | 'subarea';
  scope_id: string;
  title: string;
  description: string;
  period: string;
  owner_user_id: string;
  start_date: string;
  end_date: string;
  priority: Priority;
  status: ObjectiveStatus;
  progress_percent: number;
}

export interface KPI {
  id: string;
  objective_id: string;
  name: string;
  definition: string;
  unit: string;
  frequency: KPIFrequency;
  baseline: number;
  target: number;
  current_value: number;
  threshold_green: number;
  threshold_yellow: number;
  threshold_red: number;
  inverse_thresholds?: boolean | null;
}

export interface KPIMeasurement {
  id: string;
  kpi_id: string;
  period_date: string;
  value: number;
  created_by: string;
  notes: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity: string;
  entity_id: string;
  timestamp: string;
}

export function getTrafficLight(kpi: KPI): TrafficLight {
  const name = (kpi.name ?? '').toLowerCase();
  const unit = (kpi.unit ?? '').trim();
  const isSavings = ['ahorro', 'ahorros'].some((kw) => name.includes(kw));
  const isReduction = ['ppto', 'presupuesto', 'reducci', 'gop', 'gasto', 'costo'].some((kw) => name.includes(kw));
  const inverse = kpi.inverse_thresholds ?? (unit === '#' || (!isSavings && isReduction));
  return getKpiComplianceLight(kpi.current_value, kpi.target, inverse);
}

export function getStatusLabel(status: ObjectiveStatus): string {
  const map: Record<ObjectiveStatus, string> = {
    borrador: 'Borrador',
    activo: 'Activo',
    en_riesgo: 'En Riesgo',
    cerrado: 'Cerrado',
    cumplido: 'Cumplido',
    no_cumplido: 'No Cumplido',
  };
  return map[status];
}

export function getPriorityLabel(p: Priority): string {
  const map: Record<Priority, string> = {
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja',
  };
  return map[p];
}

export function getRoleLabel(r: AppRole): string {
  const map: Record<AppRole, string> = {
    super_admin: 'Super Admin',
    admin_area: 'Admin de Área',
    lider_subarea: 'Líder de Subárea',
    gestor_area: 'Gestor de Área',
    colaborador: 'Colaborador',
    solo_lectura: 'Solo Lectura',
  };
  return map[r];
}
