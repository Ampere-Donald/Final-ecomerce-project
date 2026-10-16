import { ConflictException } from '@nestjs/common';
import { DocumentationValeurService } from './documentation-valeur.service';

describe('Relecture explicite et versions de documentation', () => {
  const input = {
    version: 0,
    valeurVersion: 1,
    attributVersion: 1,
    produitVersion: 1,
    etat: 'A_VERIFIER' as const,
    sourceUrl: 'https://manufacturer.example/spec.pdf',
    sourceDocument: 'Modèle exact',
    sourceRepere: 'Page 1',
    motif: 'Conditions relues',
    confirmerRelecture: true,
  };
  function setup() {
    const value = {
      id: 'value-id',
      valeur: '1000 mA',
      version: 1,
      attribut: { version: 1, produit: { version: 1 } },
      documentation: null,
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: value.id }]),
      valeurAttribut: { findUnique: jest.fn().mockResolvedValue(value) },
      documentationValeur: {
        upsert: jest
          .fn()
          .mockImplementation(({ create }) => ({ ...create, version: 1 })),
      },
    };
    const db = {
      $transaction: (fn: any) => fn(tx),
      valeurAttribut: tx.valeurAttribut,
    };
    return { service: new DocumentationValeurService(db as any), tx, value };
  }
  it('exige une confirmation explicite avant tout accès à la base', async () => {
    const { service, tx } = setup();
    await expect(
      service.write(
        'value-id',
        { ...input, confirmerRelecture: false } as any,
        'admin',
        true,
      ),
    ).rejects.toThrow();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
  it.each([
    { version: 1 },
    { valeurVersion: 2 },
    { attributVersion: 2 },
    { produitVersion: 2 },
  ])('refuse un contexte périmé %j', (patch) => {
    const { service, tx } = setup();
    return expect(
      service.write('value-id', { ...input, ...patch }, 'admin', true),
    )
      .rejects.toThrow(ConflictException)
      .then(() => expect(tx.documentationValeur.upsert).not.toHaveBeenCalled());
  });
  it('horodate et identifie la vraie action serveur sans accepter de champs forgés', async () => {
    const { service, tx } = setup();
    const result = await service.write(
      'value-id',
      {
        ...input,
        reluParId: 'forged',
        reluLe: 'yesterday',
        valeurSource: 'fake',
      } as any,
      'actual-admin',
      true,
    );
    expect(tx.documentationValeur.upsert.mock.calls[0][0].create).toMatchObject(
      {
        valeurSource: '1000 mA',
        reluParId: 'actual-admin',
        reluLe: expect.any(Date),
        etat: 'DOCUMENTE',
      },
    );
    expect(result.effective).not.toHaveProperty('reluParId');
  });
  it('une modification repasse à vérifier et retire la relecture précédente', async () => {
    const { service, tx } = setup();
    await service.write('value-id', input, 'actual-admin');
    expect(tx.documentationValeur.upsert.mock.calls[0][0].update).toMatchObject(
      {
        etat: 'A_VERIFIER',
        reluParId: null,
        reluLe: null,
        version: { increment: 1 },
      },
    );
  });
});
