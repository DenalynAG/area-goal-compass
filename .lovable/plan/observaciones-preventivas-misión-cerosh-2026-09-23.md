# Observaciones Preventivas — Misión CerOSH

Actualización visual, de identidad y de experiencia del módulo hoy llamado "Momento Seguro", conservando toda la funcionalidad actual (registro, filtros, evidencias, firmas, seguimiento, indicadores e historial).

## Identidad

- Nombre del módulo: **Observaciones Preventivas**.
- Subtítulo: *Programa de Cultura Preventiva | Misión CerOSH | Oshpitality Group*.
- Lema visible en la pantalla principal del módulo y en la pantalla de inicio de sesión: **"Cuidarnos, es sonreír con seguridad."**
- Logo oficial de Misión CerOSH en el encabezado del módulo, en la pantalla de inicio y como ícono del navegador (favicon).
- Se reemplaza toda mención de "SG-SST" por "Oshpitality Group" (menú lateral incluido).

## Áreas del hotel

Se reemplaza el listado actual por las 14 áreas oficiales, en el orden indicado: Cocina, Mesa, Bar, Comfort & Housekeeping, Mantenimiento, Comercial, Reservas, Glowing Desk, Seguridad Física, Mercadeo, Tecnología, Gestión Humana, Contraloría, Compras y Almacén.

Este listado se usa en el formulario, los filtros, el tablero, las gráficas y las estadísticas del módulo. Solo aplica a este módulo: el resto de la plataforma conserva su estructura de áreas y subáreas actual.

## Campo "Proceso"

Pasa a ser un campo de texto libre, sin opciones predefinidas, para que se escriba el proceso observado.

## Tablero de indicadores

Tarjetas en la pantalla principal:

- Observaciones preventivas registradas
- Comportamientos seguros
- Oportunidades de mejora
- Comportamientos inseguros
- Observaciones del mes
- Área con mayor número de observaciones
- Área con mayor porcentaje de comportamientos seguros
- Seguimientos pendientes

## Reconocimiento positivo

Cuando la observación sea un comportamiento seguro, aparece la acción **🏆 Embajador Misión CerOSH**. El reconocimiento queda guardado en el sistema (con fecha) para estadísticas de cultura preventiva, y se muestra como distintivo en la tarjeta de la observación y como contador en el tablero.

## Mensaje de confirmación

Al guardar una observación se muestra:

> ¡Observación registrada exitosamente! Gracias por fortalecer la cultura preventiva de Oshpitality Group. Cada observación preventiva contribuye a proteger a nuestros colaboradores y huéspedes.

## Diseño

Estética minimalista tipo Linear/Notion: tarjetas con bordes redondeados, sombras suaves, espaciado amplio, iconografía consistente, encabezado con logo y lema, formulario por secciones con mejor jerarquía, y comportamiento cuidado tanto en computador como en móvil. Se usan los colores corporativos ya definidos en la plataforma.

## Detalles técnicos

- Migración aditiva sobre `safe_moment_observations`: columnas nuevas `hotel_area` (texto), `process` (texto), `is_ambassador` (booleano, por defecto falso) y `ambassador_at` (fecha/hora). No se elimina ni renombra nada; `area_id`/`subarea_id` se conservan para compatibilidad.
- Nueva constante compartida `src/lib/hotelAreas.ts` con las 14 áreas oficiales, reutilizable por futuros módulos SST.
- `src/pages/MomentoSeguroPage.tsx` se reorganiza en componentes internos (encabezado de marca, tarjetas de indicadores, filtros, tarjeta de observación, formulario) para mantener el módulo modular y escalable hacia inspecciones, investigaciones, acciones correctivas, capacitaciones, auditorías y demás.
- Ruta `/momento-seguro` y permisos de menú se mantienen intactos; solo cambia la etiqueta visible.
- Logo servido desde el asset existente de Misión CerOSH; favicon y metadatos en `index.html`.
