import { Area, Subarea, Collaborator, Objective, KPI, KPIMeasurement, ActivityLog, Role } from '@/types';

export const mockAreas: Area[] = [
  { id: 'a1', name: 'Tecnología', description: 'Área de desarrollo y sistemas', leader_user_id: 'u1', status: 'activo', created_at: '2024-01-15' },
  { id: 'a2', name: 'Recursos Humanos', description: 'Gestión del talento humano', leader_user_id: 'u4', status: 'activo', created_at: '2024-01-15' },
  { id: 'a3', name: 'Finanzas', description: 'Área contable y financiera', leader_user_id: 'u7', status: 'activo', created_at: '2024-01-15' },
  { id: 'a4', name: 'Comercial', description: 'Ventas y desarrollo de negocio', leader_user_id: 'u10', status: 'activo', created_at: '2024-02-01' },
];

export const mockSubareas: Subarea[] = [
  { id: 's1', area_id: 'a1', name: 'Desarrollo Frontend', description: 'Interfaces y UX', leader_user_id: 'u2', status: 'activo', created_at: '2024-01-20' },
  { id: 's2', area_id: 'a1', name: 'Desarrollo Backend', description: 'APIs y servicios', leader_user_id: 'u3', status: 'activo', created_at: '2024-01-20' },
  { id: 's3', area_id: 'a1', name: 'Infraestructura', description: 'DevOps y cloud', leader_user_id: 'u14', status: 'activo', created_at: '2024-02-01' },
  { id: 's4', area_id: 'a2', name: 'Selección', description: 'Reclutamiento y selección', leader_user_id: 'u5', status: 'activo', created_at: '2024-01-20' },
  { id: 's5', area_id: 'a2', name: 'Capacitación', description: 'Formación y desarrollo', leader_user_id: 'u6', status: 'activo', created_at: '2024-01-20' },
  { id: 's6', area_id: 'a3', name: 'Contabilidad', description: 'Registros contables', leader_user_id: 'u8', status: 'activo', created_at: '2024-01-20' },
  { id: 's7', area_id: 'a3', name: 'Tesorería', description: 'Flujo de caja', leader_user_id: 'u9', status: 'activo', created_at: '2024-02-01' },
  { id: 's8', area_id: 'a4', name: 'Ventas Corporativas', description: 'Clientes B2B', leader_user_id: 'u11', status: 'activo', created_at: '2024-02-01' },
];

