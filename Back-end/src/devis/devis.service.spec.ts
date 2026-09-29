import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DevisService } from './devis.service';
import { DevisController } from './devis.controller';
import { CreateDemandeDevisDto, ResolveDevisDto } from './dto/devis.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { ROLES_KEY } from '../admin-auth/roles.decorator';

const productId = '00000000-0000-4000-8000-000000000001';
const dto = (): CreateDemandeDevisDto => ({
  requestId: '00000000-0000-4000-8000-000000000002',
  telephone: '+237600000000',
  modeReception: 'RETRAIT_MAGASIN',
  lignes: [{ reference: ' LM358-N ', quantite: 2, produitId: productId }],
});
const row = (values: any = {}) => ({
  id: 'request',
  clientId: 'client',
  nomClient: 'Nom serveur',
  telephone: '+237600000000',
  modeReception: 'RETRAIT_MAGASIN',
  destination: null,
  notes: null,
  statut: 'RECUE',
  responsableId: null,
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  lignes: [],
  reponseClient: null,
  offre: null,
  ...values,
});
function harness() {
  let saved: any = null;
  const tx = {
    client: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ nom: 'Nom serveur', prenom: null }),
    },
    produit: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: productId, nomProduit: 'Nom fabricant', quantiteStock: 1 },
        ]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    demandeDevis: {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockImplementation(async () => saved),
      create: jest.fn().mockImplementation(async ({ data }) => {
        saved = row({ ...data, lignes: data.lignes.create });
        return saved;
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(row()),
    },
    demandeDevisEvent: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    demandeDevisLigne: { deleteMany: jest.fn(), createMany: jest.fn() },
    proforma: { findUnique: jest.fn() },
  };
  const db = {
    ...tx,
    $transaction: jest.fn().mockImplementation((action) => action(tx)),
    demandeDevis: {
      ...tx.demandeDevis,
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const proformas = { findOne: jest.fn().mockResolvedValue({}) };
  return {
    tx,
    db,
    proformas,
    service: new DevisService(db as any, proformas as any),
  };
}
const quote = (values: any = {}) => ({
  id: 'proforma',
  clientId: 'client',
  vendeurId: 'seller',
  numero: 'FP-DEMO',
  statut: 'EN_COURS',
  dateExpiration: new Date(Date.now() + 86400000),
  montantTotal: 10000,
  notes: 'INTERNAL_NOTES_NEVER_PUBLIC',
  client: { motDePasse: 'NEVER_PUBLIC' },
  lignes: [
    {
      produitId: productId,
      nomProduit: 'Nom fabricant',
      quantite: 2,
      prixUnitaire: 5000,
    },
  ],
  ...values,
});
const reply = {
  version: 1,
  statut: 'ENVOYEE' as const,
  message: 'Offre de démonstration',
  proformaId: 'proforma',
};

describe('Customer quote requests', () => {
  it('bounds list size and quantities and requires a destination for delivery', async () => {
    for (const value of [0, -1, 1.5, 100001]) {
      expect(
        (
          await validate(
            plainToInstance(ResolveDevisDto, {
              lignes: [{ reference: 'LM358-N', quantite: value }],
            }),
          )
        ).length,
      ).toBeGreaterThan(0);
    }
    expect(
      (
        await validate(
          plainToInstance(ResolveDevisDto, {
            lignes: Array.from({ length: 51 }, () => ({
              reference: 'a',
              quantite: 1,
            })),
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(CreateDemandeDevisDto, {
            ...dto(),
            modeReception: 'LIVRAISON',
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });

  it('preserves critical suffixes, queries active public fields and leaves ambiguous candidates for explicit selection', async () => {
    const { tx, service } = harness();
    tx.produit.findMany.mockResolvedValue([
      { id: productId, nomProduit: 'LM358-N', code: 'LM358-N' },
      { id: 'other', nomProduit: 'LM358-N', code: 'LM358-N' },
    ]);
    const result = await service.resolve(dto());
    expect(result.lignes[0].match).toBe('ambiguous');
    expect(result.lignes[0].produitId).toBeUndefined();
    const query = tx.produit.findMany.mock.calls[0][0] as any;
    expect(query.where.estActif).toBe(true);
    expect(query.where.OR[0].code.equals).toBe('LM358-N');
    expect(query.select.cmupActuel).toBeUndefined();
    expect(query.take).toBe(8);
  });

  it('creates an owned request using server identity, no client price, no stock reservation, and replays once', async () => {
    const { tx, service } = harness();
    const first = await service.create('client', {
      ...dto(),
      clientId: 'someone-else',
      montantTotal: 1,
    } as any);
    const second = await service.create('client', dto());
    expect(first).toEqual(second);
    expect(tx.demandeDevis.create).toHaveBeenCalledTimes(1);
    const data = tx.demandeDevis.create.mock.calls[0][0].data;
    expect(data.clientId).toBe('client');
    expect(data.nomClient).toBe('Nom serveur');
    expect(data.lignes.create[0].nomProduit).toBe('Nom fabricant');
    expect(data.montantTotal).toBeUndefined();
    expect(first.fingerprint).toBeUndefined();
    expect(first.requestId).toBeUndefined();
    expect(tx.produit.update).not.toHaveBeenCalled();
    expect(tx.produit.updateMany).not.toHaveBeenCalled();
    await expect(service.create('other-client', dto())).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      service.create('client', {
        ...dto(),
        lignes: [{ ...dto().lignes[0], quantite: 3 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('fails instead of binding a chosen reference that was removed from the catalogue', async () => {
    const { tx, service } = harness();
    tx.produit.findMany.mockResolvedValue([]);
    await expect(service.create('client', dto())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.demandeDevis.create).not.toHaveBeenCalled();
  });

  it('never returns another client request or administrative history through customer endpoints', async () => {
    const { db, service } = harness();
    db.demandeDevis.findFirst.mockResolvedValue(null);
    await expect(
      service.findMineOne('client', 'other-request'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.demandeDevis.findFirst.mock.calls[0][0].where).toEqual({
      id: 'other-request',
      clientId: 'client',
    });
    await service.findMine('client');
    const query = db.demandeDevis.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ clientId: 'client' });
    expect(query.select.historique).toBeUndefined();
    expect(query.select.fingerprint).toBeUndefined();
  });

  it('restricts seller queues to unassigned or owned requests, and refuses another seller assignment', async () => {
    const { tx, db, service } = harness();
    await service.findForAdmin({ id: 'seller', role: 'VENDEUR' });
    expect(db.demandeDevis.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ responsableId: 'seller' }, { responsableId: null }],
    });
    tx.demandeDevis.findUnique.mockResolvedValue(
      row({ responsableId: 'another-seller' }),
    );
    await expect(
      service.respond({ id: 'seller', role: 'VENDEUR' }, 'request', {
        ...reply,
        statut: 'A_PRECISER',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.demandeDevis.updateMany).not.toHaveBeenCalled();
  });

  it('requires optimistic version acceptance before altering a response', async () => {
    const { tx, service } = harness();
    tx.demandeDevis.findUnique.mockResolvedValue(row({ version: 2 }));
    await expect(
      service.respond({ id: 'seller', role: 'ADMIN' }, 'request', reply),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.demandeDevis.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    { clientId: 'someone-else' },
    { statut: 'TRANSFORMEE' },
    { dateExpiration: new Date(0) },
    { montantTotal: 1 },
  ])(
    'rejects an unrelated, transformed, expired or inconsistent proforma: %j',
    async (values) => {
      const { tx, service } = harness();
      tx.demandeDevis.findUnique.mockResolvedValue(row());
      tx.proforma.findUnique.mockResolvedValue(quote(values));
      await expect(
        service.respond({ id: 'seller', role: 'VENDEUR' }, 'request', reply),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.demandeDevis.updateMany).not.toHaveBeenCalled();
    },
  );

  it('sends only the audited commercial snapshot, preserves a low-stock warning, and never reserves inventory', async () => {
    const { tx, service, proformas } = harness();
    tx.demandeDevis.findUnique.mockResolvedValue(row());
    tx.proforma.findUnique.mockResolvedValue(quote());
    await service.respond({ id: 'seller', role: 'VENDEUR' }, 'request', reply);
    expect(proformas.findOne).toHaveBeenCalledWith('proforma', {
      id: 'seller',
      role: 'VENDEUR',
    });
    const update = tx.demandeDevis.updateMany.mock.calls[0][0] as any;
    expect(update.where).toEqual({ id: 'request', version: 1 });
    expect(update.data.offre.montantArticles).toBe(10000);
    expect(update.data.offre.lignes[0].quantiteDisponible).toBe(1);
    expect(update.data.offre.reservationStock).toBe(false);
    expect(update.data.offre.fraisLivraison).toBeNull();
    expect(JSON.stringify(update.data.offre)).not.toContain('INTERNAL');
    expect(JSON.stringify(update.data.offre)).not.toContain('motDePasse');
    expect(tx.demandeDevisEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.produit.updateMany).not.toHaveBeenCalled();
  });

  it('has separate authentication and administrative guards on every private route', () => {
    for (const name of ['create', 'mine', 'mineOne', 'clarify']) {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, DevisController.prototype[name]),
      ).toEqual([JwtAuthGuard]);
    }
    for (const name of ['adminList', 'respond']) {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, DevisController.prototype[name]),
      ).toEqual([AdminAuthGuard, RolesGuard]);
      expect(
        Reflect.getMetadata(ROLES_KEY, DevisController.prototype[name]),
      ).toEqual(['SUPER_ADMIN', 'ADMIN', 'VENDEUR']);
    }
  });

  it('clarifies only an owned request awaiting details, atomically replacing the list with an audit and without reserving stock', async () => {
    const { tx, service } = harness();
    tx.demandeDevis.findFirst.mockResolvedValue(
      row({
        statut: 'A_PRECISER',
        lignes: [{ reference: 'old', quantite: 1, produitId: null }],
      }),
    );
    await service.clarify('client', 'request', { ...dto(), version: 1 });
    expect(tx.demandeDevis.findFirst.mock.calls[0][0].where).toEqual({
      id: 'request',
      clientId: 'client',
    });
    expect(tx.demandeDevis.updateMany.mock.calls[0][0].where).toEqual({
      id: 'request',
      clientId: 'client',
      version: 1,
      statut: 'A_PRECISER',
    });
    expect(
      tx.demandeDevisLigne.createMany.mock.calls[0][0].data[0].nomProduit,
    ).toBe('Nom fabricant');
    expect(
      tx.demandeDevisEvent.create.mock.calls[0][0].data.details
        .lignesPrecedentes[0].reference,
    ).toBe('old');
    expect(tx.produit.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    { statut: 'ENVOYEE' },
    { version: 2 },
    { absent: true },
    { inactive: true },
  ])(
    'refuses stale, closed, inaccessible or archived-product clarifications: %j',
    async (values) => {
      const { tx, service } = harness();
      tx.demandeDevis.findFirst.mockResolvedValue(
        values.absent ? null : row({ statut: 'A_PRECISER', ...values }),
      );
      if (values.inactive) tx.produit.findMany.mockResolvedValue([]);
      await expect(
        service.clarify('client', 'request', { ...dto(), version: 1 }),
      ).rejects.toBeInstanceOf(
        values.absent ? NotFoundException : ConflictException,
      );
      expect(tx.demandeDevis.updateMany).not.toHaveBeenCalled();
      expect(tx.demandeDevisLigne.deleteMany).not.toHaveBeenCalled();
    },
  );

  it('replays a lost clarification response without replacing lines again and rejects altered input under its identity', async () => {
    const { tx, service } = harness();
    tx.demandeDevis.findFirst.mockResolvedValue(row({ statut: 'A_PRECISER' }));
    await service.clarify('client', 'request', { ...dto(), version: 1 });
    const details = tx.demandeDevisEvent.create.mock.calls[0][0].data.details;
    tx.demandeDevisEvent.findFirst.mockResolvedValue({ details });
    tx.demandeDevis.findFirst.mockResolvedValue(
      row({ statut: 'RECUE', version: 2 }),
    );
    tx.demandeDevis.updateMany.mockClear();
    tx.demandeDevisLigne.deleteMany.mockClear();
    await service.clarify('client', 'request', { ...dto(), version: 1 });
    expect(tx.demandeDevis.updateMany).not.toHaveBeenCalled();
    expect(tx.demandeDevisLigne.deleteMany).not.toHaveBeenCalled();
    await expect(
      service.clarify('client', 'request', {
        ...dto(),
        version: 1,
        notes: 'Changed',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
