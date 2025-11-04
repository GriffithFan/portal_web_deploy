import { TopologyIcon, SwitchIcon, WifiIcon, ServerIcon } from '../components/dashboard/DashboardIcons';

/**
 * Secciones por defecto del dashboard
 */
export const DEFAULT_SECTIONS = [
  { k: 'topology', t: 'Topología', IconComponent: TopologyIcon },
  { k: 'switches', t: 'Switches', IconComponent: SwitchIcon },
  { k: 'access_points', t: 'Puntos de acceso', IconComponent: WifiIcon },
  { k: 'appliance_status', t: 'Estado (appliances)', IconComponent: ServerIcon }
];

/**
 * Configuración por defecto para uplinks
 */
export const DEFAULT_UPLINK_TIMESPAN = 24 * 3600; // 24h
export const DEFAULT_UPLINK_RESOLUTION = 300; // 5 min buckets
