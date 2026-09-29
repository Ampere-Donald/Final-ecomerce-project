import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Proformas } from "./Proformas";
const mock = vi.hoisted(() => ({
  list: vi.fn(),
  products: vi.fn(),
  clients: vi.fn(),
  create: vi.fn(),
}));
vi.mock("../services/api", () => ({
  proformaApi: { getAll: mock.list, create: mock.create },
  produitApi: { getAll: mock.products },
  clientApi: { getAll: mock.clients },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));
vi.mock("../context/AdminAuthContext", () => ({
  useAdminAuth: () => ({ admin: { id: "seller", role: "VENDEUR" } }),
}));
vi.mock("./ReceiptGenerator", () => ({ ReceiptGenerator: () => null }));
beforeEach(() => {
  vi.clearAllMocks();
  mock.list.mockResolvedValue([]);
  mock.products.mockResolvedValue([
    { id: "p", nomProduit: "LM358-N", quantiteStock: 30, prixDetail: 500 },
  ]);
  mock.clients.mockResolvedValue([
    { id: "c", nom: "Client Test", telephone: "+237600000000" },
  ]);
  mock.create.mockResolvedValue({ id: "quote", lignes: [] });
});
it("binds an explicitly selected customer account to the proforma so the online quote cannot rely only on a similar name", async () => {
  render(<Proformas />);
  fireEvent.click(await screen.findByRole("button", { name: "Creer" }));
  await screen.findByRole("option", { name: /Client Test/ });
  fireEvent.change(
    screen.getByLabelText("Compte client associé (pour un devis en ligne)"),
    { target: { value: "c" } },
  );
  fireEvent.focus(
    screen.getByPlaceholderText("Rechercher et ajouter un produit…"),
  );
  fireEvent.mouseDown(await screen.findByRole("button", { name: /LM358-N/ }));
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() => expect(mock.create).toHaveBeenCalled());
  expect(mock.create.mock.calls[0][0].clientId).toBe("c");
  expect(mock.create.mock.calls[0][0].clientNom).toBe("Client Test");
  expect(mock.create.mock.calls[0][0].lignes).toEqual([
    { produitId: "p", quantite: 1, prixUnitaire: 500 },
  ]);
});
