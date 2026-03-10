import ObjetivosPage from './ObjetivosPage';

// Area name mapping from route segments
const AREA_ROUTE_MAP: Record<string, string> = {
  ayb: 'Alimentos y Bebidas',
  comercial: 'Comercial',
  compras: 'Compras',
  contraloria: 'Contraloría',
  mercadeo: 'Mercadeo',
  operaciones: 'Operaciones',
  tecnologia: 'Tecnología',
};

export default function AreaObjetivosPage({ areaKey }: { areaKey: string }) {
  const areaName = AREA_ROUTE_MAP[areaKey] || areaKey;
  return <ObjetivosPage areaFilterName={areaName} />;
}
