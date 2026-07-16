import LeaderPassPage from './LeaderPassPage';
import AuditoriasPage from './AuditoriasPage';
import EvaluacionesPage from './EvaluacionesPage';
import ColaboradoresPage from './ColaboradoresPage';
import ControlAccesoPage from './ControlAccesoPage';

const AREA_ROUTE_MAP: Record<string, string> = {
  ayb: 'Alimentos y Bebidas',
  comercial: 'Comercial',
  compras: 'Compras',
  contraloria: 'Contraloría',
  mercadeo: 'Mercadeo',
  operaciones: 'Operaciones',
  tecnologia: 'Tecnología',
};

// URL subarea key -> DB subarea name
export const SUBAREA_ROUTE_MAP: Record<string, string> = {
  // Comercial
  'comercial/comercial': 'Comercial',
  'comercial/hospitalidad': 'Oshpitalidad',
  'comercial/reservas': 'Reservas',
  // Operaciones
  'operaciones/glowingdesk': 'Glowing Desk',
  'operaciones/housekeeping': 'Comfort & Housekeeping',
  'operaciones/mantenimiento': 'Mantenimiento',
  // AyB
  'ayb/bar': 'Bar',
  'ayb/cocina': 'Cocina',
  'ayb/mesa': 'Mesa',
};

type ModuleType = 'leader-pass' | 'calidad' | 'evaluaciones' | 'colaboradores' | 'control-acceso';

interface Props {
  areaKey: string;
  module: ModuleType;
}

export default function AreaModulePage({ areaKey, module }: Props) {
  const areaName = AREA_ROUTE_MAP[areaKey] || areaKey;

  switch (module) {
    case 'leader-pass':
      return <LeaderPassPage areaFilterName={areaName} />;
    case 'calidad':
      return <AuditoriasPage areaFilterName={areaName} />;
    case 'evaluaciones':
      return <EvaluacionesPage areaFilterName={areaName} />;
    case 'colaboradores':
      return <ColaboradoresPage areaFilterName={areaName} />;
    case 'control-acceso':
      return <ControlAccesoPage areaFilterName={areaName} />;
  }
}

interface SubareaProps {
  subareaKey: string; // e.g. "operaciones/housekeeping"
}

export function SubareaControlAccesoPage({ subareaKey }: SubareaProps) {
  const areaKey = subareaKey.split('/')[0];
  const areaName = AREA_ROUTE_MAP[areaKey] || areaKey;
  const subareaName = SUBAREA_ROUTE_MAP[subareaKey];
  return <ControlAccesoPage areaFilterName={areaName} subareaFilterName={subareaName} />;
}
