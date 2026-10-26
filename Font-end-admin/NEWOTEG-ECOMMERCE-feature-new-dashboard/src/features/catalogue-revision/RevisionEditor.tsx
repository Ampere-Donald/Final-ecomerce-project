import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  MessageCircle,
  Package,
  WifiOff,
} from "lucide-react";
import { useFlowShellFocus } from "../../context/FlowShellContext";
import { getApiErrorMessage } from "../../services/api";
import { createClientId } from "../../utils/clientId";
import {
  Category,
  Detail,
  expected,
  fieldLabels,
  money,
  Mutation,
  Product,
  Proposal,
  revisionApi,
  Subject,
  dateLabel,
} from "./api";
import { readDraft, removeDraft, saveDraft } from "./drafts";
import "./revision.css";

type Form = Record<string, string>;
interface Draft {
  form: Form;
  base: Product;
  subject: Subject;
  commentaire: string;
  proposalId?: string;
  pending?: { signature: string; payload: Mutation };
}
const priceFields = [
  "prixDetail",
  "prixDemiGros",
  "prixGros",
  "prixPromo",
  "quantiteGros",
  "finPromo",
];
function toForm(p: Product): Form {
  return Object.fromEntries(
    [...priceFields, "categorieId", "sousCategorieId"].map((key) => [
      key,
      key === "finPromo"
        ? (p.finPromo || "").slice(0, 10)
        : String(p[key as keyof Product] ?? ""),
    ]),
  );
}
function revisionChanged(current: Product, base: Product, subject: Subject) {
  return (
    current.commercialRevision !== base.commercialRevision ||
    (subject === "PRIX"
      ? current.prixRevision !== base.prixRevision
      : subject === "CLASSEMENT"
        ? current.classementRevision !== base.classementRevision
        : false)
  );
}

