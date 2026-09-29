import { rankCandidates, referenceHints } from './candidate-ranking';

describe('Marking retrieval (not compatibility)', () => {
  it('reconnait les marquages compacts et espacés sans absorber le nom de famille', () => {
    expect(referenceHints('diode 1N4004 et BC 547')).toEqual([
      { compact: '1n4004', prefix: '1n', spaced: '1n 4004' },
      { compact: 'bc547', prefix: 'bc', spaced: 'bc 547' },
    ]);
    expect(referenceHints('DIODE REDRES 1N4007')[0].compact).toBe('1n4007');
    expect(referenceHints('BC547, signal 5 V 10 mA')).toEqual([
      { compact: 'bc547', prefix: 'bc', spaced: 'bc 547' },
    ]);
  });
  it('conserve la cible et les autres marquages de même préfixe avant les mots génériques', () => {
    const make = (id: string, name: string) => ({
      id,
      nomProduit: name,
      code: null,
    });
    const products = [
      ...Array.from({ length: 80 }, (_, i) =>
        make(String(i), `Transistor test ${i}`),
      ),
      make('target', 'BC 547'),
      make('alternative', 'BC 548'),
    ];
    const result = rankCandidates('transistor BC547', products);
    expect(result).toHaveLength(40);
    expect(result.slice(0, 2).map((p) => p.id)).toEqual([
      'target',
      'alternative',
    ]);
    expect(rankCandidates('transistor BC547', [...products].reverse())).toEqual(
      result,
    );
  });
});
