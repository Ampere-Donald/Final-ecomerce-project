import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ResponsiveTable } from './ResponsiveTable';

describe('Tableaux lisibles sur téléphone', () => {
  it('associe chaque valeur à son en-tête et conserve les actions', async () => {
    const action = vi.fn();
    render(<ResponsiveTable><thead><tr><th>Article</th><th><span>Montant</span> FCFA</th><th>Actions</th></tr></thead><tbody>{[1, 2].map(id => <tr key={id}><td>Article {id}</td><td>1 500</td><td><button onClick={action}>Voir {id}</button></td></tr>)}</tbody></ResponsiveTable>);
    expect(screen.getByText('Article 1').getAttribute('data-label')).toBe('Article');
    expect(screen.getAllByText('1 500')[0].getAttribute('data-label')).toBe('Montant FCFA');
    await userEvent.click(screen.getByRole('button', { name: 'Voir 2' }));
    expect(action).toHaveBeenCalledOnce();
  });
  it('garde les messages vides sur toute la largeur', () => {
    render(<ResponsiveTable><thead><tr><th>Nom</th><th>Prix</th></tr></thead><tbody><tr><td colSpan={2}>Aucun article</td></tr></tbody></ResponsiveTable>);
    expect(screen.getByText('Aucun article').getAttribute('data-wide')).toBe('true');
  });
});
