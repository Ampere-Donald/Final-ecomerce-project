import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevisionEditor } from "./RevisionEditor";
import { Detail, revisionApi } from "./api";
vi.mock("./photoDraft", () => ({ photoDraft: vi.fn().mockResolvedValue(null) }));
import { draftKey } from "./drafts";
vi.mock("./api", async (original) => ({
  ...(await original<typeof import("./api")>()),
  revisionApi: {
    detail: vi.fn(),
    action: vi.fn(),
    presence: vi.fn().mockResolvedValue({}),
    releasePresence: vi.fn().mockResolvedValue({}),
    photo: vi.fn(),
  },
}));
vi.mock("../../context/FlowShellContext", () => ({
  useFlowShellFocus: vi.fn(),
}));
vi.mock("../../services/api", () => ({
  getApiErrorMessage: (err: any, fallback: string) =>
    err.response?.data?.message || fallback,
}));
const fixture: Detail = {
  produit: {
    id: "p1",
    nomProduit: "Condensateur 1000 µF",
    code: "C-1000",
    quantiteStock: 8,
    categorieId: "c1",
    sousCategorieId: null,
    prixDetail: 1500,
    prixDemiGros: 1200,
    prixGros: 1000,
    prixPromo: null,
    finPromo: null,
    quantiteGros: null,
    estActif: true,
    prixRevision: 1,
    classementRevision: 1,
    commercialRevision: 1,
    identificationRevision: 1,
    photoRevision: 1,
    identificationVerifieRevision: null,
    photoVerifieRevision: null,
    imageUrl: "https://example.com/photo.jpg",
    prixVerifieRevision: null,
    classementVerifieRevision: null,
    categorie: { nom: "Composants" },
  },
  propositions: [],
  historique: [],
};
const categories = [
  {
    id: "c1",
    nom: "Composants",
    sousCategories: [{ id: "sc1", nom: "Condensateurs" }],
  },
];
const props = () => ({
  detail: structuredClone(fixture),
  categories,
  userId: "admin1",
  canValidate: true,
  onBack: vi.fn(),
  onDone: vi.fn().mockResolvedValue(undefined),
  onSkip: vi.fn(),
});
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    vi.mocked(revisionApi.detail).mockResolvedValue(structuredClone(fixture));
    vi.mocked(revisionApi.action).mockResolvedValue({});
  });
  it("envoie une proposition employé et passe au suivant seulement après succès", async () => {
    const user = userEvent.setup();
    const p = { ...props(), canValidate: false };
    render(<RevisionEditor {...p} />);
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "PRIX",
    );
    await user.clear(screen.getByLabelText("Prix détail"));
    await user.type(screen.getByLabelText("Prix détail"), "1400");
    await user.click(
      screen.getByRole("button", { name: /Envoyer et suivant/ }),
    );
    await waitFor(() => expect(p.onDone).toHaveBeenCalledOnce());
    expect(revisionApi.action).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({
        action: "PROPOSER",
        sujet: "PRIX",
        changements: { prixDetail: 1400 },
      }),
    );
    expect(localStorage.getItem(draftKey("admin1", "p1"))).toBeNull();
  });
  it("conserve la saisie hors ligne, la restaure et isole les comptes", async () => {
    const user = userEvent.setup();
    const p = props();
    const view = render(<RevisionEditor {...p} />);
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "PRIX",
    );
    await user.clear(screen.getByLabelText("Prix détail"));
    await user.type(screen.getByLabelText("Prix détail"), "1800");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    fireEvent(window, new Event("offline"));
    expect(
      (
        screen.getByRole("button", {
          name: /Valider et suivant/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await waitFor(() =>
      expect(localStorage.getItem(draftKey("admin1", "p1"))).toContain("1800"),
    );
    view.unmount();
    const second = render(<RevisionEditor {...p} />);
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "PRIX",
    );
    expect(
      (screen.getByLabelText("Prix détail") as HTMLInputElement).value,
    ).toBe("1800");
    second.unmount();
    render(<RevisionEditor {...p} userId="other" />);
    expect(
      (screen.getByLabelText("Prix détail") as HTMLInputElement).value,
    ).toBe("1500");
    expect(revisionApi.action).not.toHaveBeenCalled();
  });
  it("réessaie avec le même identifiant après une réponse réseau perdue", async () => {
    const user = userEvent.setup();
    const p = props();
    vi.mocked(revisionApi.action)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({});
    vi.mocked(revisionApi.detail).mockResolvedValue({
      ...fixture,
      produit: { ...fixture.produit, prixDetail: 1700, prixRevision: 2 },
    });
    render(<RevisionEditor {...p} />);
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "PRIX",
    );
    await user.click(
      screen.getByRole("button", { name: /Valider et suivant/ }),
    );
    await screen.findByText(/Envoi impossible/);
    expect(p.onDone).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: /Confirmer l’envoi précédent/ }),
    );
    await waitFor(() => expect(p.onDone).toHaveBeenCalledOnce());
    expect(vi.mocked(revisionApi.action).mock.calls[0][1].operationId).toBe(
      vi.mocked(revisionApi.action).mock.calls[1][1].operationId,
    );
  });
  it("exige une confirmation explicite avant d’archiver", async () => {
    const user = userEvent.setup();
    const p = props();
    render(<RevisionEditor {...p} />);
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "PRIX",
    );
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "ARCHIVAGE",
    );
    await user.click(
      screen.getByRole("button", { name: /Valider et suivant/ }),
    );
    expect(revisionApi.action).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: /Confirmer l’archivage/ }),
    );
    await waitFor(() =>
      expect(revisionApi.action).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ action: "ARCHIVER", sujet: "ARCHIVAGE" }),
      ),
    );
  });
  it("présente les nouveaux prix après un conflit sans écraser la saisie", async () => {
    const user = userEvent.setup();
    const p = props();
    vi.mocked(revisionApi.action).mockRejectedValue({
      response: { data: { message: "Article modifié" }, status: 409 },
    });
    vi.mocked(revisionApi.detail).mockResolvedValue({
      ...fixture,
      produit: { ...fixture.produit, prixDetail: 1700, prixRevision: 2 },
    });
    render(<RevisionEditor {...p} />);
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "PRIX",
    );
    await user.clear(screen.getByLabelText("Prix détail"));
    await user.type(screen.getByLabelText("Prix détail"), "1800");
    await user.click(
      screen.getByRole("button", { name: /Valider et suivant/ }),
    );
    await screen.findByText("L’article a changé depuis votre lecture.");
    expect(
      (screen.getByLabelText("Prix détail") as HTMLInputElement).value,
    ).toBe("1800");
    expect(
      (
        screen.getByRole("button", {
          name: /Valider et suivant/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(p.onDone).not.toHaveBeenCalled();
  });
  it("valide le classement séparément et demande confirmation avant archivage", async () => {
    const user = userEvent.setup();
    const p = props();
    render(<RevisionEditor {...p} />);
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "PRIX",
    );
    await user.selectOptions(
      screen.getByLabelText("Contrôle à enregistrer"),
      "CLASSEMENT",
    );
    await user.selectOptions(screen.getByLabelText("Sous-catégorie"), "sc1");
    await user.click(
      screen.getByRole("button", { name: /Valider et suivant/ }),
    );
    await waitFor(() =>
      expect(revisionApi.action).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          sujet: "CLASSEMENT",
          changements: { sousCategorieId: "sc1" },
        }),
      ),
    );
  });