export const mockCollaborators: Collaborator[] = [
  { id: 'u1', name: 'Carlos Mendoza', email: 'carlos@empresa.com', phone: '+52 55 1234 5678', position: 'Director de Tecnología', area_id: 'a1', role: 'admin_area', status: 'activo', created_at: '2024-01-15' },
  { id: 'u2', name: 'Ana García', email: 'ana@empresa.com', phone: '+52 55 2345 6789', position: 'Líder Frontend', area_id: 'a1', subarea_id: 's1', role: 'lider_subarea', status: 'activo', created_at: '2024-01-20' },
  { id: 'u3', name: 'Roberto Silva', email: 'roberto@empresa.com', phone: '+52 55 3456 7890', position: 'Líder Backend', area_id: 'a1', subarea_id: 's2', role: 'lider_subarea', status: 'activo', created_at: '2024-01-20' },
  { id: 'u4', name: 'María López', email: 'maria@empresa.com', phone: '+52 55 4567 8901', position: 'Directora de RRHH', area_id: 'a2', role: 'admin_area', status: 'activo', created_at: '2024-01-15' },
  { id: 'u5', name: 'Jorge Ramírez', email: 'jorge@empresa.com', phone: '+52 55 5678 9012', position: 'Líder de Selección', area_id: 'a2', subarea_id: 's4', role: 'lider_subarea', status: 'activo', created_at: '2024-01-20' },
  { id: 'u6', name: 'Laura Martínez', email: 'laura@empresa.com', phone: '+52 55 6789 0123', position: 'Líder de Capacitación', area_id: 'a2', subarea_id: 's5', role: 'lider_subarea', status: 'activo', created_at: '2024-01-20' },
  { id: 'u7', name: 'Fernando Torres', email: 'fernando@empresa.com', phone: '+52 55 7890 1234', position: 'Director Financiero', area_id: 'a3', role: 'admin_area', status: 'activo', created_at: '2024-01-15' },
  { id: 'u8', name: 'Patricia Díaz', email: 'patricia@empresa.com', phone: '+52 55 8901 2345', position: 'Contadora Senior', area_id: 'a3', subarea_id: 's6', role: 'lider_subarea', status: 'activo', created_at: '2024-01-20' },
  { id: 'u9', name: 'Diego Herrera', email: 'diego@empresa.com', phone: '+52 55 9012 3456', position: 'Tesorero', area_id: 'a3', subarea_id: 's7', role: 'colaborador', status: 'activo', created_at: '2024-02-01' },
  { id: 'u10', name: 'Sofía Navarro', email: 'sofia@empresa.com', phone: '+52 55 0123 4567', position: 'Directora Comercial', area_id: 'a4', role: 'admin_area', status: 'activo', created_at: '2024-02-01' },
  { id: 'u11', name: 'Andrés Vargas', email: 'andres@empresa.com', phone: '+52 55 1111 2222', position: 'Líder Ventas Corp.', area_id: 'a4', subarea_id: 's8', role: 'lider_subarea', status: 'activo', created_at: '2024-02-01' },
  { id: 'u12', name: 'Camila Ruiz', email: 'camila@empresa.com', phone: '+52 55 3333 4444', position: 'Desarrolladora Full Stack', area_id: 'a1', subarea_id: 's1', role: 'colaborador', status: 'activo', created_at: '2024-02-15' },
  { id: 'u13', name: 'Luis Peña', email: 'luis@empresa.com', phone: '+52 55 5555 6666', position: 'Analista de Datos', area_id: 'a1', subarea_id: 's2', role: 'colaborador', status: 'activo', created_at: '2024-03-01' },
  { id: 'u14', name: 'Valentina Castro', email: 'valentina@empresa.com', phone: '+52 55 7777 8888', position: 'Ingeniera DevOps', area_id: 'a1', subarea_id: 's3', role: 'lider_subarea', status: 'activo', created_at: '2024-02-01' },
  { id: 'u0', name: 'Admin Sistema', email: 'admin@empresa.com', phone: '+52 55 0000 0000', position: 'Administrador General', area_id: 'a1', role: 'super_admin', status: 'activo', created_at: '2024-01-01' },
];

export const mockObjectives: Objective[] = [
  { id: 'o1', scope_type: 'area', scope_id: 'a1', title: 'Migración a microservicios', description: 'Migrar arquitectura monolítica a microservicios', period: '2024-Q1', owner_user_id: 'u1', start_date: '2024-01-01', end_date: '2024-06-30', priority: 'alta', status: 'activo', progress_percent: 65 },
  { id: 'o2', scope_type: 'subarea', scope_id: 's1', title: 'Rediseño del portal web', description: 'Implementar nuevo diseño responsive', period: '2024-Q1', owner_user_id: 'u2', start_date: '2024-02-01', end_date: '2024-04-30', priority: 'alta', status: 'activo', progress_percent: 80 },
  { id: 'o3', scope_type: 'area', scope_id: 'a2', title: 'Reducir rotación de personal', description: 'Disminuir rotación al 5%', period: '2024-Q1', owner_user_id: 'u4', start_date: '2024-01-01', end_date: '2024-12-31', priority: 'alta', status: 'en_riesgo', progress_percent: 35 },
  { id: 'o4', scope_type: 'subarea', scope_id: 's4', title: 'Automatizar proceso de selección', description: 'Implementar ATS para agilizar reclutamiento', period: '2024-Q2', owner_user_id: 'u5', start_date: '2024-04-01', end_date: '2024-09-30', priority: 'media', status: 'borrador', progress_percent: 10 },
  { id: 'o5', scope_type: 'area', scope_id: 'a3', title: 'Automatización de reportes financieros', description: 'Generar reportes automáticamente', period: '2024-Q1', owner_user_id: 'u7', start_date: '2024-01-01', end_date: '2024-06-30', priority: 'media', status: 'activo', progress_percent: 55 },
  { id: 'o6', scope_type: 'area', scope_id: 'a4', title: 'Incrementar ventas B2B 20%', description: 'Aumentar cartera de clientes corporativos', period: '2024-Q1', owner_user_id: 'u10', start_date: '2024-01-01', end_date: '2024-12-31', priority: 'alta', status: 'activo', progress_percent: 45 },
  { id: 'o7', scope_type: 'subarea', scope_id: 's2', title: 'Implementar API Gateway', description: 'Centralizar y securizar APIs', period: '2024-Q2', owner_user_id: 'u3', start_date: '2024-04-01', end_date: '2024-08-31', priority: 'alta', status: 'activo', progress_percent: 30 },
];

