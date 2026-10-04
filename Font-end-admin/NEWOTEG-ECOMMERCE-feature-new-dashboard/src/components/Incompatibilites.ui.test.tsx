import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  admin: { id: "admin-fixture", role: "ADMIN" },
  token: "session-fixture",
}));
vi.mock("../services/api", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("../context/AdminAuthContext", () => ({
  useAdminAuth: () => ({ admin: mocks.admin }),
}));
vi.mock("../services/adminSession", () => ({
  getAdminToken: () => mocks.token,
}));
import { Incompatibilites } from "./Incompatibilites";
const id = "0634b3a5-6e4e-48aa-8047-f94bc988c1f3";
const row = {
  id,
  version: 1,
  statut: "SIGNALE",
  quantite: 2,
  motif: "BROCHAGE",
  description: "Les broches diffèrent de mon montage. <script>privé</script>",
  createdAt: "2026-10-04T09:00:00Z",
  reponseBoutique: null,
  retourQuantite: null,
  retourConfirmeAt: null,
  ligne: {
    nomProduit: "Pièce de recette",
    quantite: 2,
    commande: { id, numeroSuivi: "INC-FIXTURE" },
  },
  historique: [],
};
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.admin = { id: "admin-fixture", role: "ADMIN" };
  mocks.get.mockResolvedValue({ data: { page: 1, total: 1, items: [row] } });
  mocks.post.mockImplementation((_url: string, body: any) =>
    Promise.resolve({
      data: { id, statut: body.action, version: body.expectedVersion + 1 },
    }),
  );
});
it("refuse une session vendeur sans lecture privée et rend le diagnostic comme texte", async () => {
  mocks.admin = { id: "seller", role: "VENDEUR" };
  const view = render(<Incompatibilites />);
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(mocks.get).not.toHaveBeenCalled();
  mocks.admin = { id: "admin-fixture", role: "ADMIN" };
  view.rerender(<Incompatibilites />);
  await screen.findByText(row.description);
  expect(document.querySelector("script")).toBeNull();
});
it("exige la confirmation physique et reprend exactement une décision interrompue après remontage", async () => {
  mocks.post.mockRejectedValueOnce(new Error("Private SQL failure"));
  const view = render(<Incompatibilites />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Examiner et répondre" }),
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Décision"),
    "RETOUR_CONFIRME",
  );
  await userEvent.type(
    screen.getByLabelText("Réponse privée au client"),
    "Les deux pièces ont été reçues et vérifiées.",
  );
    expect((screen.getByRole("button", { name: "Enregistrer la décision" }) as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.post).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(
    screen.getByRole("button", { name: "Enregistrer la décision" }),
  );
  await screen.findByRole("alert");
  const first = mocks.post.mock.calls[0];
  expect(first[1].retourQuantite).toBe(2);
  const stored = sessionStorage.getItem(
    "newoteg_incompatibility_decision_v1:admin-fixture",
  )!;
  expect(stored).not.toContain("Private SQL");
  expect(stored).not.toContain("session-fixture");
  view.unmount();
  render(<Incompatibilites />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Reprendre la même décision" }),
  );
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
  expect(mocks.post.mock.calls[1]).toEqual(first);
  await screen.findByText(/Décision enregistrée/);
  expect(
    sessionStorage.getItem("newoteg_incompatibility_decision_v1:admin-fixture"),
  ).toBeNull();
});
it("cache une lecture en panne sans exposer les détails et ne décide pas sur une ancienne liste", async () => {
  render(<Incompatibilites />);
  await screen.findByText(row.description);
  mocks.get.mockRejectedValueOnce(new Error("Private SQL text and tokens"));
  await userEvent.click(screen.getByRole("button", { name: "Actualiser" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("article")).toBeNull();
  expect(screen.getByRole("alert").textContent).not.toContain("Private SQL");
});
