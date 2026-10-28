import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { PricingProgressCard } from './PricingProgressCard';

const state = vi.hoisted(() => ({ summary: null as null | { totalCount: number; pricedCount: number; missingCount: number } }));
vi.mock('../context/CataloguePricingContext', () => ({ useCataloguePricing: () => state }));
beforeEach(() => { state.summary = null; });
const renderCard = () => render(<MemoryRouter><Routes><Route path="/" element={<PricingProgressCard />} /><Route path="/revision-catalogue" element={<h1>Révision du catalogue ouverte</h1>} /></Routes></MemoryRouter>);

it('ouvre la révision générale depuis l’accueil même sans chargement des compteurs', async () => {
  renderCard();
  await userEvent.click(screen.getByRole('link', { name: /Vérifier le catalogue/ }));
  expect(screen.getByRole('heading', { name: 'Révision du catalogue ouverte' })).toBeTruthy();
});
it('garde la révision générale visible quand tous les articles ont déjà un prix', () => {
  state.summary = { totalCount: 100, pricedCount: 100, missingCount: 0 };
  renderCard();
  expect(screen.getByRole('link', { name: /Vérifier le catalogue/ }).getAttribute('href')).toBe('/revision-catalogue');
  expect(screen.queryByText(/articles attendent/)).toBeNull();
});
it('présente deux destinations distinctes pour les prix existants et les tarifs manquants', () => {
  state.summary = { totalCount: 100, pricedCount: 90, missingCount: 10 };
  renderCard();
  expect(screen.getByRole('link', { name: /Vérifier le catalogue/ }).getAttribute('href')).toBe('/revision-catalogue');
  expect(screen.getByRole('link', { name: /10 articles attendent leur prix/ }).getAttribute('href')).toBe('/prix-a-renseigner');
});
