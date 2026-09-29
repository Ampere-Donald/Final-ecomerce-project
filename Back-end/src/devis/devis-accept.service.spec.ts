import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DevisAcceptService } from "./devis-accept.service";
import { AccepterDevisDto } from "./dto/devis.dto";
import { snapshotProforma, offerMatches } from "./devis-offer";

const dto = {
  requestId: "00000000-0000-4000-8000-000000000001",
  version: 2,
  conditionsAcceptees: true,
};
function setup() {
  const line = {
    produitId: "product",
    nomProduit: "LM358-N",
    quantite: 2,
    prixUnitaire: 1500,
    sousTotal: 3000,
  };
  const proforma = {
    id: "proforma",
    numero: "FP-TEST",
    clientId: "client",
    statut: "EN_COURS",
    dateExpiration: new Date(Date.now() + 86400000),
    montantTotal: 3000,
    lignes: [line],
  };
  const row: any = {
    id: "request",
    clientId: "client",
    proformaId: "proforma",
    statut: "ENVOYEE",
    version: 2,
    offre: snapshotProforma(proforma),
    nomClient: "Client",
    telephone: "+237600000000",
    modeReception: "LIVRAISON",
    destination: "Douala",
    commande: null,
  };
  const order = {
    id: "order",
    numeroSuivi: "CMD-TEST",
    statut: "EN_ATTENTE",
    montantTotal: 3000,
    modeReception: "LIVRAISON",
  };
  const tx = {
    demandeDevis: {
      findFirst: jest.fn().mockResolvedValue(row),
      findUnique: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    demandeDevisEvent: {
      findFirst: jest.fn().mockResolvedValue({ id: "authorization" }),
      create: jest.fn(),
    },
    proforma: {
      findUnique: jest.fn().mockResolvedValue(proforma),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    produit: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: "product",
            nomProduit: "LM358-N",
            quantiteStock: 5,
            prixDetail: 9000,
          },
        ]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ligneTicket: { groupBy: jest.fn().mockResolvedValue([]) },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    commande: { create: jest.fn().mockResolvedValue(order) },
    mouvementStock: { create: jest.fn() },
    notification: { create: jest.fn() },
  };
  const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
  return {
    row,
    proforma,
    order,
    tx,
    db,
    service: new DevisAcceptService(db as any),
  };
}
describe("Accepting an owned commercial quote", () => {
  it("creates an awaiting order at the offered price, with reception, stock movements and an atomic audit", async () => {
    const { service, tx, db } = setup();
    const result = await service.accept("client", "request", dto);
    expect(result.replayed).toBe(false);
    expect(result.commande.montantTotal).toBe(3000);
    expect(tx.demandeDevis.findFirst.mock.calls[0][0].where).toEqual({
      id: "request",
      clientId: "client",
    });
    expect(tx.commande.create.mock.calls[0][0]).toEqual({
      data: expect.objectContaining({
        clientId: "client",
        montantTotal: 3000,
        statut: "EN_ATTENTE",
        modeReception: "LIVRAISON",
        adresseLivraison: "Douala",
        lignes: {
          create: [
            expect.objectContaining({ prixUnitaire: 1500, sousTotal: 3000 }),
          ],
        },
      }),
      select: {
        id: true,
        numeroSuivi: true,
        statut: true,
        montantTotal: true,
        modeReception: true,
      },
    });
    expect(tx.produit.updateMany).toHaveBeenCalledWith({
      where: { id: "product", estActif: true, quantiteStock: { gte: 2 } },
      data: { quantiteStock: { decrement: 2 }, version: { increment: 1 } },
    });
    expect(tx.mouvementStock.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.demandeDevis.updateMany.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        statut: "ACCEPTEE",
        commandeId: "order",
        acceptedVersion: 2,
        acceptRequestId: dto.requestId,
      }),
    );
    expect(tx.demandeDevisEvent.create.mock.calls[0][0].data.details).toEqual(
      expect.objectContaining({
        fraisLivraison: null,
        delaiLivraison: null,
        conditionsAcceptees: true,
      }),
    );
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(tx.proforma.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRawUnsafe.mock.invocationCallOrder[0],
    );
    expect(JSON.stringify(result)).not.toMatch(
      /prixAchat|cmup|telephone|acceptRequestId|fingerprint|actor/,
    );
  });
  it.each([dto.requestId, "00000000-0000-4000-8000-000000000002"])(
    "replays the accepted version even with another attempt key: %s",
    async (requestId) => {
      const { service, row, order, tx } = setup();
      Object.assign(row, {
        statut: "ACCEPTEE",
        version: 3,
        acceptedVersion: 2,
        commande: order,
      });
      expect(
        (await service.accept("client", "request", { ...dto, requestId }))
          .replayed,
      ).toBe(true);
      expect(tx.commande.create).not.toHaveBeenCalled();
      expect(tx.produit.updateMany).not.toHaveBeenCalled();
      expect(tx.notification.create).not.toHaveBeenCalled();
    },
  );
  it("returns 404 without revealing or changing a request owned by another client", async () => {
    const { service, tx } = setup();
    tx.demandeDevis.findFirst.mockResolvedValue(null);
    await expect(
      service.accept("other", "request", dto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.commande.create).not.toHaveBeenCalled();
  });
  it.each([
    { statut: "A_PRECISER" },
    { version: 3 },
    { proformaId: null },
    { statut: "ACCEPTEE", acceptedVersion: 2, numeroCommande: "DELETED" },
    { statut: "ACCEPTEE", acceptedVersion: 1 },
  ])("refuses closed, stale or deleted-order requests: %j", async (change) => {
    const { service, row, tx } = setup();
    Object.assign(row, change);
    await expect(
      service.accept("client", "request", dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.produit.updateMany).not.toHaveBeenCalled();
  });
  it.each([
    "expired",
    "price",
    "quantity",
    "name",
    "total",
    "owner",
    "transformed",
    "authorization",
    "key",
    "reserved",
    "inactive",
    "claim",
    "decrement",
  ])("refuses %s and creates no order", async (scenario) => {
    const { service, proforma, tx } = setup();
    if (scenario === "expired") proforma.dateExpiration = new Date(0);
    if (scenario === "price") {
      proforma.lignes[0].prixUnitaire = 1600;
      proforma.lignes[0].sousTotal = 3200;
      proforma.montantTotal = 3200;
    }
    if (scenario === "quantity") proforma.lignes[0].quantite = 1;
    if (scenario === "name") proforma.lignes[0].nomProduit = "Other";
    if (scenario === "total") proforma.montantTotal = 1;
    if (scenario === "owner") proforma.clientId = "other";
    if (scenario === "transformed") proforma.statut = "TRANSFORMEE";
    if (scenario === "authorization")
      tx.demandeDevisEvent.findFirst.mockResolvedValue(null);
    if (scenario === "key")
      tx.demandeDevis.findUnique.mockResolvedValue({ id: "other" } as any);
    if (scenario === "reserved")
      tx.ligneTicket.groupBy.mockResolvedValue([
        { produitId: "product", _sum: { quantite: 4 } },
      ] as any);
    if (scenario === "inactive")
      tx.produit.findMany
        .mockResolvedValueOnce([
          {
            id: "product",
            nomProduit: "LM358-N",
            quantiteStock: 5,
            prixDetail: 9000,
          },
        ])
        .mockResolvedValueOnce([]);
    if (scenario === "claim")
      tx.proforma.updateMany.mockResolvedValue({ count: 0 });
    if (scenario === "decrement")
      tx.produit.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.accept("client", "request", dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.commande.create).not.toHaveBeenCalled();
    expect(tx.demandeDevisEvent.create).not.toHaveBeenCalled();
  });
  it("retries the whole transaction after serialization conflicts but bounds repeated failures", async () => {
    const { service, db } = setup();
    db.$transaction.mockRejectedValueOnce({ code: "P2034" });
    await expect(service.accept("client", "request", dto)).resolves.toEqual(
      expect.objectContaining({ replayed: false }),
    );
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    db.$transaction.mockClear().mockRejectedValue({ code: "P2034" });
    await expect(
      service.accept("client", "request", dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.$transaction).toHaveBeenCalledTimes(3);
  });
  it("validates consent, UUIDv4 and version without accepting client price or owner fields", async () => {
    for (const value of [
      { conditionsAcceptees: false },
      { conditionsAcceptees: "true" },
      { requestId: "bad" },
      { version: 1.1 },
      { prix: 12 },
      { clientId: "other" },
    ]) {
      const errors = await validate(
        plainToInstance(AccepterDevisDto, { ...dto, ...value }),
        { whitelist: true, forbidNonWhitelisted: true },
      );
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});
describe("Commercial snapshot precision", () => {
  it("ignores transient stock and SQL row ordering but compares all commercial terms", () => {
    const { proforma } = setup();
    proforma.lignes.push({ ...proforma.lignes[0], produitId: "another" });
    proforma.montantTotal = 6000;
    const offer = snapshotProforma(proforma);
    expect(
      offerMatches(
        {
          ...offer,
          lignes: offer.lignes
            .toReversed()
            .map((line) => ({ ...line, quantiteDisponible: 0 })),
        },
        offer,
      ),
    ).toBe(true);
    expect(
      offerMatches({ ...offer, dateExpiration: "2031-01-01T00:00:00Z" }, offer),
    ).toBe(false);
  });
  it.each([0, -1, 1.234, 100000000, Infinity])(
    "rejects unsupported unit price %s without rounding",
    (price) => {
      const { proforma } = setup();
      proforma.lignes[0].prixUnitaire = price;
      expect(() => snapshotProforma(proforma)).toThrow(BadRequestException);
    },
  );
});
