import LeaderPassPage from './LeaderPassPage';
import AuditoriasPage from './AuditoriasPage';
import EvaluacionesPage from './EvaluacionesPage';
import ColaboradoresPage from './ColaboradoresPage';

const AREA_ROUTE_MAP: Record<string, string> = {
  ayb: 'Alimentos y Bebidas',
  comercial: 'Comercial',
  compras: 'Compras',
  contraloria: 'Contraloría',
  mercadeo: 'Mercadeo',
  operaciones: 'Operaciones',
  tecnologia: 'Tecnología',
};

type ModuleType = 'leader-pass' | 'calidad' | 'evaluaciones' | 'colaboradores';

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
  }
}