export const mockKPIs: KPI[] = [
  { id: 'k1', objective_id: 'o1', name: 'Servicios migrados', definition: '% de servicios migrados a microservicios', unit: '%', frequency: 'mensual', baseline: 0, target: 100, current_value: 65, threshold_green: 80, threshold_yellow: 50, threshold_red: 30 },
  { id: 'k2', objective_id: 'o1', name: 'Uptime post-migración', definition: 'Disponibilidad del sistema tras cada migración', unit: '%', frequency: 'semanal', baseline: 99, target: 99.9, current_value: 99.7, threshold_green: 99.5, threshold_yellow: 99, threshold_red: 98 },
  { id: 'k3', objective_id: 'o2', name: 'Páginas rediseñadas', definition: 'Número de páginas con nuevo diseño', unit: 'páginas', frequency: 'mensual', baseline: 0, target: 25, current_value: 20, threshold_green: 20, threshold_yellow: 12, threshold_red: 5 },
  { id: 'k4', objective_id: 'o3', name: 'Tasa de rotación', definition: '% de empleados que dejan la empresa', unit: '%', frequency: 'mensual', baseline: 12, target: 5, current_value: 9, threshold_green: 5, threshold_yellow: 8, threshold_red: 10 },
  { id: 'k5', objective_id: 'o5', name: 'Reportes automatizados', definition: 'Número de reportes generados automáticamente', unit: 'reportes', frequency: 'mensual', baseline: 2, target: 15, current_value: 8, threshold_green: 12, threshold_yellow: 7, threshold_red: 4 },
  { id: 'k6', objective_id: 'o6', name: 'Nuevos clientes B2B', definition: 'Clientes corporativos nuevos', unit: 'clientes', frequency: 'mensual', baseline: 10, target: 25, current_value: 14, threshold_green: 20, threshold_yellow: 14, threshold_red: 8 },
  { id: 'k7', objective_id: 'o7', name: 'Endpoints centralizados', definition: '% de endpoints migrados al gateway', unit: '%', frequency: 'mensual', baseline: 0, target: 100, current_value: 30, threshold_green: 70, threshold_yellow: 40, threshold_red: 20 },
];

