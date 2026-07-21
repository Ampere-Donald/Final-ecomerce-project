import { describe, expect, it } from 'vitest';
import { getRoleHomePath } from './roleRouting';

describe('getRoleHomePath', () => {
  it.each([
    ['CAISSIER', '/file-caissier'],
    ['VENDEUR', '/pos'],
    ['ADMIN', '/'],
    ['SUPER_ADMIN', '/'],
  ])('routes %s to %s after login', (role, expectedPath) => {
    expect(getRoleHomePath(role)).toBe(expectedPath);
  });

  it('normalizes role casing and surrounding spaces', () => {
    expect(getRoleHomePath('  caissier ')).toBe('/file-caissier');
    expect(getRoleHomePath('vendeur')).toBe('/pos');
  });

  it('uses the dashboard as a safe fallback for missing or unknown roles', () => {
    expect(getRoleHomePath()).toBe('/');
    expect(getRoleHomePath(null)).toBe('/');
    expect(getRoleHomePath('MANAGER')).toBe('/');
  });
});
