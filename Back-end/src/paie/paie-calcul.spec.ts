import { calculerPaie, DEFAULT_RATES } from './paie-calcul';

describe('paie-calcul (Cameroun, légal simplifié)', () => {
  it('calcule CNPS/IRPP/CAC/CFC pour un salaire de base de 300 000', () => {
    const r = calculerPaie({
      gains: [{ libelle: 'Salaire de base', montant: 300000 }],
      rates: DEFAULT_RATES,
    });
    expect(r.brutTotal).toBe(300000);
    expect(r.cnps).toBe(12600); // 4,2 % × 300 000
    expect(r.irpp).toBe(15573); // barème 10 % / 12
    expect(r.cac).toBe(1557); // 10 % IRPP
    expect(r.cfc).toBe(3000); // 1 % brut
    expect(r.totalRetenues).toBe(32730);
    expect(r.netAPayer).toBe(267270);
  });

  it('plafonne l’assiette CNPS à 750 000', () => {
    const r = calculerPaie({
      gains: [{ libelle: 'Salaire de base', montant: 1_000_000 }],
      rates: DEFAULT_RATES,
    });
    expect(r.cnps).toBe(31500); // 4,2 % × 750 000 (et non × 1 000 000)
    expect(r.netAPayer).toBe(r.brutTotal - r.totalRetenues);
  });

  it('n’applique pas d’IRPP sous le seuil d’abattement (petit salaire)', () => {
    const r = calculerPaie({
      gains: [{ libelle: 'Salaire de base', montant: 60000 }],
      rates: DEFAULT_RATES,
    });
    expect(r.irpp).toBe(0);
    expect(r.cac).toBe(0);
    expect(r.cnps).toBe(2520);
    expect(r.cfc).toBe(600);
    expect(r.netAPayer).toBe(56880);
  });

  it('agrège les primes dans le brut et génère les lignes attendues', () => {
    const r = calculerPaie({
      gains: [
        { libelle: 'Salaire de base', montant: 200000 },
        { libelle: 'Prime de transport', montant: 25000 },
      ],
      retenuesManuelles: [{ libelle: 'Acompte', montant: 10000 }],
      rates: DEFAULT_RATES,
    });
    expect(r.brutTotal).toBe(225000);
    expect(r.autresRetenues).toBe(10000);
    // 2 gains + 4 retenues système + 1 retenue manuelle
    expect(r.lignes).toHaveLength(7);
    expect(r.lignes.filter((l) => l.type === 'GAIN')).toHaveLength(2);
    expect(r.netAPayer).toBe(r.brutTotal - r.totalRetenues);
  });
});
