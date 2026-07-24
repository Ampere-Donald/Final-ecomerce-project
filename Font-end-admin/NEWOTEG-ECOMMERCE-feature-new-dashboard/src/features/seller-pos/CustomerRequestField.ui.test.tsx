import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CustomerRequestField } from './CustomerRequestField';

describe('CustomerRequestField', () => {
  it('ajoute une demande rapide et explique sa destination', () => {
    const onChange = vi.fn();
    render(<CustomerRequestField value="" onChange={onChange} />);

    expect(screen.getByText(/mise en évidence pour le caissier/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /facture demandée/i }));

    expect(onChange).toHaveBeenCalledWith('Facture demandée');
  });
});
