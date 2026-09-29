import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { MethodePaiement, Prisma } from "@prisma/client";
import { ProformaService } from "./proforma.service";

const actor = { id: "seller", role: "VENDEUR" };
const payment = "ESPECES" as MethodePaiement;
const line = {
  produitId: "product",
  nomProduit: "Carte",
  quantite: 2,
  prixUnitaire: 2500,
  sousTotal: 5000,
};
const current = () => ({
  id: "proforma",
  numero: "FP-2026-0001",
  vendeurId: actor.id,
  clientId: "client",
  clientNom: "Client",
  clientNiu: null,
  clientRccm: null,
  notes: null,
  statut: "EN_COURS",
  dateExpiration: new Date(Date.now() + 86400000),
  montantTotal: 5000,
  lignes: [{ ...line }],
});

function setup() {
  const row = current();
  const tx = {
    proforma: {
      findUnique: jest.fn().mockResolvedValue(row),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ ...row, statut: "TRANSFORMEE" }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    proformaLigne: { deleteMany: jest.fn(), createMany: jest.fn() },
    produit: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: "product", nomProduit: "Carte", quantiteStock: 3 },
        ]),
    },
    ligneTicket: { groupBy: jest.fn().mockResolvedValue([]) },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    ticketVente: {
      create: jest
        .fn()
        .mockResolvedValue({ id: "ticket", lignes: [{ ...line }] }),
    },
  };
  const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
  const events = { emit: jest.fn() };
  const bonVente = {
    generateNumeroTicket: jest.fn().mockResolvedValue("T-0001"),
  };
  const service = new ProformaService(
    db as any,
    events as any,
    bonVente as any,
    {} as any,
  );
  return { row, tx, db, events, bonVente, service };
}

