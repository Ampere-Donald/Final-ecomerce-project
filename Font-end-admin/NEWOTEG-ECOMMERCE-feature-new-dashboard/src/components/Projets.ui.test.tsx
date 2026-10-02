import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Projets } from "./Projets";
import {
  blankForm,
  editorKey,
  formFromProject,
  formPayload,
  readSession,
  writeSession,
  type EditorSession,
} from "../features/projects/projectEditorData";
import type { ProjectRow } from "../services/projets";

const mock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  withdraw: vi.fn(),
  products: vi.fn(),
  admin: { id: "boss", role: "ADMIN" },
}));
vi.mock("../context/AdminAuthContext", () => ({
  useAdminAuth: () => ({ admin: mock.admin }),
}));
vi.mock("../services/api", () => ({
  produitApi: { list: mock.products },
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));
vi.mock("../services/projets", () => ({
  projetApi: {
    list: mock.list,
    get: mock.get,
    create: mock.create,
    update: mock.update,
    publish: mock.publish,
    withdraw: mock.withdraw,
  },
}));
const product = {
  id: "00000000-0000-4000-8000-000000000001",
  nomProduit: "Pièce fictive",
  code: "DEMO-N",
  estActif: true,
  description: "Pièce réservée à la recette",
  prixDetail: 3000,
  quantiteStock: 10,
  attributs: [{ nomAttribut: "Tension", valeurs: [{ valeur: "5 V" }] }],
  cmupActuel: "PRIVATE_COST",
};
const project = (changes: Partial<ProjectRow> = {}): ProjectRow => ({
  id: "00000000-0000-4000-8000-000000000002",
  version: 1,
  slug: "projet-test",
  titre: "Projet de recette",
  titreEn: "",
  resume: "Démonstration",
  resumeEn: "",
  objectif: "Vérifier un parcours",
  prerequis: "Données fictives",
  contraintes: "Aucun montage réel",
  niveau: "DEBUTANT",
  imageUrl: "",
  ordre: 0,
  statut: "BROUILLON",
  documents: [
    { titre: "Guide de recette", url: "https://example.com/demo.pdf" },
  ],
  lignes: [
    {
      id: "00000000-0000-4000-8000-000000000003",
      produitId: product.id,
      reference: product.code,
      nomProduit: product.nomProduit,
      role: "Pièce principale",
      quantite: 2,
      necessaire: true,
      ordre: 0,
      produit: product,
      empreinteActuelle: "a".repeat(64),
    },
  ],
  historique: [],
  ...changes,
});
const key = editorKey("boss:ADMIN");
const response = (
  row: ProjectRow,
  payload: { requestId: string },
  replay = false,
) => ({
  projet: row,
  operation: {
    requestId: payload.requestId,
    versionAppliquee: row.version,
    rejoue: replay,
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mock.admin = { id: "boss", role: "ADMIN" };
  mock.list.mockResolvedValue([project()]);
  mock.get.mockResolvedValue(project());
  // The real list endpoint omits nested values; full project details include them.
  mock.products.mockResolvedValue({
    data: [
      {
        ...product,
        attributs: [{ nomAttribut: "Tension", typeAttribut: "TEXTE" }],
      },
    ],
  });
  mock.create.mockImplementation((payload) =>
    Promise.resolve(response(project(), payload)),
  );
  mock.update.mockImplementation((_id, payload) =>
    Promise.resolve(response(project({ version: 2 }), payload)),
  );
  mock.publish.mockImplementation((_id, payload) =>
    Promise.resolve(
      response(project({ statut: "PUBLIE", version: 2 }), payload),
    ),
  );
  mock.withdraw.mockImplementation((_id, payload) =>
    Promise.resolve(response(project({ version: 3 }), payload)),
  );
});
const show = () => render(<Projets />);
const open = async () => {
  fireEvent.click(
    await screen.findByRole("button", { name: /Projet de recette.*pièces/ }),
  );
  await screen.findByText("Version boutique relue.");
};
it("requires an administrator before loading project data", async () => {
  mock.admin = { id: "seller", role: "VENDEUR" };
  show();
  expect(screen.getByRole("alert").textContent).toContain("réservée");
  expect(mock.list).not.toHaveBeenCalled();
});
it("selects the exact product once, preserves its suffix and never stores internal product costs", async () => {
  show();
  await screen.findByRole("button", { name: /Projet de recette.*pièces/ });
  fireEvent.change(screen.getByLabelText("Rechercher une pièce du catalogue"), {
    target: { value: "DEMO-N" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Ajouter DEMO-N" }),
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Ajouter DEMO-N",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(localStorage.getItem(key)).toContain("DEMO-N");
  expect(localStorage.getItem(key)).not.toContain("PRIVATE_COST");
  expect(screen.getAllByLabelText(/Quantité, pièce/)).toHaveLength(1);
  expect(mock.create).not.toHaveBeenCalled();
});
it("replaces a missing reference explicitly while keeping quantity, role and optional status", async () => {
  mock.get.mockResolvedValue(
    project({
      lignes: [
        {
          ...project().lignes[0],
          produitId: null,
          produit: null,
          empreinteActuelle: null,
          reference: "MISSING-N",
          quantite: 7,
          necessaire: false,
          role: "Accessoire de recette",
        },
      ],
    }),
  );
  show();
  await open();
  fireEvent.click(
    screen.getByRole("button", { name: "Choisir une pièce pour la ligne 1" }),
  );
  fireEvent.change(screen.getByLabelText("Rechercher une pièce du catalogue"), {
    target: { value: "DEMO-N" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Choisir DEMO-N" }),
  );
  expect(screen.getAllByLabelText(/Quantité, pièce/)).toHaveLength(1);
  expect(
    (screen.getByLabelText("Quantité, pièce 1") as HTMLInputElement).value,
  ).toBe("7");
  expect(
    (screen.getByLabelText("Rôle, pièce 1") as HTMLInputElement).value,
  ).toBe("Accessoire de recette");
  expect(
    (screen.getByLabelText("Nécessaire au projet") as HTMLInputElement).checked,
  ).toBe(false);
  const stored = readSession("boss:ADMIN").session!;
  expect(stored.form.lignes[0].produitId).toBe(product.id);
  expect(stored.form.lignes[0].referenceSouhaitee).toBe("DEMO-N");
  expect(mock.update).not.toHaveBeenCalled();
});
it("records a draft only with the current version and quantities; double clicks send once", async () => {
  let finish!: (value: unknown) => void;
  mock.update.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  show();
  await open();
  fireEvent.change(screen.getByLabelText("Quantité, pièce 1"), {
    target: { value: "3" },
  });
  const save = screen.getByRole("button", { name: "Enregistrer le brouillon" });
  fireEvent.click(save);
  fireEvent.click(save);
  expect(mock.update).toHaveBeenCalledTimes(1);
  const [id, payload] = mock.update.mock.calls[0];
  expect(id).toBe(project().id);
  expect(payload.version).toBe(1);
  expect(payload.lignes).toEqual([
    {
      produitId: product.id,
      referenceSouhaitee: "DEMO-N",
      role: "Pièce principale",
      quantite: 3,
      necessaire: true,
    },
  ]);
  expect(JSON.parse(localStorage.getItem(key)!).pending.payload).toEqual(
    payload,
  );
  finish(
    response(
      project({
        version: 2,
        lignes: [{ ...project().lignes[0], quantite: 3 }],
      }),
      payload,
    ),
  );
  await screen.findByText(/Brouillon enregistré/);
  expect(JSON.parse(localStorage.getItem(key)!).pending).toBeNull();
  expect(mock.publish).not.toHaveBeenCalled();
});
it("requires fresh per-piece and global checks, with the exact reviewed signatures before publication", async () => {
  show();
  await open();
  fireEvent.click(
    screen.getByRole("button", { name: "Vérifier avant publication" }),
  );
  await screen.findByRole("region", { name: "Vérification avant publication" });
  const publish = screen.getByRole("button", {
    name: "Publier le projet vérifié",
  }) as HTMLButtonElement;
  expect(publish.disabled).toBe(true);
  fireEvent.click(
    screen.getByLabelText("Référence et caractéristiques vérifiées : DEMO-N"),
  );
  fireEvent.click(
    screen.getByLabelText("Matériel, quantités et accessoires vérifiés"),
  );
  fireEvent.click(
    screen.getByLabelText("Contraintes et documentation vérifiées"),
  );
  fireEvent.change(screen.getByLabelText(/Note de validation privée/), {
    target: { value: "Montage et accessoires relus par la boutique." },
  });
  expect(publish.disabled).toBe(false);
  fireEvent.click(publish);
  await screen.findByText("Projet publié selon son calendrier.");
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(mock.publish).toHaveBeenCalledWith(
    project().id,
    expect.objectContaining({
      version: 1,
      referencesVerifiees: true,
      materielEtQuantitesVerifies: true,
      contraintesEtDocumentsVerifies: true,
      verifications: [
        { ligneId: project().lignes[0].id, empreinteTechnique: "a".repeat(64) },
      ],
    }),
  );
  expect(
    screen.queryByRole("region", { name: "Vérification avant publication" }),
  ).toBeNull();
});
it("keeps publication blocked when a required product is missing and never substitutes another", async () => {
  mock.get.mockResolvedValue(
    project({
      lignes: [
        { ...project().lignes[0], produit: null, empreinteActuelle: null },
      ],
    }),
  );
  show();
  await open();
  fireEvent.click(
    screen.getByRole("button", { name: "Vérifier avant publication" }),
  );
  await screen.findByRole("region", { name: "Vérification avant publication" });
  expect(
    (
      screen.getByLabelText(
        "Référence et caractéristiques vérifiées : DEMO-N",
      ) as HTMLInputElement
    ).disabled,
  ).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Publier le projet vérifié",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(mock.publish).not.toHaveBeenCalled();
});
it("reloads after a lost create reply and retries the identical saved attempt", async () => {
  mock.create
    .mockRejectedValueOnce(new Error("lost"))
    .mockImplementationOnce((payload) =>
      Promise.resolve(response(project(), payload, true)),
    );
  let view = show();
  await screen.findByRole("button", { name: /Projet de recette.*pièces/ });
  fireEvent.change(screen.getByLabelText("Titre"), {
    target: { value: "Projet de recette" },
  });
  fireEvent.change(screen.getByLabelText(/Lien du projet/), {
    target: { value: "projet-test" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer le brouillon" }),
  );
  await screen.findByText(/La réponse n’a pas été confirmée/);
  const payload = mock.create.mock.calls[0][0];
  view.unmount();
  view = show();
  fireEvent.click(
    await screen.findByRole("button", { name: "Reprendre l’enregistrement" }),
  );
  await screen.findByText(/Tentative retrouvée/);
  expect(mock.create.mock.calls.map((c) => c[0])).toEqual([payload, payload]);
  expect(JSON.parse(localStorage.getItem(key)!).projectId).toBe(project().id);
});
it("a server version conflict keeps edits but resets review and allows re-reading the current version", async () => {
  mock.update.mockRejectedValue({ response: { status: 409 } });
  show();
  await open();
  fireEvent.change(screen.getByLabelText("Titre"), {
    target: { value: "Mon titre conservé" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer le brouillon" }),
  );
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Titre") as HTMLInputElement).value).toBe(
    "Mon titre conservé",
  );
  expect(JSON.parse(localStorage.getItem(key)!).pending).toBeNull();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  mock.get.mockResolvedValue(
    project({ version: 3, titre: "Version de mon collègue" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Relire la version boutique" }),
  );
  await waitFor(() =>
    expect((screen.getByLabelText("Titre") as HTMLInputElement).value).toBe(
      "Version de mon collègue",
    ),
  );
  confirm.mockRestore();
});
it("blocks mutations when local storage is corrupt or denied", async () => {
  localStorage.setItem(key, "{broken");
  const view = show();
  await screen.findByRole("alert");
  expect(
    (
      screen.getByRole("button", {
        name: "Enregistrer le brouillon",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  expect(mock.create).not.toHaveBeenCalled();
  view.unmount();
  localStorage.clear();
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("denied");
  });
  show();
  fireEvent.change(screen.getByLabelText("Titre"), {
    target: { value: "Projet test" },
  });
  fireEvent.change(screen.getByLabelText(/Lien du projet/), {
    target: { value: "projet-test" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Enregistrer le brouillon" }),
  );
  await screen.findByText(/Rien n’a été envoyé/);
  expect(mock.create).not.toHaveBeenCalled();
  spy.mockRestore();
});
it("cannot replace a pending operation from another tab and uses per-account drafts", async () => {
  const other: EditorSession = {
    schema: 1,
    actorKey: "boss:ADMIN",
    projectId: "",
    baseVersion: 0,
    form: blankForm(),
    pending: {
      kind: "create",
      projectId: "",
      payload: {
        requestId: "00000000-0000-4000-8000-000000000004",
        lignes: [],
        documents: [],
      },
    },
  };
  expect(writeSession(other)).toBe(true);
  expect(writeSession({ ...other, pending: null })).toBe(false);
  expect(readSession("someone-else:ADMIN").session).toBeNull();
  const view = show();
  await screen.findByRole("button", { name: "Reprendre l’enregistrement" });
  mock.admin = { id: "someone-else", role: "ADMIN" };
  view.rerender(<Projets />);
  expect(
    screen.queryByRole("button", { name: "Reprendre l’enregistrement" }),
  ).toBeNull();
  expect((screen.getByLabelText("Titre") as HTMLInputElement).value).toBe("");
});
it("withdraws only with an explicit reason and the version currently displayed", async () => {
  mock.get.mockResolvedValue(project({ statut: "PUBLIE", version: 2 }));
  show();
  await open();
  expect(
    (
      screen.getByRole("button", {
        name: "Retirer le projet",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Motif du retrait"), {
    target: { value: "Documentation à actualiser" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Retirer le projet" }));
  await screen.findByText(/Projet retiré/);
  expect(mock.withdraw).toHaveBeenCalledWith(
    project().id,
    expect.objectContaining({
      version: 2,
      motif: "Documentation à actualiser",
    }),
  );
});
it("rejects fractional quantities and repeated products before sending; preserves date clearing", () => {
  const form = formFromProject(project());
  form.lignes[0].quantite = "1.5";
  expect(() => formPayload(form)).toThrow(/entière/);
  form.lignes[0].quantite = "2";
  form.lignes.push({ ...form.lignes[0], key: "other" });
  expect(() => formPayload(form)).toThrow(/une fois/);
  form.lignes.pop();
  expect(formPayload(form)).toMatchObject({
    debutPublication: null,
    finPublication: null,
  });
});
it("ignores a stale initial detail response after another project has been selected", async () => {
  const first = project();
  const second = project({
    id: "second",
    titre: "Autre projet",
    slug: "autre-projet",
  });
  const session: EditorSession = {
    schema: 1,
    actorKey: "boss:ADMIN",
    projectId: first.id,
    baseVersion: first.version,
    form: formFromProject(first),
    pending: null,
  };
  writeSession(session);
  mock.list.mockResolvedValue([first, second]);
  let finish!: (value: unknown) => void;
  mock.get
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    )
    .mockResolvedValueOnce(second);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  show();
  fireEvent.click(
    await screen.findByRole("button", { name: /Autre projet.*pièces/ }),
  );
  await screen.findByText("Version boutique relue.");
  finish(first);
  await waitFor(() =>
    expect((screen.getByLabelText("Titre") as HTMLInputElement).value).toBe(
      "Autre projet",
    ),
  );
  confirm.mockRestore();
});
