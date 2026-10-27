import { lazy, type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceScreen } from './WorkspaceScreen';

describe('Chargement isolé des rubriques', () => {
  it('conserve le menu pendant le chargement d’une page', () => {
    const Page = lazy(() => new Promise<{ default: () => ReactElement }>(() => {}));
    render(<MemoryRouter><nav>Menu boutique</nav><WorkspaceScreen routeKey="/produits"><Page /></WorkspaceScreen></MemoryRouter>);
    expect(screen.getByRole('navigation').textContent).toBe('Menu boutique');
    expect(screen.getByRole('status', { name: 'Chargement de la page' })).toBeTruthy();
  });
  it('permet de changer de rubrique après une erreur de module', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => { throw new Error('Failed to fetch dynamically imported module'); };
    const { rerender } = render(<MemoryRouter><nav>Menu boutique</nav><WorkspaceScreen routeKey="/produits"><Broken /></WorkspaceScreen></MemoryRouter>);
    expect(screen.getByRole('alert').textContent).toContain('Cette page n’a pas pu se charger');
    expect(screen.getByRole('navigation')).toBeTruthy();
    rerender(<MemoryRouter><nav>Menu boutique</nav><WorkspaceScreen routeKey="/prix-a-renseigner"><h1>Prix à renseigner</h1></WorkspaceScreen></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Prix à renseigner' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    consoleError.mockRestore();
  });
});
