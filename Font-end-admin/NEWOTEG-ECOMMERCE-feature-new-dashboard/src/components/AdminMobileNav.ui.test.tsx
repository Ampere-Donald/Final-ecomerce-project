import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdminMobileNav } from './AdminMobileNav';
import { can } from '../utils/permissions';
const authState = vi.hoisted(() => ({ role: 'SUPER_ADMIN' }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: { role: authState.role } }) }));

describe('Navigation mobile de toute la boutique', () => {
  it.each(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VENDEUR', 'CAISSIER'])('%s retrouve les prix et toutes les rubriques', async role => {
    authState.role = role;
    const onMenuClick = vi.fn();
    render(<MemoryRouter><AdminMobileNav onMenuClick={onMenuClick} /></MemoryRouter>);
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.getByRole('link', { name: 'Accueil' }).getAttribute('href')).toBe('/');
    expect(screen.getByRole('link', { name: 'Prix' }).getAttribute('href')).toBe('/prix-a-renseigner');
    expect(can.renseignerPrixManquants(role)).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir toutes les rubriques' }));
    expect(onMenuClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button').getAttribute('aria-controls')).toBe('workspace-menu');
  });
  it.each([
    ['SUPER_ADMIN', 'À valider', '/a-valider'], ['ADMIN', 'Ventes', '/ventes'],
    ['MANAGER', 'Produits', '/produits'], ['VENDEUR', 'Vendre', '/pos'], ['CAISSIER', 'Encaisser', '/file-caissier'],
  ])('garde la tâche principale de %s', (role, label, path) => {
    authState.role = role;
    render(<MemoryRouter><AdminMobileNav onMenuClick={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(path);
  });
  it('cache les destinations pendant une étape de vente concentrée', () => {
    authState.role = 'VENDEUR';
    render(<MemoryRouter><AdminMobileNav hidden onMenuClick={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
