import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RoleProtectedRoute } from './RoleProtectedRoute';

const state = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('../context/AdminAuthContext', () => ({ useAdminAuth: () => ({ admin: { role: state.role } }) }));

const renderProtected = () => render(
  <MemoryRouter initialEntries={['/a-valider']}>
    <Routes>
      <Route path="/" element={<p>Accueil rôle</p>} />
      <Route path="/a-valider" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><p>Décisions sensibles</p></RoleProtectedRoute>} />
    </Routes>
  </MemoryRouter>,
);

describe('RoleProtectedRoute', () => {
  it('autorise le superadministrateur', () => {
    state.role = 'SUPER_ADMIN';
    renderProtected();
    expect(screen.getByText('Décisions sensibles')).toBeTruthy();
  });

  it('redirige un administrateur hors du centre sensible', () => {
    state.role = 'ADMIN';
    renderProtected();
    expect(screen.getByText('Accueil rôle')).toBeTruthy();
    expect(screen.queryByText('Décisions sensibles')).toBeNull();
  });
});