export function RevisionEditor({
  detail: initial,
  categories,
  userId,
  canValidate,
  onBack,
  onDone,
  onSkip,
}: {
  detail: Detail;
  categories: Category[];
  userId: string;
  canValidate: boolean;
  onBack: () => void;
  onDone: () => Promise<void>;
  onSkip: () => void;
}) {
  useFlowShellFocus(true);
  const [saved] = useState(() => readDraft<Draft>(userId, initial.produit.id));
  const [latest, setLatest] = useState(initial);
  const [base, setBase] = useState(saved?.base || initial.produit);
  const [form, setForm] = useState<Form>(
    saved?.form || toForm(initial.produit),
  );
  const [subject, setSubject] = useState<Subject>(saved?.subject || "PRIX");
  const [commentaire, setCommentaire] = useState(saved?.commentaire || "");
  const [proposalId, setProposalId] = useState(saved?.proposalId);
  const pending = useRef(saved?.pending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    saved?.pending
      ? "Un envoi précédent reste à confirmer. Réessayez pour retrouver son résultat."
      : "",
  );
  const [online, setOnline] = useState(navigator.onLine);
  const [dirty, setDirty] = useState(!!saved);
  const [persistent, setPersistent] = useState(true);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [footerOffset, setFooterOffset] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const lastFocused = useRef<Element | null>(null);
  const skipPersist = useRef(false);
  const p = latest.produit;
  const conflict = revisionChanged(p, base, subject);
  const canRetry = !!pending.current && !!error;
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [error]);
  const selectedProposal = latest.propositions.find(
    (item) => item.id === proposalId,
  );

  useEffect(() => {
    lastFocused.current = document.activeElement;
    titleRef.current?.focus();
    return () => {
      if (lastFocused.current instanceof HTMLElement)
        lastFocused.current.focus();
    };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    const adjust = () =>
      setFooterOffset(
        viewport
          ? Math.max(
              0,
              window.innerHeight - viewport.height - viewport.offsetTop,
            )
          : 0,
      );
    viewport?.addEventListener("resize", adjust);
    viewport?.addEventListener("scroll", adjust);
    adjust();
    return () => {
      viewport?.removeEventListener("resize", adjust);
      viewport?.removeEventListener("scroll", adjust);
    };
  }, []);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let delay = 10000;
    const refresh = async () => {
      clearTimeout(timer);
      if (!document.hidden && navigator.onLine) {
        try {
          const next = await revisionApi.detail(p.id);
          if (!stopped) setLatest(next);
          delay = 10000;
        } catch {
          delay = Math.min(delay * 2, 60000);
        }
      }
      if (!stopped) timer = setTimeout(refresh, delay);
    };
    const resume = () => {
      setOnline(navigator.onLine);
      void refresh();
    };
    timer = setTimeout(refresh, delay);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [p.id]);
  useEffect(() => {
    if (dirty && !skipPersist.current)
      setPersistent(
        saveDraft(userId, p.id, {
          form,
          base,
          subject,
          commentaire,
          proposalId,
          pending: pending.current,
        }),
      );
  }, [dirty, form, base, subject, commentaire, proposalId, p.id, userId]);

  const change = (key: string, value: string) => {
    pending.current = undefined;
    setDirty(true);
    setError("");
    setForm((old) => ({
      ...old,
      [key]: value,
      ...(key === "categorieId" ? { sousCategorieId: "" } : {}),
    }));
  };
  const chooseProposal = (proposal: Proposal) => {
    setSubject(proposal.sujet);
    setProposalId(proposal.id);
    setBase(proposal.observe);
    setForm(
      toForm({ ...proposal.observe, ...proposal.changements } as Product),
    );
    setCommentaire(proposal.commentaire || "");
    setDirty(true);
    pending.current = undefined;
    setError("");
  };
  const switchSubject = (next: Subject) => {
    setSubject(next);
    setProposalId(undefined);
    setDirty(true);
    pending.current = undefined;
    setArchiveConfirm(false);
  };
  const changes = () => {
    if (subject === "ARCHIVAGE") return {};
    const keys =
      subject === "PRIX" ? priceFields : ["categorieId", "sousCategorieId"];
    const original = toForm(base);
    return Object.fromEntries(
      keys
        .filter((key) => form[key] !== original[key])
        .map((key) => [
          key,
          form[key] === ""
            ? null
            : key.startsWith("prix") || key === "quantiteGros"
              ? Number(form[key].replace(/\s/g, "").replace(",", "."))
              : key === "finPromo"
                ? new Date(`${form[key]}T23:59:59`).toISOString()
                : form[key],
        ]),
    );
  };
  async function send(action: string, next = true) {
    if (busy || !navigator.onLine) {
      setError(
        "Connexion nécessaire. Votre saisie reste en brouillon sur cet appareil.",
      );
      return;
    }
    if (
      subject === "ARCHIVAGE" &&
      canValidate &&
      ["VALIDER", "ACCEPTER", "ARCHIVER"].includes(action) &&
      !archiveConfirm
    ) {
      setArchiveConfirm(true);
      return;
    }
    setError("");
    const data = action === "REFUSER" || action === "DISCUTER" ? {} : changes();
    if (
      Object.values(data).some(
        (value) => typeof value === "number" && !Number.isFinite(value),
      )
    ) {
      setError("Vérifiez les montants saisis.");
      return;
    }
    const effectiveAction =
      subject === "ARCHIVAGE" && action === "VALIDER" ? "ARCHIVER" : action;
    const content = {
      action: effectiveAction,
      sujet: subject,
      ...expected(base),
      propositionId: ["ACCEPTER", "REFUSER"].includes(action)
        ? proposalId
        : undefined,
      commentaire: commentaire.trim() || undefined,
      changements: data,
      type: Object.keys(data).length ? "CORRECTION" : "CONFIRMATION",
    };
    const signature = JSON.stringify(content);
    if (pending.current?.signature !== signature)
      pending.current = {
        signature,
        payload: { ...content, operationId: createClientId() },
      };
    setPersistent(
      saveDraft(userId, p.id, {
        form,
        base,
        subject,
        commentaire,
        proposalId,
        pending: pending.current,
      }),
    );
    setBusy(true);
    try {
      await revisionApi.action(p.id, pending.current.payload);
      skipPersist.current = true;
      removeDraft(userId, p.id);
      pending.current = undefined;
      if (next) await onDone();
      else {
        setLatest(await revisionApi.detail(p.id));
        setProposalId(undefined);
        setDirty(false);
      }
    } catch (err: any) {
      if (err.response?.status && err.response.status < 500)
        pending.current = undefined;
      setPersistent(
        saveDraft(userId, p.id, {
          form,
          base,
          subject,
          commentaire,
          proposalId,
          pending: pending.current,
        }),
      );
      setError(
        getApiErrorMessage(
          err,
          "Envoi impossible. Votre brouillon est conservé ; réessayez.",
        ),
      );
      try {
        setLatest(await revisionApi.detail(p.id));
      } catch {
        /* keep current form */
      }
    } finally {
      setBusy(false);
    }
  }
  const fieldDisplay = (key: string, value: unknown) =>
    key.startsWith("prix")
      ? money(value)
      : key === "categorieId"
        ? categories.find((c) => c.id === value)?.nom || "Non renseignée"
        : key === "sousCategorieId"
          ? categories
              .flatMap((c) => c.sousCategories)
              .find((c) => c.id === value)?.nom || "Non renseignée"
          : value
            ? String(value).slice(0, key === "finPromo" ? 10 : 100)
            : "Non renseigné";
  const subcategories =
    categories.find((c) => c.id === form.categorieId)?.sousCategories || [];
  const principal = canValidate
    ? selectedProposal?.statut === "EN_ATTENTE" &&
      selectedProposal.type !== "DISCUSSION"
      ? "Accepter et suivant"
      : "Valider et suivant"
    : "Envoyer et suivant";

  return (
    <section
      className="catalogue-editor"
      aria-label="Vérification d’un article"
    >
      <header className="revision-editor-head">
        <button
          className="revision-button secondary"
          onClick={onBack}
          disabled={busy}
        >
          <ArrowLeft size={18} /> Liste
        </button>
        <span className="text-xs text-slate-500">
          {canValidate ? "Validation administrateur" : "Proposition à l’équipe"}
        </span>
      </header>
      <div className="revision-product-heading">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" width="88" height="88" />
        ) : (
          <Package size={48} aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">
            {p.code || "Sans code"} · Stock : {p.quantiteStock}
          </p>
          <h1
            ref={titleRef}
            tabIndex={-1}
            className="text-xl font-bold text-slate-900 break-words"
          >
            {p.nomProduit}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {p.categorie?.nom}
            {p.sousCategorie ? ` / ${p.sousCategorie.nom}` : ""}
          </p>
        </div>
      </div>
      <div className="revision-subjects" role="group" aria-label="Sujet de vérification">
        {(["PRIX", "CLASSEMENT", "ARCHIVAGE"] as Subject[]).map((s) => (
          <button
            key={s}
            aria-pressed={subject === s}
            onClick={() => switchSubject(s)}
            disabled={busy}
          >
            {s === "PRIX"
              ? "Prix"
              : s === "CLASSEMENT"
                ? "Classement"
                : "Article arrêté"}
          </button>
        ))}
      </div>
      {!online && (
        <p className="revision-notice">
          <WifiOff size={18} /> Hors ligne. Vous pouvez préparer votre
          correction.
        </p>
      )}
      {dirty && (
        <p className="text-xs text-slate-500" role="status">
          {persistent
            ? "Brouillon sur cet appareil · visible uniquement dans votre compte"
            : "Stockage indisponible : gardez cet écran ouvert, la saisie est conservée en mémoire."}
        </p>
      )}
      {conflict && (
        <div className="revision-notice" role="alert">
          <div>
            <strong>L’article a changé depuis votre lecture.</strong>
            <p>
              Vos valeurs sont conservées. Comparez-les aux prix actuels
              affichés sous chaque champ.
            </p>
            <button
              className="revision-button secondary mt-2"
              onClick={() => {
                setBase(p);
                setProposalId(undefined);
                pending.current = undefined;
                setDirty(true);
                setError("");
              }}
            >
              J’ai comparé, utiliser la version actuelle
            </button>
          </div>
        </div>
      )}
      {!p.estActif && (
        <p className="revision-notice">
          Cet article a été archivé par un autre membre de l’équipe.
        </p>
      )}
      {latest.propositions.filter((item) => item.statut === "EN_ATTENTE")
        .length > 0 && (
        <section className="revision-panel">
          <h2 className="font-bold">Propositions de l’équipe</h2>
          {latest.propositions
            .filter((item) => item.statut === "EN_ATTENTE")
            .map((item) => (
              <button
                type="button"
                key={item.id}
                className={`revision-proposal ${proposalId === item.id ? "selected" : ""}`}
                onClick={() => chooseProposal(item)}
              >
                <span className="font-semibold">
                  {item.auteurNom} ·{" "}
                  {item.sujet === "PRIX"
                    ? "Prix"
                    : item.sujet === "CLASSEMENT"
                      ? "Classement"
                      : "Article arrêté"}
                </span>
                <span className="text-xs text-slate-500">
                  {dateLabel(item.createdAt)} ·{" "}
                  {item.type === "CONFIRMATION"
                    ? "Prix / classement confirmés"
                    : item.type === "DISCUSSION"
                      ? "À discuter"
                      : "Correction proposée"}
                </span>
                {Object.entries(item.changements).map(([key, value]) => (
                  <span key={key} className="text-sm">
                    {fieldLabels[key]} :{" "}
                    {fieldDisplay(key, item.observe[key as keyof Product])} →{" "}
                    <strong>{fieldDisplay(key, value)}</strong>
                  </span>
                ))}
                {item.commentaire && (
                  <span className="text-sm">{item.commentaire}</span>
                )}
              </button>
            ))}
        </section>
      )}
      <section className="revision-panel space-y-4">
        {subject === "PRIX" ? (
          <>
            <h2 className="font-bold">Tarifs de vente · FCFA</h2>
            {priceFields.map((key) => (
              <label className="revision-field" key={key}>
                <span>
                  {fieldLabels[key]}
                  {key !== "prixDetail" ? " (facultatif)" : ""}
                </span>
                <input
                  aria-label={fieldLabels[key]}
                  value={form[key]}
                  type={key === "finPromo" ? "date" : "text"}
                  inputMode={key === "finPromo" ? undefined : "decimal"}
                  onChange={(e) => change(key, e.target.value)}
                  disabled={busy}
                />
                <small>
                  Actuel : {fieldDisplay(key, p[key as keyof Product])}
                </small>
              </label>
            ))}
            {p.prixVerifieAt && (
              <p className="text-xs text-emerald-700">
                Dernière validation : {p.prixVerifiePar} ·{" "}
                {dateLabel(p.prixVerifieAt)}
              </p>
            )}
          </>
        ) : subject === "CLASSEMENT" ? (
          <>
            <h2 className="font-bold">Ranger cet article</h2>
            <label className="revision-field">
              <span>Catégorie</span>
              <select
                value={form.categorieId}
                onChange={(e) => change("categorieId", e.target.value)}
              >
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
                value={form.sousCategorieId}
                onChange={(e) => change("sousCategorieId", e.target.value)}
              >
                <option value="">Sans sous-catégorie</option>
                {subcategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-slate-500">
              Actuel : {p.categorie?.nom} /{" "}
              {p.sousCategorie?.nom || "Sans sous-catégorie"}
            </p>
          </>
        ) : (
          <>
            <h2 className="font-bold">Cet article n’est plus vendu</h2>
            <p className="text-sm leading-6 text-slate-600">
              {canValidate
                ? "L’archivage le retire du site et des nouvelles ventes en boutique. Son stock comptable et son historique sont conservés."
                : "Signalez-le à un administrateur qui décidera de son archivage."}
            </p>
            {archiveConfirm && (
              <p className="revision-notice" role="alert">
                Confirmez avec le bouton ci-dessous pour archiver cet article.
              </p>
            )}
          </>
        )}
        <label className="revision-field">
          <span>
            Commentaire {subject === "ARCHIVAGE" ? "/ motif" : "(facultatif)"}
          </span>
          <textarea
            rows={3}
            maxLength={1000}
            value={commentaire}
            onChange={(e) => {
              setCommentaire(e.target.value);
              setDirty(true);
              pending.current = undefined;
            }}
            placeholder="Information utile à l’équipe…"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className="revision-button secondary"
            disabled={busy || !online || conflict}
            onClick={() => void send("DISCUTER")}
          >
            <MessageCircle size={17} /> À discuter
          </button>
          {canValidate && selectedProposal?.statut === "EN_ATTENTE" && (
            <button
              className="revision-button secondary"
              disabled={busy || !online}
              onClick={() => void send("REFUSER")}
            >
              Refuser la proposition
            </button>
          )}
        </div>
      </section>
      <details className="revision-panel">
        <summary className="cursor-pointer py-2 font-bold">
          Historique ({latest.historique.length})
        </summary>
        <div className="space-y-4 mt-3">
          {latest.historique.map((event) => (
            <article
              key={event.id}
              className="border-t border-slate-100 pt-3 text-sm"
            >
              <p className="font-semibold">
                {event.acteurNom} ·{" "}
                {event.action.replaceAll("_", " ").toLowerCase()}
              </p>
              <p className="text-xs text-slate-500">
                {dateLabel(event.createdAt)}
              </p>
              {priceFields
                .filter(
                  (key) =>
                    event.avant[key as keyof Product] !==
                    event.apres[key as keyof Product],
                )
                .map((key) => (
                  <p key={key}>
                    {fieldLabels[key]} :{" "}
                    {fieldDisplay(key, event.avant[key as keyof Product])} →{" "}
                    {fieldDisplay(key, event.apres[key as keyof Product])}
                  </p>
                ))}
              {event.apres.commentaire && <p>{event.apres.commentaire}</p>}
            </article>
          ))}
        </div>
      </details>
      {error && (
        <p ref={errorRef} className="revision-error" role="alert">
          {error}
        </p>
      )}
      <footer
        className="revision-editor-footer"
        style={{ bottom: footerOffset }}
      >
        <div>
          <button
            className="revision-button secondary"
            onClick={onSkip}
            disabled={busy}
          >
            Passer
          </button>
          <button
            className="revision-button primary flex-1"
            disabled={
              busy ||
              !online ||
              (conflict && !canRetry) ||
              (!p.estActif && !canRetry)
            }
            onClick={() =>
              void send(
                canValidate
                  ? selectedProposal?.statut === "EN_ATTENTE" &&
                    selectedProposal.type !== "DISCUSSION"
                    ? "ACCEPTER"
                    : "VALIDER"
                  : "PROPOSER",
              )
            }
          >
            <Check size={18} />
            {busy
              ? "Enregistrement…"
              : canRetry
                ? "Confirmer l’envoi précédent"
                : archiveConfirm
                  ? "Confirmer l’archivage"
                  : principal}
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </section>
  );
}