it('valide une fiche complète explicitement et transmet toutes les révisions', async () => {
  const user = userEvent.setup(); const p = props();
  render(<RevisionEditor {...p} />);
  expect(screen.getByLabelText('Contrôle à enregistrer')).toHaveProperty('value', 'COMPLET');
  await user.clear(screen.getByLabelText('Nom de l’article'));
  await user.type(screen.getByLabelText('Nom de l’article'), 'Condensateur 1000 µF 25 V');
  await user.click(screen.getByRole('button', { name: /Tout valider et suivant/ }));
  await waitFor(() => expect(p.onDone).toHaveBeenCalledOnce());
  expect(revisionApi.action).toHaveBeenCalledWith('p1', expect.objectContaining({ sujet: 'COMPLET', identificationRevision: 1, photoRevision: 1, changements: { nomProduit: 'Condensateur 1000 µF 25 V' } }));
});
it('propose un nom séparément et conserve la correction de prix non envoyée', async () => {
  const user = userEvent.setup(); const p = { ...props(), canValidate: false };
  render(<RevisionEditor {...p} />);
  await user.clear(screen.getByLabelText('Prix détail')); await user.type(screen.getByLabelText('Prix détail'), '1800');
  await user.selectOptions(screen.getByLabelText('Contrôle à enregistrer'), 'IDENTIFICATION');
  await user.clear(screen.getByLabelText('Nom de l’article')); await user.type(screen.getByLabelText('Nom de l’article'), 'Nom corrigé');
  await user.click(screen.getByRole('button', { name: /Envoyer et suivant/ }));
  await waitFor(() => expect(p.onDone).toHaveBeenCalledOnce());
  expect(revisionApi.action).toHaveBeenCalledWith('p1', expect.objectContaining({ sujet: 'IDENTIFICATION', action: 'PROPOSER', changements: { nomProduit: 'Nom corrigé' } }));
  expect(JSON.parse(localStorage.getItem(draftKey('admin1', 'p1'))!).form.prixDetail).toBe('1800');
});
it('un motif suffit à ouvrir une discussion sans envoyer les corrections préparées', async () => {
  const user = userEvent.setup(); const p = props(); render(<RevisionEditor {...p} />);
  await user.clear(screen.getByLabelText('Nom de l’article')); await user.type(screen.getByLabelText('Nom de l’article'), 'Nom en préparation');
  await user.selectOptions(screen.getByLabelText('Motif du signalement (facultatif)'), 'Référence incertaine');
  await user.click(screen.getByRole('button', { name: 'À discuter' }));
  await waitFor(() => expect(p.onDone).toHaveBeenCalledOnce());
  expect(revisionApi.action).toHaveBeenCalledWith('p1', expect.objectContaining({ action: 'DISCUTER', commentaire: 'Référence incertaine', changements: {} }));
  expect(localStorage.getItem(draftKey('admin1', 'p1'))).toContain('Nom en préparation');
});
