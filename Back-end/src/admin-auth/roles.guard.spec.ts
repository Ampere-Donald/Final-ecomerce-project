import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const contextFor = (role?: string) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as any);

  it.each([
    ['SUPER_ADMIN', ['SUPER_ADMIN'], true],
    ['ADMIN', ['SUPER_ADMIN'], false],
    ['VENDEUR', ['VENDEUR', 'CAISSIER'], true],
    ['CAISSIER', ['VENDEUR', 'CAISSIER'], true],
  ])('évalue explicitement le rôle %s', (role, required, expected) => {
    const guard = new RolesGuard({
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as any);
    expect(guard.canActivate(contextFor(role))).toBe(expected);
  });

  it('refuse par défaut si aucun rôle n’est déclaré', () => {
    const guard = new RolesGuard({
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as any);
    expect(guard.canActivate(contextFor('SUPER_ADMIN'))).toBe(false);
  });
});
