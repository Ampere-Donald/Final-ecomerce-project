import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProjetService } from './projet.service';
import { ProjetController } from './projet.controller';
import { CreateProjetDto, PublierProjetDto } from './dto/projet.dto';
import { technicalFingerprint } from './projet-data';
import { AdminAuthGuard } from '../admin-auth/admin-auth.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { ROLES_KEY } from '../admin-auth/roles.decorator';

const actor = { id: 'administrator', role: 'ADMIN' };
const p = () => ({
  id: '00000000-0000-4000-8000-000000000001',
  code: 'DEMO-A-N',
  nomProduit: 'Fictitious part',
  categorieId: 'family',
  estActif: true,
  prixDetail: 3000,
  quantiteStock: 10,
  attributs: [],
});
const requestId = '00000000-0000-4000-8000-000000000002';
const lineId = '00000000-0000-4000-8000-000000000003';
const dto = (): CreateProjetDto => ({
  requestId,
  slug: 'demo-projet',
  titre: 'Projet fictif',
  resume: 'Démonstration',
  objectif: 'Un objectif',
  prerequis: 'Matériel de démo',
  contraintes: 'Aucune compatibilité réelle promise',
  niveau: 'DEBUTANT',
  ordre: 0,
  documents: [
    { titre: 'Document de démo', url: 'https://example.com/demo.pdf' },
  ],
  lignes: [
    {
      produitId: p().id,
      referenceSouhaitee: p().code,
      quantite: 2,
      necessaire: true,
      role: 'Pièce principale',
    },
  ],
});
const row = (changes: any = {}) => ({
  ...dto(),
  id: 'project',
  version: 1,
  statut: 'BROUILLON',
  validationVersion: null,
  valideAt: null,
  lignes: [
    {
      id: lineId,
      produitId: p().id,
      produitIdSource: p().id,
      reference: p().code,
      role: 'Pièce principale',
      quantite: 2,
      necessaire: true,
      produit: p(),
      empreinteTechnique: technicalFingerprint(p()),
    },
  ],
  ...changes,
});
const publication = (): PublierProjetDto => ({
  requestId,
  version: 1,
  noteValidation: 'Vérification fictive, aucune garantie réelle.',
  referencesVerifiees: true,
  materielEtQuantitesVerifies: true,
  contraintesEtDocumentsVerifies: true,
  verifications: [
    { ligneId: lineId, empreinteTechnique: technicalFingerprint(p()) },
  ],
});
function harness() {
  const tx = {
    adminUser: {
      findUnique: jest.fn().mockResolvedValue({
        role: 'ADMIN',
        isActive: true,
        mustChangeCredential: false,
      }),
    },
    projet: {
      findUnique: jest.fn().mockResolvedValue(row()),
      findUniqueOrThrow: jest.fn().mockResolvedValue(row({ version: 2 })),
      findFirst: jest.fn().mockResolvedValue(
        row({
          version: 2,
          validationVersion: 2,
          valideAt: new Date(),
          statut: 'PUBLIE',
        }),
      ),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue(row()),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    projetEvent: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    projetLigne: {
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    produit: {
      findMany: jest.fn().mockResolvedValue([p()]),
      update: jest.fn(),
    },
    ligneTicket: { groupBy: jest.fn().mockResolvedValue([]) },
  };
  const db = {
    ...tx,
    $transaction: jest.fn().mockImplementation((action) => action(tx)),
  };
  return { tx, db, service: new ProjetService(db as any) };
}
describe('project publication and access', () => {
  it.each(['admin', 'adminOne', 'create', 'update', 'publish', 'withdraw'])(
    'protects %s with admin guard and two allowed roles',
    (name) => {
      const fn = ProjetController.prototype[name];
      expect(Reflect.getMetadata(GUARDS_METADATA, fn)).toEqual([
        AdminAuthGuard,
        RolesGuard,
      ]);
      expect(Reflect.getMetadata(ROLES_KEY, fn)).toEqual([
        'ADMIN',
        'SUPER_ADMIN',
      ]);
    },
  );
  it('keeps public routes open without exposing mutations', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        Object.getOwnPropertyDescriptor(ProjetController.prototype, 'list')!
          .value,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        Object.getOwnPropertyDescriptor(ProjetController.prototype, 'detail')!
          .value,
      ),
    ).toBeUndefined();
  });
  it.each([
    { role: 'VENDEUR', isActive: true },
    { role: 'ADMIN', isActive: false },
    { role: 'ADMIN', isActive: true, mustChangeCredential: true },
  ])('rechecks the account before any mutation', async (account) => {
    const { tx, service } = harness();
    tx.adminUser.findUnique.mockResolvedValue(account);
    await expect(service.create(actor, dto())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.projet.create).not.toHaveBeenCalled();
  });
  it('ignores draft/invalidated versions and uses a coherent public snapshot', async () => {
    const { tx, db, service } = harness();
    tx.projet.findMany.mockResolvedValue([
      row({ validationVersion: 0 }),
    ] as any);
    expect((await service.findPublic()).data).toEqual([]);
    expect(db.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: 'RepeatableRead',
    });
    const where = tx.projet.findMany.mock.calls[0][0].where;
    expect(where.statut).toBe('PUBLIE');
    expect(where.AND).toHaveLength(2);
    tx.projet.findFirst.mockResolvedValue(row());
    await expect(service.findPublicOne('demo-projet')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it.each([
    ['0', '12'],
    ['1', '25'],
    ['1.5', '12'],
    ['10001', '12'],
  ])('bounds pagination %s/%s', async (page, limit) => {
    const { service, db } = harness();
    await expect(service.findPublic(page, limit)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('deducts active cashier reservations without exposing private stock accounting', async () => {
    const { service, tx } = harness();
    tx.ligneTicket.groupBy.mockResolvedValue([
      { produitId: p().id, _sum: { quantite: 9 } },
    ] as any);
    const result = await service.findPublicOne('demo-projet');
    expect(result.lignes[0].produit!.quantiteStock).toBe(1);
    expect(result.materielRequisDisponible).toBe(false);
    expect(result.validationActuelle).toBe(true);
    expect(JSON.stringify(result)).not.toContain('quantiteReservee');
    expect(tx.ligneTicket.groupBy.mock.calls[0][0].where.ticket.statut).toBe(
      'EN_ATTENTE',
    );
  });
  it('creates only a draft with server reference/name and audited receipt', async () => {
    const { service, tx, db } = harness();
    await service.create(actor, dto());
    const data = tx.projet.create.mock.calls[0][0].data;
    expect(data.lignes.create[0]).toMatchObject({
      reference: 'DEMO-A-N',
      nomProduit: 'Fictitious part',
      quantite: 2,
    });
    expect(data.statut).toBeUndefined(); // schema defaults to BROUILLON
    expect(tx.projetEvent.create.mock.calls[0][0].data.action).toBe('CREATION');
    expect(db.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: 'Serializable',
    });
    expect(tx.produit.update).not.toHaveBeenCalled();
  });
  it.each(['duplicate', 'fraction', 'suffix', 'unknown', 'url', 'dates'])(
    'rejects invalid project %s before create',
    async (kind) => {
      const { service, tx } = harness();
      const value = dto();
      if (kind === 'duplicate') value.lignes.push({ ...value.lignes[0] });
      if (kind === 'fraction') value.lignes[0].quantite = 1.5;
      if (kind === 'suffix') value.lignes[0].referenceSouhaitee = 'DEMO-A';
      if (kind === 'unknown') tx.produit.findMany.mockResolvedValue([]);
      if (kind === 'url') value.documents[0].url = 'javascript:alert(1)';
      if (kind === 'dates') {
        value.debutPublication = '2026-10-02';
        value.finPublication = '2026-10-01';
      }
      await expect(service.create(actor, value)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(tx.projet.create).not.toHaveBeenCalled();
    },
  );
  it('allows a missing reference in draft only', async () => {
    const { service, tx } = harness();
    const value = dto();
    delete value.lignes[0].produitId;
    await service.create(actor, value);
    expect(
      tx.projet.create.mock.calls[0][0].data.lignes.create[0].produitId,
    ).toBeNull();
    tx.projet.findUnique.mockResolvedValue(
      row({ lignes: [{ ...row().lignes[0], produit: null }] }),
    );
    await expect(
      service.publish(actor, 'project', publication()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([
    'checkbox',
    'content',
    'expired',
    'inactive',
    'reference',
    'optionalOnly',
  ])('blocks publication with incomplete verification: %s', async (kind) => {
    const { service, tx } = harness();
    const value = publication();
    const current = row();
    if (kind === 'checkbox') value.referencesVerifiees = false;
    if (kind === 'content') current.objectif = '';
    if (kind === 'expired') current.finPublication = new Date(0);
    if (kind === 'inactive') current.lignes[0].produit.estActif = false;
    if (kind === 'reference') current.lignes[0].reference = 'DEMO-A';
    if (kind === 'optionalOnly') current.lignes[0].necessaire = false;
    tx.projet.findUnique.mockResolvedValue(current);
    await expect(
      service.publish(actor, 'project', value),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.projet.updateMany).not.toHaveBeenCalled();
    expect(tx.projetEvent.create).not.toHaveBeenCalled();
  });
  it.each(['technicalChange', 'duplicateCheck', 'missingCheck'])(
    'blocks stale/incomplete reviewed signatures: %s',
    async (kind) => {
      const { service, tx } = harness();
      const value = publication();
      if (kind === 'technicalChange')
        value.verifications[0].empreinteTechnique = '0'.repeat(64);
      if (kind === 'duplicateCheck')
        value.verifications.push({ ...value.verifications[0] });
      if (kind === 'missingCheck') value.verifications = [];
      await expect(
        service.publish(actor, 'project', value),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.projetLigne.update).not.toHaveBeenCalled();
    },
  );
  it('publishes reviewed lines and records a private validation audit', async () => {
    const { service, tx } = harness();
    await service.publish(actor, 'project', publication());
    expect(tx.projet.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'project', version: 1 },
      data: { statut: 'PUBLIE', validationVersion: 2, valideParId: actor.id },
    });
    expect(tx.projetLigne.update.mock.calls[0][0].data.empreinteTechnique).toBe(
      technicalFingerprint(p()),
    );
    expect(
      tx.projetEvent.create.mock.calls[0][0].data.details.verifications,
    ).toEqual(publication().verifications);
  });
  it('editing returns to draft and invalidates previous verification', async () => {
    const { service, tx } = harness();
    await service.update(actor, 'project', { ...dto(), version: 1 });
    expect(tx.projet.updateMany.mock.calls[0][0].data).toMatchObject({
      statut: 'BROUILLON',
      validationVersion: null,
      valideAt: null,
      noteValidation: null,
    });
    expect(tx.projetLigne.deleteMany).toHaveBeenCalled();
  });
  it('withdrawal clears signatures and requires a recorded reason', async () => {
    const { service, tx } = harness();
    await service.withdraw(actor, 'project', {
      requestId,
      version: 1,
      motif: 'À vérifier',
    });
    expect(tx.projetLigne.updateMany.mock.calls[0][0].data).toEqual({
      empreinteTechnique: null,
    });
    expect(tx.projetEvent.create.mock.calls[0][0].data.details).toEqual({
      motif: 'À vérifier',
    });
  });
  it('rejects stale version before changing a project', async () => {
    const { service, tx } = harness();
    await expect(
      service.publish(actor, 'project', { ...publication(), version: 9 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.projet.updateMany).not.toHaveBeenCalled();
  });
  it('replays the same operation even if JSON keys were reordered, without another write', async () => {
    const { service, tx } = harness();
    await service.create(actor, dto());
    const receipt = tx.projetEvent.create.mock.calls[0][0].data;
    tx.projetEvent.findUnique.mockResolvedValue(receipt);
    const reordered = Object.fromEntries(
      Object.entries(dto()).reverse(),
    ) as any;
    const result = await service.create(actor, reordered);
    expect(result.operation.rejoue).toBe(true);
    expect(tx.projet.create).toHaveBeenCalledTimes(1);
    await expect(
      service.create(actor, { ...dto(), titre: 'Autre projet' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('never recreates a deleted project on replay', async () => {
    const { service, tx } = harness();
    await service.create(actor, dto());
    tx.projetEvent.findUnique.mockResolvedValue(
      tx.projetEvent.create.mock.calls[0][0].data,
    );
    tx.projet.findUnique.mockResolvedValue(null as any);
    await expect(service.create(actor, dto())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.projet.create).toHaveBeenCalledTimes(1);
  });
  it('validates nested DTO types, limits and explicit booleans', async () => {
    expect(
      await validate(plainToInstance(CreateProjetDto, dto()), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toHaveLength(0);
    expect(
      await validate(plainToInstance(PublierProjetDto, publication())),
    ).toHaveLength(0);
    expect(
      (
        await validate(
          plainToInstance(CreateProjetDto, {
            ...dto(),
            lignes: [{ ...dto().lignes[0], quantite: '2', necessaire: 'true' }],
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await validate(
          plainToInstance(PublierProjetDto, {
            ...publication(),
            referencesVerifiees: 'true',
            verifications: [],
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
