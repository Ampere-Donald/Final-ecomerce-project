import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoleDashboard } from './RoleDashboard';
import { MemoryRouter } from 'react-router-dom';

const authState = vi.hoisted(() => ({ role: 'ADMIN' }));

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({ admin: { role: authState.role } }),
}));
vi.mock('./Dashboard', () => ({ Dashboard: () => <div>Tableau de bord historique</div> }));
vi.mock('./AdministrationDashboard', () => ({ AdministrationDashboard: () => <div>Vue superadministrateur</div> }));

describe('RoleDashboard', () => {
  it('affiche le tableau de bord historique pour ADMIN', () => {
    authState.role = 'ADMIN';
    render(<RoleDashboard />);
    expect(screen.getByText('Tableau de bord historique')).toBeTruthy();
    expect(screen.queryByText('Vue superadministrateur')).toBeNull();
  });

  it('conserve la vue dédiée au SUPER_ADMIN', () => {
    authState.role = 'SUPER_ADMIN';
    render(<RoleDashboard />);
    expect(screen.getByText('Vue superadministrateur')).toBeTruthy();
  });

  it('donne au responsable un accueil centré sur son catalogue', () => {
    authState.role = 'MANAGER';
    render(<MemoryRouter><RoleDashboard /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Consulter le catalogue/ }).getAttribute('href')).toBe('/produits');
    expect(screen.getByRole('link', { name: /Scanner un article/ }).getAttribute('href')).toBe('/scan-code');
    expect(screen.queryByText('Tableau de bord historique')).toBeNull();
  });
});
