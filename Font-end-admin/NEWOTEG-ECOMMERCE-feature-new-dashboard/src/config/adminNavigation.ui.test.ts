import { describe, expect, it } from 'vitest';
import { administrationCounterAction, administrationNavigation, getAdministrationNavigation } from './adminNavigation';

describe('administrationNavigation', () => {
  it('limite chaque rôle à cinq destinations distinctes', () => {
    expect(administrationNavigation.SUPER_ADMIN).toHaveLength(5);
    expect(administrationNavigation.ADMIN).toHaveLength(5);
    expect(new Set(administrationNavigation.SUPER_ADMIN.map((item) => item.path)).size).toBe(5);
    expect(new Set(administrationNavigation.ADMIN.map((item) => item.path)).size).toBe(5);
  });

  it('sépare le pilotage du superadministrateur des opérations de l’administrateur', () => {
    expect(getAdministrationNavigation('SUPER_ADMIN').map((item) => item.path)).toEqual([
      '/', '/a-valider', '/finance', '/stock-achats', '/equipe-acces',
    ]);
    expect(getAdministrationNavigation('ADMIN').map((item) => item.path)).toEqual([
      '/', '/ventes-commandes', '/stock-achats', '/clients', '/caisse-admin',
    ]);
    expect(administrationCounterAction.SUPER_ADMIN.path).toBe('/pos');
    expect(administrationCounterAction.ADMIN.path).toBe('/pos');
  });

  it('ne fabrique aucune navigation pour un rôle de comptoir', () => {
    expect(getAdministrationNavigation('CAISSIER')).toEqual([]);
    expect(getAdministrationNavigation('VENDEUR')).toEqual([]);
  });
});
