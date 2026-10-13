import { useState } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const FASTPOOL_INFO =
  'Fastpool: banco de candidatos que ya superaron todas las etapas del proceso de selección —incluyendo exámenes y polígrafo— y están completamente listos para ingresar.';
export const SELECTED_INFO =
  'Se marca cuando el candidato ha sido seleccionado entre todos los candidatos de la convocatoria.';

/** Ícono (i) que muestra un texto al pasar el cursor o al tocarlo en móvil. */
export function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="Más información"
          className="inline-flex items-center align-middle ml-1 text-muted-foreground hover:text-foreground cursor-help"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(o => !o); }}
        >
          <Info className="w-3.5 h-3.5" />
        </span>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72 text-xs font-normal leading-snug p-3">
        {text}
      </PopoverContent>
    </Popover>
  );
}
