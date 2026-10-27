import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Filter,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { getApiErrorMessage } from "../services/api";
import { createClientId } from "../utils/clientId";
import {
  Category,
  Detail,
  expected,
  Listing,
  money,
  Mutation,
  Product,
  revisionApi,
} from "../features/catalogue-revision/api";
import { RevisionEditor } from "../features/catalogue-revision/RevisionEditor";
import { Subcategories } from "../features/catalogue-revision/Subcategories";
import "../features/catalogue-revision/revision.css";

const views = [
  ["A_VERIFIER", "À vérifier"],
  ["PROPOSITIONS", "Propositions"],
  ["A_DISCUTER", "À discuter"],
  ["VERIFIES", "Vérifiés"],
];
const fields = ["prixDetail", "prixDemiGros", "prixGros"] as const;
const empty: Listing = { data: [], total: 0, page: 1, lastPage: 1, counts: {} };
interface BatchPreview {
  items: (Mutation & { produitId: string })[];
  products: Product[];
}
function DesktopRow({
  p,
  selected,
  onSelect,
  onChange,
  onOpen,
  edits,
}: {
  p: Product;
  selected: boolean;
  onSelect: () => void;
  onChange: (key: string, value: string) => void;
  onOpen: () => void;
  edits?: Record<string, string>;
}) {
  return (
    <tr>
      <td>
        <label className="flex min-h-11 items-center">
          <input
            aria-label={`Sélectionner ${p.nomProduit}`}
            type="checkbox"
            checked={selected}
            onChange={onSelect}
          />
        </label>
      </td>
      <td className="max-w-xs">
        <button
          className="min-h-11 text-left font-bold hover:underline break-words"
          onClick={onOpen}
        >
          {p.nomProduit}
        </button>
        <p className="text-xs text-slate-500">
          {p.code} · {p.sousCategorie?.nom || p.categorie?.nom}
        </p>
      </td>
      {fields.map((key) => (
        <td key={key}>
          <input
            aria-label={`${key} ${p.nomProduit}`}
            type="text"
            inputMode="decimal"
            value={edits?.[key] ?? (p[key] == null ? "" : String(p[key]))}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </td>
      ))}
      <td className="max-w-xs">
        {p.propositionsCatalogue?.length ? (
          p.propositionsCatalogue.map((proposal) => (
            <p key={proposal.id} className="text-xs mb-2">
              {proposal.auteurNom} :{" "}
              {proposal.type === "CONFIRMATION"
                ? "Confirmé"
                : proposal.type === "DISCUSSION"
                  ? "À discuter"
                  : Object.entries(proposal.changements)
                      .map(
                        ([key, value]) =>
                          `${key} : ${key.startsWith("prix") ? money(value) : value}`,
                      )
                      .join(", ")}
            </p>
          ))
        ) : (
          <span className="text-slate-500 text-xs">
            {p.prixVerifieRevision === p.prixRevision
              ? "Prix vérifiés"
              : "À vérifier"}
          </span>
        )}
        <button onClick={onOpen} className="revision-button secondary">
          Examiner
        </button>
      </td>
    </tr>
  );
}

