import { describe, it, expect } from 'vitest';
import { isHighImpactEntity, validateActionRequest } from '../safety.js';

describe('Safety Enforcement', () => {
  describe('isHighImpactEntity', () => {
    it('identifies lock entities as high impact', () => {
      expect(isHighImpactEntity('lock.front_door')).toBe(true);
      expect(isHighImpactEntity('lock.back_door')).toBe(true);
      expect(isHighImpactEntity('lock.garage_side_door')).toBe(true);
    });

    it('identifies alarm_control_panel entities as high impact', () => {
      expect(isHighImpactEntity('alarm_control_panel.home_alarm')).toBe(true);
    });

    it('identifies garage doors as high impact via device_class', () => {
      expect(
        isHighImpactEntity('cover.main_door', { device_class: 'garage' })
      ).toBe(true);
      expect(
        isHighImpactEntity('cover.door_1', { device_class: 'GARAGE' })
      ).toBe(true);
    });

    it('identifies garage doors as high impact via entity_id substring', () => {
      expect(isHighImpactEntity('cover.garage_door')).toBe(true);
      expect(isHighImpactEntity('cover.garage_bay_1')).toBe(true);
      expect(isHighImpactEntity('cover.left_garage')).toBe(true);
    });

    it('identifies security switches like guard mode and alarm switches as high impact', () => {
      expect(isHighImpactEntity('switch.lumi_sg_274891445_mieu01_guard_mode_p_2_1')).toBe(true);
      expect(isHighImpactEntity('switch.lumi_sg_274891445_mieu01_alarm_p_3_1')).toBe(true);
    });

    it('returns false for regular covers (blinds, curtains, shades)', () => {
      expect(
        isHighImpactEntity('cover.living_room_blind', { device_class: 'blind' })
      ).toBe(false);
      expect(isHighImpactEntity('cover.bedroom_curtain')).toBe(false);
    });

    it('returns false for non-high-impact domains (lights, switches, sensors, climate)', () => {
      expect(isHighImpactEntity('light.living_room')).toBe(false);
      expect(isHighImpactEntity('switch.garage_light')).toBe(false);
      expect(isHighImpactEntity('climate.living_room')).toBe(false);
      expect(isHighImpactEntity('sensor.temperature')).toBe(false);
    });

    it('handles invalid or empty entityId gracefully', () => {
      expect(isHighImpactEntity('')).toBe(false);
      expect(isHighImpactEntity(null as any)).toBe(false);
      expect(isHighImpactEntity(undefined as any)).toBe(false);
    });
  });

  describe('validateActionRequest', () => {
    it('allows valid standard switch action without confirmation', () => {
      const res = validateActionRequest({
        entity_id: 'switch.living_room_lamp',
        domain: 'switch',
        service: 'turn_on',
      });
      expect(res.allowed).toBe(true);
      expect(res.requiresConfirmation).toBeUndefined();
    });

    it('allows valid light toggle action without confirmation', () => {
      const res = validateActionRequest({
        entity_id: 'light.kitchen_ceiling',
        domain: 'light',
        service: 'toggle',
      });
      expect(res.allowed).toBe(true);
    });

    it('rejects high-impact lock action when confirmed is not true', () => {
      const res = validateActionRequest({
        entity_id: 'lock.front_door',
        domain: 'lock',
        service: 'unlock',
        confirmed: false,
      });
      expect(res.allowed).toBe(false);
      expect(res.requiresConfirmation).toBe(true);
      expect(res.message).toBe('Confirmation required for high-impact action');
    });

    it('allows high-impact lock action when confirmed is true', () => {
      const res = validateActionRequest({
        entity_id: 'lock.front_door',
        domain: 'lock',
        service: 'unlock',
        confirmed: true,
      });
      expect(res.allowed).toBe(true);
    });

    it('rejects high-impact garage cover action without confirmed: true', () => {
      const res = validateActionRequest({
        entity_id: 'cover.garage_door',
        domain: 'cover',
        service: 'open_cover',
      });
      expect(res.allowed).toBe(false);
      expect(res.requiresConfirmation).toBe(true);
    });

    it('allows high-impact garage cover action when confirmed: true', () => {
      const res = validateActionRequest({
        entity_id: 'cover.garage_door',
        domain: 'cover',
        service: 'open_cover',
        confirmed: true,
      });
      expect(res.allowed).toBe(true);
    });

    it('rejects alarm disarm without confirmation', () => {
      const res = validateActionRequest({
        entity_id: 'alarm_control_panel.home',
        domain: 'alarm_control_panel',
        service: 'alarm_disarm',
      });
      expect(res.allowed).toBe(false);
      expect(res.requiresConfirmation).toBe(true);
    });

    it('allows alarm disarm when confirmed is true', () => {
      const res = validateActionRequest({
        entity_id: 'alarm_control_panel.home',
        domain: 'alarm_control_panel',
        service: 'alarm_disarm',
        confirmed: true,
      });
      expect(res.allowed).toBe(true);
    });

    it('rejects unknown or arbitrary domains/services not in allowlist', () => {
      const res = validateActionRequest({
        entity_id: 'homeassistant.restart',
        domain: 'homeassistant',
        service: 'restart',
      });
      expect(res.allowed).toBe(false);
      expect(res.message).toContain('not permitted by safety allowlist');
    });

    it('rejects disallowed service within known domain', () => {
      const res = validateActionRequest({
        entity_id: 'switch.some_switch',
        domain: 'switch',
        service: 'delete_device',
      });
      expect(res.allowed).toBe(false);
      expect(res.message).toContain('not permitted by safety allowlist');
    });

    it('rejects domain mismatch between entity_id and domain parameter', () => {
      const res = validateActionRequest({
        entity_id: 'light.kitchen',
        domain: 'switch',
        service: 'turn_on',
      });
      expect(res.allowed).toBe(false);
      expect(res.message).toContain('Domain mismatch');
    });

    it('rejects missing parameters', () => {
      expect(validateActionRequest({} as any).allowed).toBe(false);
      expect(
        validateActionRequest({ entity_id: 'light.test' } as any).allowed
      ).toBe(false);
      expect(
        validateActionRequest({ entity_id: 'light.test', domain: 'light' } as any)
          .allowed
      ).toBe(false);
    });
  });
});