describe("Proforma mutations and quote acceptance concurrency", () => {
  it("updates inside a serializable transaction and claims EN_COURS before replacing lines", async () => {
    const { tx, db, service } = setup();
    await service.update("proforma", actor, {
      lignes: [{ produitId: "product", quantite: 1, prixUnitaire: 2000 }],
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.produit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["product"] }, estActif: true },
      }),
    );
    expect(tx.proforma.updateMany).toHaveBeenCalledWith({
      where: {
        id: "proforma",
        statut: "EN_COURS",
        dateExpiration: { gt: expect.any(Date) },
      },
      data: expect.objectContaining({ montantTotal: 2000 }),
    });
    expect(tx.proforma.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.proformaLigne.deleteMany.mock.invocationCallOrder[0],
    );
    expect(tx.proformaLigne.createMany).toHaveBeenCalledWith({
      data: [
        {
          produitId: "product",
          nomProduit: "Carte",
          quantite: 1,
          prixUnitaire: 2000,
          sousTotal: 2000,
          proformaId: "proforma",
        },
      ],
    });
  });

  it("does not replace lines when the conditional update loses the proforma claim", async () => {
    const { tx, service } = setup();
    tx.proforma.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update("proforma", actor, {
        lignes: [{ produitId: "product", quantite: 1, prixUnitaire: 2000 }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.proformaLigne.deleteMany).not.toHaveBeenCalled();
    expect(tx.proformaLigne.createMany).not.toHaveBeenCalled();
  });

  for (const method of ["update", "transformer"] as const) {
    it.each(["ACCEPTEE", "TRANSFORMEE", "REFUSEE"])(
      `${method} refuses a proforma in state %s before any mutation`,
      async (statut) => {
        const { tx, events, service } = setup();
        tx.proforma.findUnique.mockResolvedValue({ ...current(), statut });
        const call =
          method === "update"
            ? service.update("proforma", actor, { notes: "test" })
            : service.transformer("proforma", actor, payment);
        await expect(call).rejects.toBeInstanceOf(ConflictException);
        expect(tx.proforma.updateMany).not.toHaveBeenCalled();
        expect(tx.proformaLigne.deleteMany).not.toHaveBeenCalled();
        expect(tx.ticketVente.create).not.toHaveBeenCalled();
        expect(events.emit).not.toHaveBeenCalled();
      },
    );

    it(`${method} refuses expired offers even when otherwise EN_COURS`, async () => {
      const { tx, service } = setup();
      tx.proforma.findUnique.mockResolvedValue({
        ...current(),
        dateExpiration: new Date(0),
      });
      const call =
        method === "update"
          ? service.update("proforma", actor, { notes: "test" })
          : service.transformer("proforma", actor, payment);
      await expect(call).rejects.toBeInstanceOf(ConflictException);
      expect(tx.proforma.updateMany).not.toHaveBeenCalled();
      expect(tx.ticketVente.create).not.toHaveBeenCalled();
    });

    it(`${method} rechecks seller ownership inside the transaction`, async () => {
      const { tx, service } = setup();
      tx.proforma.findUnique.mockResolvedValue({
        ...current(),
        vendeurId: "other-seller",
      });
      const call =
        method === "update"
          ? service.update("proforma", actor, {})
          : service.transformer("proforma", actor, payment);
      await expect(call).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.proforma.updateMany).not.toHaveBeenCalled();
    });

    it(`${method} exposes a serialization conflict as HTTP 409`, async () => {
      const { db, events, service } = setup();
      db.$transaction.mockRejectedValue({ code: "P2034" });
      const call =
        method === "update"
          ? service.update("proforma", actor, {})
          : service.transformer("proforma", actor, payment);
      await expect(call).rejects.toBeInstanceOf(ConflictException);
      expect(events.emit).not.toHaveBeenCalled();
    });
  }

  it("claims the proforma then reserves sellable stock before creating exactly one ticket", async () => {
    const { tx, db, events, service } = setup();
    const result = await service.transformer("proforma", actor, payment);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.proforma.updateMany).toHaveBeenCalledWith({
      where: {
        id: "proforma",
        statut: "EN_COURS",
        dateExpiration: { gt: expect.any(Date) },
      },
      data: { statut: "TRANSFORMEE" },
    });
    expect(tx.$queryRawUnsafe).toHaveBeenCalledWith(
      "SELECT pg_advisory_xact_lock(hashtext($1))::text",
      "newoteg:ticket-stock:product",
    );
    expect(tx.proforma.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRawUnsafe.mock.invocationCallOrder[0],
    );
    expect(tx.$queryRawUnsafe.mock.invocationCallOrder[0]).toBeLessThan(
      tx.ticketVente.create.mock.invocationCallOrder[0],
    );
    expect(tx.ligneTicket.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          produitId: { in: ["product"] },
          ticket: { statut: "EN_ATTENTE", expiresAt: { gt: expect.any(Date) } },
        },
      }),
    );
    expect(tx.ticketVente.create).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith(result.ticket);
  });

  it("does not create a ticket or generate its number after losing the proforma claim", async () => {
    const { tx, events, bonVente, service } = setup();
    tx.proforma.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.transformer("proforma", actor, payment),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ticketVente.create).not.toHaveBeenCalled();
    expect(bonVente.generateNumeroTicket).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("refuses stock reserved by pending tickets despite sufficient physical stock", async () => {
    const { tx, events, service } = setup();
    tx.ligneTicket.groupBy.mockResolvedValue([
      { produitId: "product", _sum: { quantite: 2 } },
    ]);
    await expect(
      service.transformer("proforma", actor, payment),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ticketVente.create).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it("refuses an archived or missing product without a ticket or state claim", async () => {
    const { tx, service } = setup();
    tx.produit.findMany.mockResolvedValue([]);
    await expect(
      service.transformer("proforma", actor, payment),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.proforma.updateMany).not.toHaveBeenCalled();
    expect(tx.ticketVente.create).not.toHaveBeenCalled();
  });

  it("refuses a corrupted stored subtotal without creating a ticket", async () => {
    const { tx, service } = setup();
    tx.proforma.findUnique.mockResolvedValue({
      ...current(),
      lignes: [{ ...line, sousTotal: 4500 }],
    });
    await expect(
      service.transformer("proforma", actor, payment),
    ).rejects.toThrow("total");
    expect(tx.proforma.updateMany).not.toHaveBeenCalled();
    expect(tx.ticketVente.create).not.toHaveBeenCalled();
  });

  it("does not publish a ticket event when the transaction fails after ticket creation", async () => {
    const { tx, events, service } = setup();
    tx.proforma.findUniqueOrThrow.mockRejectedValue({ code: "P2034" });
    await expect(
      service.transformer("proforma", actor, payment),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.ticketVente.create).toHaveBeenCalledTimes(1);
    expect(events.emit).not.toHaveBeenCalled();
  });
});
