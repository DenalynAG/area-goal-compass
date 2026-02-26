
-- Add area_id and subarea_id to positions table
ALTER TABLE public.positions
  ADD COLUMN area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  ADD COLUMN subarea_id uuid REFERENCES public.subareas(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_positions_area_id ON public.positions(area_id);
CREATE INDEX idx_positions_subarea_id ON public.positions(subarea_id);
