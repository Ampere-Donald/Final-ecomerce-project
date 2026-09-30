import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { DemandesDevis } from "./DemandesDevis";
const mock = vi.hoisted(() => ({
  getAll: vi.fn(),
  quotes: vi.fn(),
  respond: vi.fn(),
  assign: vi.fn(),
  responsables: vi.fn(),
  admin: { id: "seller", role: "VENDEUR" },
}));
vi.mock("../context/AdminAuthContext", () => ({
  useAdminAuth: () => ({ admin: mock.admin }),
}));
vi.mock("../services/api", () => ({
  demandeDevisApi: { getAll: mock.getAll, respond: mock.respond, assign: mock.assign, getResponsables: mock.responsables },
  proformaApi: { getAll: mock.quotes },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));
const request = {
  id: "d",
  clientId: "c",
  nomClient: "Client Test",
  telephone: "+237600000000",
  modeReception: "RETRAIT_MAGASIN",
  statut: "RECUE",
  version: 4,
  createdAt: "2026-09-29T10:00:00Z",
  responsable: null,
  lignes: [{ reference: "LM358-N", quantite: 20 }],
  historique: [],
};
const quote = {
  id: "p",
  clientId: "c",
  vendeurId: "seller",
  statut: "EN_COURS",
  numero: "FP-VALID",
  montantTotal: 10000,
  dateExpiration: "2099-01-01T00:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.admin = { id: "seller", role: "VENDEUR" };
  mock.getAll.mockResolvedValue([request]);
  mock.responsables.mockResolvedValue([
    { id: "seller", nom: "Vendeur", role: "VENDEUR" },
    { id: "other", nom: "Autre vendeur", role: "VENDEUR" },
  ]);
  mock.quotes.mockResolvedValue([
    quote,
    { ...quote, id: "wrong", clientId: "other", numero: "WRONG-OWNER" },
    {
      ...quote,
      id: "old",
      numero: "EXPIRED",
      dateExpiration: "2000-01-01T00:00:00Z",
    },
    { ...quote, id: "seller2", numero: "OTHER-SELLER", vendeurId: "other" },
  ]);
});
const show = () =>
  render(
    <MemoryRouter>
      <DemandesDevis />
    </MemoryRouter>,
  );

it("transmits only the chosen valid quote of the customer, with the displayed version and one response while pending", async () => {
  mock.getAll.mockResolvedValue([{ ...request, responsable: { id: "seller", nom: "Vendeur" } }]);
  let finish!: (value: unknown) => void;
  mock.respond.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  show();
  fireEvent.click(await screen.findByRole("button", { name: /Client Test/ }));
  fireEvent.change(screen.getByLabelText("Type de réponse"), {
    target: { value: "ENVOYEE" },
  });
  const select = screen.getByLabelText("Proforma de ce client");
  expect(
    Array.from((select as HTMLSelectElement).options)
      .map((o) => o.textContent)
      .join(" "),
  ).toContain("FP-VALID");
  expect(screen.queryByText(/WRONG-OWNER|EXPIRED|OTHER-SELLER/)).toBeNull();
  fireEvent.change(select, { target: { value: "p" } });
  fireEvent.change(screen.getByLabelText("Message visible par le client"), {
    target: { value: "Voici votre proposition." },
  });
  const button = screen.getByRole("button", {
    name: "Rendre la réponse disponible",
  });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(mock.respond).toHaveBeenCalledTimes(1);
  expect(mock.respond).toHaveBeenCalledWith("d", {
    version: 4,
    statut: "ENVOYEE",
    message: "Voici votre proposition.",
    proformaId: "p",
  });
  mock.getAll.mockResolvedValue([
    { ...request, version: 5, statut: "ENVOYEE" },
  ]);
  finish({});
  await screen.findByText(/La réponse est disponible/);
  await waitFor(() => expect(mock.getAll).toHaveBeenCalledTimes(2));
});
it("allows a clarification without a proforma and re-reads the queue when a response was lost", async () => {
  mock.getAll.mockResolvedValue([{ ...request, responsable: { id: "seller", nom: "Vendeur" } }]);
  mock.respond.mockRejectedValue(new Error("Connection lost"));
  show();
  fireEvent.click(await screen.findByRole("button", { name: /Client Test/ }));
  fireEvent.change(screen.getByLabelText("Message visible par le client"), {
    target: { value: "Précisez le suffixe." },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Rendre la réponse disponible" }),
  );
  await screen.findByRole("alert");
  await waitFor(() => expect(mock.getAll).toHaveBeenCalledTimes(2));
  expect(mock.respond).toHaveBeenCalledWith("d", {
    version: 4,
    statut: "A_PRECISER",
    message: "Précisez le suffixe.",
  });
});
it("requires a seller to claim a free request before responding, using its current version", async () => {
  mock.assign.mockResolvedValue({});
  show();
  fireEvent.click(await screen.findByRole("button", { name: /Client Test/ }));
  expect(screen.queryByLabelText("Type de réponse")).toBeNull();
  expect(screen.getByRole("button", { name: "Prendre cette demande" })).toBeTruthy();
  mock.getAll.mockResolvedValue([{ ...request, version: 5, responsable: { id: "seller", nom: "Vendeur" } }]);
  fireEvent.click(screen.getByRole("button", { name: "Prendre cette demande" }));
  await waitFor(() => expect(mock.assign).toHaveBeenCalledWith("d", { version: 4, responsableId: "seller" }));
  await screen.findByLabelText("Type de réponse");
  expect(mock.responsables).not.toHaveBeenCalled();
});
it("lets an administrator reassign an open request and reloads after an uncertain result", async () => {
  mock.admin = { id: "boss", role: "ADMIN" };
  mock.getAll.mockResolvedValue([{ ...request, responsable: { id: "seller", nom: "Vendeur" } }]);
  mock.assign.mockRejectedValue(new Error("Connection lost"));
  show();
  fireEvent.click(await screen.findByRole("button", { name: /Client Test/ }));
  fireEvent.change(screen.getByLabelText("Attribuer à"), { target: { value: "other" } });
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’affectation" }));
  await screen.findByRole("alert");
  await waitFor(() => expect(mock.getAll).toHaveBeenCalledTimes(2));
  expect(mock.assign).toHaveBeenCalledWith("d", { version: 4, responsableId: "other" });
  expect(mock.responsables).toHaveBeenCalled();
});
it("keeps a closed request read-only, and does not load the quote queue for a cashier", async () => {
  mock.getAll.mockResolvedValue([{ ...request, statut: "ACCEPTEE" }]);
  const view = show();
  await waitFor(() => expect(mock.getAll).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("Afficher"), {
    target: { value: "all" },
  });
  fireEvent.click(await screen.findByRole("button", { name: /Client Test/ }));
  expect(screen.queryByLabelText("Type de réponse")).toBeNull();
  view.unmount();
  vi.clearAllMocks();
  mock.admin = { id: "cashier", role: "CAISSIER" };
  show();
  await screen.findByRole("alert");
  expect(mock.getAll).not.toHaveBeenCalled();
  expect(mock.quotes).not.toHaveBeenCalled();
});
