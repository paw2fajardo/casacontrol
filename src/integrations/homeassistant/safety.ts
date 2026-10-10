import type { ActionValidationResult, HAActionRequestBody } from './types.js';

/**
 * Service allowlist mapping permitted domains to allowed services.
 */
export const ALLOWED_SERVICES: Record<string, string[]> = {
  switch: ['turn_on', 'turn_off', 'toggle'],
  light: ['turn_on', 'turn_off', 'toggle'],
  lock: ['lock', 'unlock', 'open'],
  cover: ['open_cover', 'close_cover', 'stop_cover', 'toggle'],
  climate: ['set_temperature', 'set_hvac_mode', 'set_preset_mode', 'turn_on', 'turn_off'],
  fan: ['turn_on', 'turn_off', 'toggle', 'set_percentage'],
  media_player: ['media_play_pause', 'media_play', 'media_pause', 'media_stop', 'turn_on', 'turn_off', 'volume_set', 'volume_mute'],
  scene: ['turn_on'],
  script: ['turn_on', 'reload'],
  alarm_control_panel: [
    'alarm_arm_away',
    'alarm_arm_home',
    'alarm_arm_night',
    'alarm_arm_vacation',
    'alarm_disarm',
    'alarm_trigger',
  ],
};

/**
 * Identify if an entity is high-impact (locks, garage doors, alarm panels).
 */
export function isHighImpactEntity(
  entityId: string,
  attributes?: Record<string, any>
): boolean {
  if (!entityId || typeof entityId !== 'string') {
    return false;
  }

  const [domain] = entityId.split('.');
  const lowerEntityId = entityId.toLowerCase();

  // Locks
  if (domain === 'lock') {
    return true;
  }

  // Alarm panels
  if (domain === 'alarm_control_panel') {
    return true;
  }

  // Security switches (e.g. guard_mode, alarm switches)
  if (domain === 'switch') {
    if (
      lowerEntityId.includes('guard_mode') ||
      lowerEntityId.includes('_alarm') ||
      lowerEntityId.endsWith('alarm') ||
      attributes?.device_class === 'security'
    ) {
      return true;
    }
  }

  // Garage doors: cover where device_class is 'garage' or entity_id contains 'garage'
  if (domain === 'cover') {
    const deviceClass = attributes?.device_class?.toLowerCase?.();
    if (deviceClass === 'garage' || lowerEntityId.includes('garage')) {
      return true;
    }
  }

  return false;
}

/**
 * Validates an action request against the safety allowlist and confirmation requirements.
 */
export function validateActionRequest(
  request: Partial<HAActionRequestBody>,
  entityAttributes?: Record<string, any>
): ActionValidationResult {
  const { entity_id, domain, service, confirmed } = request;

  if (!entity_id || typeof entity_id !== 'string') {
    return {
      allowed: false,
      message: 'Invalid or missing entity_id',
    };
  }

  if (!domain || typeof domain !== 'string') {
    return {
      allowed: false,
      message: 'Invalid or missing domain',
    };
  }

  if (!service || typeof service !== 'string') {
    return {
      allowed: false,
      message: 'Invalid or missing service',
    };
  }

  // Check entity_id domain matches request domain
  const [entityDomain] = entity_id.split('.');
  if (entityDomain && entityDomain !== domain) {
    return {
      allowed: false,
      message: `Domain mismatch: entity_id '${entity_id}' does not belong to domain '${domain}'`,
    };
  }

  // Check allowlist
  const allowedServices = ALLOWED_SERVICES[domain];
  if (!allowedServices || !allowedServices.includes(service)) {
    return {
      allowed: false,
      message: `Service '${domain}.${service}' is not permitted by safety allowlist`,
    };
  }

  // Check high-impact confirmation
  const isHighImpact = isHighImpactEntity(entity_id, entityAttributes);
  if (isHighImpact && confirmed !== true) {
    return {
      allowed: false,
      requiresConfirmation: true,
      message: 'Confirmation required for high-impact action',
    };
  }

  return {
    allowed: true,
  };
}
