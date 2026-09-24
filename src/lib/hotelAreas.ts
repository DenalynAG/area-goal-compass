/**
 * Áreas oficiales del hotel (Oshpitality Group).
 * Fuente única de verdad para los módulos del programa Misión CerOSH
 * (Momento Seguro y futuros módulos SST).
 * El orden es institucional y no debe alterarse.
 */
export const HOTEL_AREAS = [
  "Cocina",
  "Mesa",
  "Bar",
  "Comfort & Housekeeping",
  "Mantenimiento",
  "Comercial",
  "Reservas",
  "Glowing Desk",
  "Seguridad Física",
  "Mercadeo",
  "Tecnología",
  "Gestión Humana",
  "Contraloría",
  "Compras y Almacén",
] as const;

export type HotelArea = (typeof HOTEL_AREAS)[number];

export const HOTEL_AREA_OPTIONS = HOTEL_AREAS.map((a) => ({ value: a, label: a }));

export const MISION_CEROSH_TAGLINE = "Cuidarnos, es sonreír con seguridad.";
export const MISION_CEROSH_SUBTITLE =
  "Programa de Cultura Preventiva | Misión CerOSH | Oshpitality Group";
