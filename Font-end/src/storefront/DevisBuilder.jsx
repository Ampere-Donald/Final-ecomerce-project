import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { apiMessage } from "./orderData";
import {
  parseReferenceList,
  resolvedReferenceList,
  requestViewValid,
  readSession,
  readDevisAttempt,
  writeSession,
} from "./devisData";

const draftKey = "newoteg-devis-draft-v1";
const pendingKey = (ownerId) => `newoteg-devis-attempt-v1:${ownerId}`;

export default function DevisBuilder({ existing, onSaved }) {
  const { user, token, isAuthenticated, loading } = useAuth();
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const navigate = useNavigate();
  const ownerId = user?.id || null;
  const [initial] = useState(() =>
    !existing ? readSession(draftKey, ownerId) || readSession(draftKey) : null,
  );
  const [text, setText] = useState(
    existing
      ? existing.lignes.map((l) => `${l.reference}; ${l.quantite}`).join("\n")
      : initial?.text || "",
  );
  const [contact, setContact] = useState({
    telephone:
      existing?.telephone || initial?.telephone || user?.telephone || "",
    modeReception:
      existing?.modeReception || initial?.modeReception || "RETRAIT_MAGASIN",
    destination: existing?.destination || initial?.destination || "",
    notes: existing?.notes || initial?.notes || "",
  });
  const [rows, setRows] = useState(null);
  const [recovery] = useState(() =>
    ownerId
      ? readDevisAttempt(pendingKey(ownerId), ownerId)
      : { attempt: null, blocked: false },
  );
  const [pending, setPending] = useState(recovery.attempt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const outputRef = useRef(null);
  const matchLabel = (match) =>
    match === "unknown"
      ? tr("À préciser avec la boutique", "Clarify with the shop")
      : match === "exact"
        ? tr("Correspondance trouvée, à vérifier", "Match found, please check")
        : tr("Plusieurs références possibles", "Possible matches");
  useEffect(() => {
    if (!existing && !loading)
      writeSession(draftKey, { ownerId, text, ...contact });
  }, [text, contact, ownerId, loading, existing]);

  async function checkReferences(event) {
    event.preventDefault();
    if (lock.current || pending || recovery.blocked) return;
    let input;
    try {
      input = parseReferenceList(text);
    } catch (e) {
      setError(
        e.message.startsWith("line:")
          ? tr(
              `Vérifiez la référence et la quantité à la ligne ${e.message.split(":")[1]}.`,
              `Check the reference and quantity on line ${e.message.split(":")[1]}.`,
            )
          : tr(
              "Indiquez entre 1 et 50 références, une par ligne.",
              "Enter between 1 and 50 references, one per line.",
            ),
      );
      setRows(null);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await apiClient.post(
        "/devis/resolve",
        { lignes: input },
        { timeout: 20000 },
      );
      setRows(resolvedReferenceList(data, input));
      requestAnimationFrame(() => outputRef.current?.focus());
    } catch (e) {
      setRows(null);
      setError(
        apiMessage(
          e,
          tr(
            "La recherche est indisponible. Votre liste est conservée, réessayez.",
            "Search is unavailable. Your list is saved; try again.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function sendAttempt(attempt) {
    if (lock.current || !isAuthenticated || attempt.ownerId !== ownerId) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      };
      const { data } = attempt.id
        ? await apiClient.patch(
            `/devis/mine/${attempt.id}/precision`,
            attempt.payload,
            config,
          )
        : await apiClient.post("/devis", attempt.payload, config);
      if (!requestViewValid(data)) throw new Error("Invalid request response");
      sessionStorage.removeItem(pendingKey(ownerId));
      if (!attempt.id) sessionStorage.removeItem(draftKey);
      setPending(null);
      if (onSaved && attempt.id === existing?.id) onSaved();
      else navigate(`/mes-devis/${data.id}`, { replace: true });
    } catch (e) {
      // Validation/owner conflicts are confirmed failures. Connection loss stays retryable with the same identity.
      if ([400, 404, 409, 422].includes(e.response?.status)) {
        sessionStorage.removeItem(pendingKey(ownerId));
        setPending(null);
      }
      setError(
        apiMessage(
          e,
          tr(
            "Le résultat de l’envoi est incertain. Reprenez la même tentative pour éviter une seconde demande.",
            "The result of sending is uncertain. Resume the same attempt to avoid a second request.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (pending || busy || recovery.blocked || !rows || !isAuthenticated)
      return;
    const attempt = {
      ownerId,
      id: existing?.id || null,
      payload: {
        requestId: crypto.randomUUID(),
        telephone: contact.telephone.trim(),
        modeReception: contact.modeReception,
        ...(contact.modeReception === "LIVRAISON"
          ? { destination: contact.destination.trim() }
          : {}),
        notes: contact.notes.trim(),
        ...(existing ? { version: existing.version } : {}),
        lignes: rows.map((line) => ({
          reference: line.reference,
          quantite: line.quantite,
          ...(line.produitId ? { produitId: line.produitId } : {}),
        })),
      },
    };
    if (!writeSession(pendingKey(ownerId), attempt)) {
      setError(
        tr(
          "Ce navigateur ne peut pas conserver la tentative. Autorisez le stockage pour envoyer votre demande.",
          "This browser cannot save the attempt. Enable storage to send your request.",
        ),
      );
      return;
    }
    setPending(attempt);
    void sendAttempt(attempt);
  }

  const frozen = Boolean(busy || pending || recovery.blocked);
  return (
    <div className="e-devis-workspace">
      <section>
        {recovery.blocked && (
          <section className="e-devis-resume" role="alert">
            <h2>
              {tr(
                "Votre tentative ne peut pas être relue",
                "Your attempt cannot be read",
              )}
            </h2>
            <p>
              {tr(
                "Consultez vos demandes ou contactez la boutique pour vérifier si cet envoi a été reçu avant de créer une autre demande.",
                "Check your requests or contact the shop to confirm whether it was received before creating another request.",
              )}
            </p>
            <Link to="/mes-devis">
              {tr("Consulter mes demandes", "View my requests")}
            </Link>
            <Link to="/contact">
              {tr("Contacter la boutique", "Contact the shop")}
            </Link>
          </section>
        )}
        {error && (
          <p className="e-form-error" role="alert">
            {error}
          </p>
        )}
        {pending && (
          <section
            className="e-devis-resume"
            aria-label={tr("Reprendre la demande", "Resume request")}
          >
            <h2>
              {tr(
                "Votre envoi reste à vérifier",
                "Your request still needs checking",
              )}
            </h2>
            <p>
              {tr(
                "Votre liste et votre tentative sont conservées. Reprendre l’envoi retrouve la même demande si elle a déjà été enregistrée.",
                "Your list and attempt are saved. Resuming returns the same request if it has already been recorded.",
              )}
            </p>
            <ul>
              {pending.payload.lignes.map((line, index) => (
                <li key={index}>
                  {line.reference} — {line.quantite}
                </li>
              ))}
            </ul>
            <button
              className="e-btn"
              disabled={busy || !isAuthenticated}
              onClick={() => sendAttempt(pending)}
            >
              {busy
                ? tr("Vérification…", "Checking…")
                : tr("Reprendre le même envoi", "Resume the same request")}
            </button>
            <Link to="/mes-devis">
              {tr("Consulter mes demandes", "View my requests")}
            </Link>
            <Link to="/login?returnTo=/devis">
              {tr("Se reconnecter pour reprendre", "Sign in again to resume")}
            </Link>
          </section>
        )}
        <form onSubmit={checkReferences}>
          <label className="e-field" htmlFor="devis-list">
            <strong>
              {tr(
                "Vos références et quantités",
                "Your references and quantities",
              )}
            </strong>
            <textarea
              id="devis-list"
              rows={7}
              maxLength={7500}
              required
              disabled={frozen}
              value={text}
              aria-describedby="devis-list-help"
              placeholder={"LM358N; 10\nCâble HDMI 5 m; 2"}
              onChange={(e) => {
                setText(e.target.value);
                setRows(null);
                setError("");
              }}
            />
          </label>
          <p id="devis-list-help" className="e-devis-help">
            {tr(
              "Une référence par ligne. Séparez la quantité avec un point-virgule ou collez deux colonnes de votre tableau. Sans quantité, nous retenons 1 pièce. Maximum : 50 lignes.",
              "One reference per line. Separate the quantity with a semicolon or paste two spreadsheet columns. Without a quantity, we use 1 item. Maximum: 50 lines.",
            )}
          </p>
          <button className="e-btn e-secondary" disabled={frozen}>
            {busy && !pending
              ? tr("Recherche…", "Searching…")
              : tr("Vérifier les références", "Check references")}
          </button>
        </form>
        {rows && (
          <section
            className="e-devis-results"
            aria-label={tr("Références à vérifier", "References to check")}
          >
            <h2 ref={outputRef} tabIndex={-1}>
              {tr(
                "Choisissez les articles de votre liste",
                "Choose the products for your list",
              )}
            </h2>
            <p>
              {tr(
                "Vérifiez la référence complète et son suffixe. Vous pouvez laisser une ligne à préciser si aucun article ne correspond.",
                "Check the full reference and its suffix. Leave a line for clarification if no product matches.",
              )}
            </p>
            {rows.map((line, index) => (
              <div className="e-devis-reference-row" key={index}>
                <div>
                  <strong>{line.reference}</strong>
                  <span>
                    {line.quantite} {tr("pièce(s)", "item(s)")}
                  </span>
                  <small className={line.produitId ? "e-devis-chosen" : ""}>
                    {line.produitId
                      ? tr("Article choisi", "Product chosen")
                      : matchLabel(line.match)}
                  </small>
                </div>
                {line.candidates.length > 0 && (
                  <label className="e-field">
                    <span className="e-sr">
                      {tr("Article pour", "Product for")} {line.reference}
                    </span>
                    <select
                      disabled={frozen}
                      value={line.produitId}
                      onChange={(e) =>
                        setRows(
                          rows.map((row, i) =>
                            i === index
                              ? { ...row, produitId: e.target.value }
                              : row,
                          ),
                        )
                      }
                    >
                      <option value="">
                        {tr(
                          "À préciser avec la boutique",
                          "Clarify with the shop",
                        )}
                      </option>
                      {line.candidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nomProduit}
                          {p.code ? ` (${p.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ))}
          </section>
        )}
        <form onSubmit={submit} className="e-devis-contact">
          <fieldset disabled={frozen}>
            <legend>
              {tr(
                "Comment recevoir votre sélection ?",
                "How would you like to receive your items?",
              )}
            </legend>
            <label className="e-check">
              <input
                type="radio"
                name="devis-reception"
                checked={contact.modeReception === "RETRAIT_MAGASIN"}
                onChange={() =>
                  setContact({ ...contact, modeReception: "RETRAIT_MAGASIN" })
                }
              />
              {tr("Retrait à Akwa", "Pickup at Akwa")}
            </label>
            <label className="e-check">
              <input
                type="radio"
                name="devis-reception"
                checked={contact.modeReception === "LIVRAISON"}
                onChange={() =>
                  setContact({ ...contact, modeReception: "LIVRAISON" })
                }
              />
              {tr(
                "Livraison · frais et délai à confirmer",
                "Delivery · fee and timing to confirm",
              )}
            </label>
            {contact.modeReception === "LIVRAISON" && (
              <label className="e-field">
                {tr(
                  "Ville et destination de livraison",
                  "Town and delivery destination",
                )}
                <textarea
                  rows={2}
                  required
                  minLength={3}
                  maxLength={500}
                  value={contact.destination}
                  onChange={(e) =>
                    setContact({ ...contact, destination: e.target.value })
                  }
                />
              </label>
            )}
            <label className="e-field">
              {tr("Téléphone de contact", "Contact phone")}
              <input
                type="tel"
                required
                pattern={String.raw`[\+0-9 \(\)\-]{6,30}`}
                maxLength={30}
                value={contact.telephone}
                onChange={(e) =>
                  setContact({ ...contact, telephone: e.target.value })
                }
              />
            </label>
            <label className="e-field">
              {tr(
                "Votre projet ou vos précisions (facultatif)",
                "Your project or details (optional)",
              )}
              <textarea
                rows={3}
                maxLength={2000}
                value={contact.notes}
                onChange={(e) =>
                  setContact({ ...contact, notes: e.target.value })
                }
              />
            </label>
          </fieldset>
          {isAuthenticated ? (
            <button className="e-btn" disabled={frozen || !rows}>
              {existing
                ? tr("Envoyer mes précisions", "Send my details")
                : tr("Envoyer ma demande de devis", "Send my quote request")}
            </button>
          ) : (
            <div className="e-devis-login">
              <p>
                {tr(
                  "Connectez-vous pour envoyer la liste et recevoir la réponse dans votre compte. Votre brouillon reste dans cet onglet.",
                  "Sign in to send your list and receive the reply in your account. Your draft stays in this tab.",
                )}
              </p>
              <Link className="e-btn" to="/login?returnTo=/devis">
                {tr("Se connecter pour envoyer", "Sign in to send")}
              </Link>
            </div>
          )}
        </form>
      </section>
      <aside className="e-devis-aside">
        <h2>
          {existing
            ? tr("Précisez votre demande", "Clarify your request")
            : tr("Un devis pour votre sélection", "A quote for your selection")}
        </h2>
        <p>
          {tr(
            "Composants, outillage ou achats pour votre atelier : la boutique vérifie votre liste et prépare sa réponse.",
            "Components, tools or supplies for your workshop: the shop checks your list and prepares a reply.",
          )}
        </p>
        <dl>
          <div>
            <dt>{tr("Articles demandés", "Requested items")}</dt>
            <dd>{rows?.reduce((n, l) => n + l.quantite, 0) ?? "—"}</dd>
          </div>
          <div>
            <dt>{tr("Références à préciser", "References to clarify")}</dt>
            <dd>{rows?.filter((l) => !l.produitId).length ?? "—"}</dd>
          </div>
        </dl>
        <p className="e-devis-policy">
          {tr(
            "Une demande de devis ne réserve pas le stock et n’enregistre aucun paiement. Les prix de la proposition viennent de la boutique.",
            "A quote request does not reserve stock or record payment. Offer prices come from the shop.",
          )}
        </p>
        <Link to="/contact">{tr("Besoin d’un conseil ?", "Need advice?")}</Link>
      </aside>
    </div>
  );
}
