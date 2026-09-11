export const COMP_COLORS = [
  { label: 'Sin color', value: '' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Ámbar', value: '#d97706' },
  { label: 'Rojo', value: '#dc2626' },
  { label: 'Morado', value: '#7c3aed' },
  { label: 'Turquesa', value: '#0d9488' },
  { label: 'Rosa', value: '#db2777' },
  { label: 'Gris', value: '#475569' },
];

export const compTint = (color?: string | null, alpha = '14') =>
  color ? { borderLeft: `4px solid ${color}`, backgroundColor: `${color}${alpha}` } : undefined;