export function CatalogueRevision() {
  const { admin } = useAdminAuth();
  const canValidate = ["ADMIN", "SUPER_ADMIN"].includes(admin?.role || "");
  const userId = admin?.id || "";
  const [params, setParams] = useSearchParams();
  const article = params.get("article") || "";
  const urlSearch = params.get("search") || "";
  const listParams = new URLSearchParams(params);
  listParams.delete("article");
  const filterKey = listParams.toString();
  const scrollKey = `catalogue-scroll:${userId}:${filterKey}`;
  const filterRef = useRef(filterKey);
  filterRef.current = filterKey;
  const [listing, setListing] = useState<Listing>(empty);
  const [categories, setCategories] = useState<Category[]>([]);
  const [team, setTeam] = useState<{ id: string; nom: string }[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => setSearch(urlSearch), [urlSearch]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const baselines = useRef<Record<string, Product>>({});
  const [preview, setPreview] = useState<BatchPreview | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchResults, setBatchResults] = useState<
    { produitId: string; ok: boolean; message?: string }[] | null
  >(null);
  const prefetched = useRef<Detail | null>(null);
  const restoreScroll = useRef<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const state = params.get("etat") || "A_VERIFIER";
  const categoryId = params.get("categorieId") || "";
  const subcats =
    categories.find((c) => c.id === categoryId)?.sousCategories || [];
  const updateFilters = useCallback(
    (changes: Record<string, string>) => {
      setParams(
        (old) => {
          const next = new URLSearchParams(old);
          next.delete("article");
          next.set("page", "1");
          Object.entries(changes).forEach(([key, value]) =>
            value ? next.set(key, value) : next.delete(key),
          );
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const load = useCallback(async () => {
    const key = filterRef.current;
    const response = await revisionApi.list(
      Object.fromEntries(new URLSearchParams(key)),
    );
    if (key === filterRef.current) {
      setListing(response);
      setError("");
      setLoading(false);
    }
    return response;
  }, []);
  const reloadCategories = useCallback(async () => {
    setCategories(await revisionApi.categories());
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([revisionApi.categories(), revisionApi.equipe()])
      .then(([cats, members]) => {
        if (alive) {
          setCategories(cats);
          setTeam(members);
        }
      })
      .catch((err) => {
        if (alive)
          setError(
            getApiErrorMessage(err, "Chargement des catégories impossible."),
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let busy = false;
    let delay = 10000;
    setLoading(true);
    setSelected(new Set());
    const refresh = async () => {
      clearTimeout(timer);
      if (!alive || busy) return;
      if (!document.hidden && navigator.onLine) {
        busy = true;
        try {
          await load();
          delay = 10000;
        } catch (err) {
          if (alive) {
            setError(
              getApiErrorMessage(
                err,
                "Synchronisation impossible. Réessayez au retour de la connexion.",
              ),
            );
            setLoading(false);
          }
          delay = Math.min(60000, delay * 2);
        } finally {
          busy = false;
        }
      } else if (!navigator.onLine) {
        setError("Hors ligne. Les brouillons restent sur cet appareil.");
        setLoading(false);
      }
      if (alive) timer = setTimeout(refresh, delay);
    };
    void refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [filterKey, load]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (params.get("search") || "")) updateFilters({ search });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, params, updateFilters]);
  useEffect(() => {
    if (!article) {
      setDetail(null);
      return;
    }
    let alive = true;
    setDetail(
      prefetched.current?.produit.id === article ? prefetched.current : null,
    );
    revisionApi
      .detail(article)
      .then((value) => {
        if (alive) setDetail(value);
      })
      .catch((err) => {
        if (alive) setError(getApiErrorMessage(err, "Article introuvable."));
      });
    const next =
      listing.data[listing.data.findIndex((p) => p.id === article) + 1];
    if (next)
      revisionApi
        .detail(next.id)
        .then((value) => {
          if (alive) prefetched.current = value;
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
    // The selected article owns its form; polling the list must not remount it.
  }, [article]);
  useEffect(() => {
    if (!article && !loading) {
      if (restoreScroll.current === null) {
        try {
          restoreScroll.current = Number(
            sessionStorage.getItem(scrollKey) || 0,
          );
        } catch {
          restoreScroll.current = 0;
        }
      }
      const parent =
        document.querySelector("main > div.overflow-y-auto") ||
        document.querySelector("main .overflow-y-auto");
      if (parent) parent.scrollTop = restoreScroll.current;
      restoreScroll.current = null;
    }
  }, [article, loading, scrollKey]);
  useEffect(() => {
    if (preview) {
      previewRef.current?.focus();
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !batchBusy) setPreview(null);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [preview, batchBusy]);

  function open(id: string) {
    const parent = document.querySelector("main .overflow-y-auto");
    try {
      sessionStorage.setItem(scrollKey, String(parent?.scrollTop || 0));
    } catch {
      /* no storage */
    }
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.set("article", id);
      return next;
    });
  }
  function back() {
    try {
      restoreScroll.current = Number(sessionStorage.getItem(scrollKey) || 0);
    } catch {
      restoreScroll.current = 0;
    }
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        next.delete("article");
        return next;
      },
      { replace: true },
    );
  }
  async function next(done: boolean) {
    const old = listing.data;
    const index = old.findIndex((p) => p.id === article);
    let response = listing;
    if (done) {
      try {
        response = await load();
        setNotice(
          canValidate
            ? "Décision enregistrée."
            : "Proposition envoyée à l’équipe.",
        );
      } catch {
        setNotice(
          "Enregistrement confirmé. La liste sera actualisée au retour du réseau.",
        );
      }
    }
    const after = old
      .slice(index + 1)
      .find((p) => response.data.some((current) => current.id === p.id));
    const candidate =
      after ||
      (done
        ? response.data.find(
            (p) =>
              p.id !== article &&
              !old
                .slice(0, Math.max(index, 0))
                .some((earlier) => earlier.id === p.id),
          )
        : undefined);
    if (candidate)
      setParams(
        (oldParams) => {
          const value = new URLSearchParams(oldParams);
          value.set("article", candidate.id);
          return value;
        },
        { replace: true },
      );
    else if (listing.page < response.lastPage) {
      const key = filterRef.current;
      const page = String(listing.page + 1);
      try {
        const nextPage = await revisionApi.list({
          ...Object.fromEntries(new URLSearchParams(key)),
          page,
        });
        if (key !== filterRef.current) return;
        const first = nextPage.data[0];
        setParams(
          (oldParams) => {
            const value = new URLSearchParams(oldParams);
            value.set("page", page);
            if (first) value.set("article", first.id);
            else value.delete("article");
            return value;
          },
          { replace: true },
        );
      } catch {
        setError("La page suivante est indisponible. Votre saisie est conservée ; réessayez au retour du réseau.");
      }
    }
    else {
      back();
      if (!done)
        setNotice(
          "Fin de cette page. Retrouvez les articles restants dans la liste.",
        );
    }
  }
  function edit(p: Product, key: string, value: string) {
    if (!baselines.current[p.id]) baselines.current[p.id] = p;
    setEdits((old) => ({ ...old, [p.id]: { ...old[p.id], [key]: value } }));
  }
  function prepareBatch() {
    const products = listing.data.filter((p) => selected.has(p.id));
    const items = products.map((p) => {
      const base = baselines.current[p.id] || p;
      const changements = Object.fromEntries(
        Object.entries(edits[p.id] || {}).map(([key, value]) => [
          key,
          value.trim()
            ? Number(value.replace(/\s/g, "").replace(",", "."))
            : null,
        ]),
      );
      return {
        produitId: p.id,
        operationId: createClientId(),
        action: "VALIDER",
        sujet: "PRIX" as const,
        ...expected(base),
        changements,
      };
    });
    setBatchResults(null);
    setPreview({ items, products });
  }
  async function confirmBatch() {
    if (!preview || batchBusy) return;
    setBatchBusy(true);
    try {
      const response = await revisionApi.batch(preview.items);
      setBatchResults(response.results);
      const successes = new Set(
        response.results.filter((r) => r.ok).map((r) => r.produitId),
      );
      setSelected(
        (old) => new Set([...old].filter((id) => !successes.has(id))),
      );
      setEdits((old) =>
        Object.fromEntries(
          Object.entries(old).filter(([id]) => !successes.has(id)),
        ),
      );
      successes.forEach((id) => delete baselines.current[id]);
      await load();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Traitement interrompu. Réessayez : les articles déjà enregistrés ne seront pas traités deux fois.",
        ),
      );
    } finally {
      setBatchBusy(false);
    }
  }

  if (article && detail?.produit.id === article)
    return (
      <RevisionEditor
        key={`${userId}:${article}`}
        detail={detail}
        categories={categories}
        userId={userId}
        canValidate={canValidate}
        onBack={back}
        onDone={() => next(true)}
        onSkip={() => void next(false)}
      />
    );
  if (article)
    return (
      <div className="catalogue-revision space-y-4">
        <button className="revision-button secondary" onClick={back}>
          Retour à la liste
        </button>
        <p role="status">{error || "Chargement de l’article…"}</p>
      </div>
    );

  return (
    <section className="catalogue-revision space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Catalogue · travail en équipe
          </p>
          <h1 className="mt-1 text-2xl font-bold">Révision du catalogue</h1>
          <p className="mt-2 text-sm text-slate-500">
            {canValidate
              ? "Vérifiez, corrigez et validez les articles de la boutique."
              : "Confirmez les prix ou proposez une correction à un administrateur."}
          </p>
        </div>
        <button
          aria-label="Actualiser le catalogue"
          className="revision-button secondary"
          onClick={() =>
            void load().catch((err) =>
              setError(getApiErrorMessage(err, "Actualisation impossible.")),
            )
          }
        >
          <RefreshCw size={18} />
        </button>
      </header>
      {notice && (
        <p role="status" className="text-sm text-emerald-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="revision-error">
          {error}
        </p>
      )}
      <div className="revision-tabs">
        {views.map(([key, label]) => (
          <button
            key={key}
            aria-pressed={state === key}
            onClick={() => updateFilters({ etat: key })}
          >
            {label}
            <strong>{listing.counts[key] ?? "—"}</strong>
          </button>
        ))}
      </div>
      <div className="revision-panel space-y-3">
        <label className="revision-field">
          <span className="flex gap-2 items-center">
            <Search size={16} /> Rechercher un article
          </span>
          <input
            type="search"
            placeholder="Nom ou code produit"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <details>
          <summary className="min-h-11 cursor-pointer flex gap-2 items-center text-sm font-semibold">
            <Filter size={16} /> Catégories et filtres
          </summary>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <label className="revision-field">
              <span>Catégorie</span>
              <select
                value={categoryId}
                onChange={(e) =>
                  updateFilters({
                    categorieId: e.target.value,
                    sousCategorieId: "",
                  })
                }
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="revision-field">
              <span>Sous-catégorie</span>
              <select
                value={params.get("sousCategorieId") || ""}
                onChange={(e) =>
                  updateFilters({ sousCategorieId: e.target.value })
                }
              >
                <option value="">Toutes les sous-catégories</option>
                {subcats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="revision-field">
              <span>Propositions de</span>
              <select
                value={params.get("auteurId") || ""}
                onChange={(e) => updateFilters({ auteurId: e.target.value })}
              >
                <option value="">Toute l’équipe</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.nom}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={params.get("classement") === "a-verifier"}
                onChange={(e) =>
                  updateFilters({
                    classement: e.target.checked ? "a-verifier" : "",
                  })
                }
              />{" "}
              Classement à vérifier
            </label>
          </div>
        </details>
      </div>
      <div className="flex justify-between flex-wrap gap-2 items-center">
        <p className="text-sm text-slate-500">
          {listing.total} article(s) · actualisation toutes les 10 s
        </p>
        <button
          className="revision-button primary"
          disabled={!listing.data.length}
          onClick={() => open(listing.data[0].id)}
        >
          <Check size={18} /> Commencer la vérification
        </button>
      </div>
      {loading && (
        <p role="status" className="text-sm text-slate-500">
          Chargement…
        </p>
      )}
      {!loading && !listing.data.length && (
        <div className="revision-panel text-center py-10">
          <Check className="mx-auto text-emerald-600 mb-3" />
          <p className="font-bold">Aucun article dans cette vue.</p>
          <p className="text-sm text-slate-500 mt-2">
            Choisissez un autre onglet ou ajustez les filtres.
          </p>
        </div>
      )}
      <div className={canValidate ? "revision-mobile space-y-3" : "space-y-3"}>
        {listing.data.map((p) => (
          <button
            key={p.id}
            className="revision-card"
            onClick={() => open(p.id)}
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt="" loading="lazy" />
            ) : (
              <Package className="text-slate-400 shrink-0" size={40} />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-slate-500">
                {p.code} · {p.sousCategorie?.nom || p.categorie?.nom}
              </span>
              <span className="block font-bold text-sm break-words mt-1">
                {p.nomProduit}
              </span>
              <span className="block font-semibold text-indigo-900 mt-1">
                {money(p.prixDetail)}
              </span>
              <span className="block text-xs text-slate-500 mt-1">
                {p.propositionsCatalogue?.length
                  ? `${p.propositionsCatalogue.length} proposition(s)`
                  : p.prixVerifieRevision === p.prixRevision
                    ? "Prix vérifiés"
                    : "Prix à vérifier"}{" "}
                ·{" "}
                {p.classementVerifieRevision === p.classementRevision
                  ? "Classement vérifié"
                  : "Classement à vérifier"}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0" />
          </button>
        ))}
      </div>
      {canValidate && listing.data.length > 0 && (
        <div className="revision-desktop revision-panel">
          <table className="revision-table">
            <thead>
              <tr>
                <th>Choix</th>
                <th>Article</th>
                <th>Détail</th>
                <th>Demi-gros</th>
                <th>Gros</th>
                <th>Équipe / action</th>
              </tr>
            </thead>
            <tbody>
              {listing.data.map((p) => (
                <DesktopRow
                  key={p.id}
                  p={p}
                  edits={edits[p.id]}
                  selected={selected.has(p.id)}
                  onSelect={() => {
                    if (!baselines.current[p.id]) baselines.current[p.id] = p;
                    setSelected((old) => {
                      const value = new Set(old);
                      value.has(p.id) ? value.delete(p.id) : value.add(p.id);
                      return value;
                    });
                  }}
                  onChange={(key, value) => edit(p, key, value)}
                  onOpen={() => open(p.id)}
                />
              ))}
            </tbody>
          </table>
          <button
            className="revision-button primary mt-4"
            disabled={!selected.size}
            onClick={prepareBatch}
          >
            Examiner et valider la sélection ({selected.size})
          </button>
        </div>
      )}
      <nav className="revision-pagination" aria-label="Pages du catalogue">
        <button
          className="revision-button secondary"
          disabled={listing.page <= 1}
          onClick={() => updateFilters({ page: String(listing.page - 1) })}
        >
          Précédent
        </button>
        <span>
          {listing.page} / {listing.lastPage}
        </span>
        <button
          className="revision-button secondary"
          disabled={listing.page >= listing.lastPage}
          onClick={() => updateFilters({ page: String(listing.page + 1) })}
        >
          Suivant
        </button>
      </nav>
      {canValidate && (
        <Subcategories categories={categories} reload={reloadCategories} />
      )}
      {preview && (
        <div className="revision-overlay">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-title"
            ref={previewRef}
            tabIndex={-1}
            className="revision-dialog"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                const nodes = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                );
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (
                  event.shiftKey &&
                  (document.activeElement === first ||
                    document.activeElement === event.currentTarget)
                ) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <h2 id="batch-title" className="font-bold text-lg">
              Valider {preview.items.length} article(s)
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Vérifiez les tarifs ci-dessous. Les tarifs non modifiés seront
              confirmés.
            </p>
            <ul className="my-4 space-y-4">
              {preview.products.map((p, index) => (
                <li key={p.id} className="text-sm border-t pt-3">
                  <strong>{p.nomProduit}</strong>
                  {fields.map((key) => (
                    <p key={key}>
                      {key === "prixDetail"
                        ? "Détail"
                        : key === "prixGros"
                          ? "Gros"
                          : "Demi-gros"}{" "}
                      : {money(p[key])}
                      {Object.prototype.hasOwnProperty.call(
                        preview.items[index].changements || {},
                        key,
                      )
                        ? ` → ${money(preview.items[index].changements?.[key])}`
                        : " · confirmé"}
                    </p>
                  ))}
                  {batchResults?.find((r) => r.produitId === p.id) && (
                    <p className="mt-2 font-semibold">
                      {batchResults.find((r) => r.produitId === p.id)?.ok
                        ? "Enregistré"
                        : batchResults.find((r) => r.produitId === p.id)
                            ?.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <button
                className="revision-button secondary"
                disabled={batchBusy}
                onClick={() => setPreview(null)}
              >
                Fermer
              </button>
              {!batchResults && (
                <button
                  className="revision-button primary"
                  disabled={batchBusy || !navigator.onLine}
                  onClick={() => void confirmBatch()}
                >
                  {batchBusy ? "Enregistrement…" : "Confirmer la sélection"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