export const mockMeasurements: KPIMeasurement[] = [
  { id: 'm1', kpi_id: 'k1', period_date: '2024-01', value: 15, created_by: 'u1', notes: 'Inicio de migración' },
  { id: 'm2', kpi_id: 'k1', period_date: '2024-02', value: 30, created_by: 'u1', notes: 'Servicio auth migrado' },
  { id: 'm3', kpi_id: 'k1', period_date: '2024-03', value: 45, created_by: 'u1', notes: 'Servicios de pagos migrados' },
  { id: 'm4', kpi_id: 'k1', period_date: '2024-04', value: 55, created_by: 'u1', notes: 'Servicio de notificaciones' },
  { id: 'm5', kpi_id: 'k1', period_date: '2024-05', value: 65, created_by: 'u1', notes: 'Avance constante' },
  { id: 'm6', kpi_id: 'k4', period_date: '2024-01', value: 12, created_by: 'u4', notes: 'Línea base' },
  { id: 'm7', kpi_id: 'k4', period_date: '2024-02', value: 11, created_by: 'u4', notes: 'Ligera mejora' },
  { id: 'm8', kpi_id: 'k4', period_date: '2024-03', value: 10.5, created_by: 'u4', notes: 'Nuevos beneficios' },
  { id: 'm9', kpi_id: 'k4', period_date: '2024-04', value: 9.5, created_by: 'u4', notes: 'Programa de retención' },
  { id: 'm10', kpi_id: 'k4', period_date: '2024-05', value: 9, created_by: 'u4', notes: 'En riesgo, acción necesaria' },
  { id: 'm11', kpi_id: 'k6', period_date: '2024-01', value: 10, created_by: 'u10', notes: 'Base de clientes' },
  { id: 'm12', kpi_id: 'k6', period_date: '2024-02', value: 11, created_by: 'u10', notes: '1 nuevo cliente' },
  { id: 'm13', kpi_id: 'k6', period_date: '2024-03', value: 12, created_by: 'u10', notes: 'Crecimiento lento' },
  { id: 'm14', kpi_id: 'k6', period_date: '2024-04', value: 13, created_by: 'u10', notes: 'Feria de negocios' },
  { id: 'm15', kpi_id: 'k6', period_date: '2024-05', value: 14, created_by: 'u10', notes: 'Pipeline creciendo' },
];

export const mockActivityLog: ActivityLog[] = [
  { id: 'al1', user_id: 'u1', user_name: 'Carlos Mendoza', action: 'Actualizó avance', entity: 'Objetivo', entity_id: 'o1', timestamp: '2024-05-20 14:30' },
  { id: 'al2', user_id: 'u2', user_name: 'Ana García', action: 'Registró medición', entity: 'KPI', entity_id: 'k3', timestamp: '2024-05-20 11:15' },
  { id: 'al3', user_id: 'u4', user_name: 'María López', action: 'Creó objetivo', entity: 'Objetivo', entity_id: 'o3', timestamp: '2024-05-19 16:45' },
  { id: 'al4', user_id: 'u7', user_name: 'Fernando Torres', action: 'Actualizó KPI', entity: 'KPI', entity_id: 'k5', timestamp: '2024-05-19 09:20' },
  { id: 'al5', user_id: 'u10', user_name: 'Sofía Navarro', action: 'Agregó colaborador', entity: 'Colaborador', entity_id: 'u11', timestamp: '2024-05-18 10:00' },
  { id: 'al6', user_id: 'u0', user_name: 'Admin Sistema', action: 'Creó área', entity: 'Área', entity_id: 'a4', timestamp: '2024-05-17 08:30' },
];

export const mockRoles: Role[] = [
  { id: 'r1', code: 'super_admin', name: 'Super Admin', description: 'Acceso total a todas las áreas y módulos' },
  { id: 'r2', code: 'admin_area', name: 'Admin de Área', description: 'Gestión completa de su área asignada' },
  { id: 'r3', code: 'lider_subarea', name: 'Líder de Subárea', description: 'Gestión de su subárea y visibilidad del área' },
  { id: 'r4', code: 'colaborador', name: 'Colaborador', description: 'Acceso a objetivos y KPIs asignados' },
  { id: 'r5', code: 'solo_lectura', name: 'Solo Lectura', description: 'Visualización sin edición' },
];

export const getAreaName = (id: string) => mockAreas.find(a => a.id === id)?.name ?? 'N/A';
export const getSubareaName = (id: string) => mockSubareas.find(s => s.id === id)?.name ?? '';
export const getUserName = (id: string) => mockCollaborators.find(u => u.id === id)?.name ?? 'N/A';
