import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { Modal } from "./Elements";
import { newGuestKey } from "./guestAccess";
import {
  clearIssueAttempt,
  issueContent,
  issuePurchases,
  issueReceipt,
  readIssueAttempt,
  reasons,
  saveIssueAttempt,
  states,
} from "./incompatibilityData";
import "./reviews.css";
import "./incompatibilities.css";

export default function PurchaseIncompatibilities({
  orderId,
  userId,
  token,
  accessToken,
}) {
  const { lang } = useI18n(),
    tr = (fr, en) => (lang === "en" ? en : fr);
  const mode = accessToken ? "guest" : "account",
    scope = `${mode}:${userId || "private"}:${orderId}`;
  const [saved, setSaved] = useState(() => {
    try {
      return { attempt: readIssueAttempt(scope), invalid: false };
    } catch {
      return { attempt: null, invalid: true };
    }
  });
  const attempt = saved.attempt;
  const [resource, setResource] = useState({
      loading: true,
      data: null,
      error: false,
    }),
    [refresh, setRefresh] = useState(0);
  const [line, setLine] = useState(null),
    [open, setOpen] = useState(false),
    [form, setForm] = useState({
      quantite: 1,
      motif: "BROCHAGE",
      description: "",
    });
  const [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setResource({ loading: true, data: null, error: false });
    const options = {
      signal: controller.signal,
      timeout: 20000,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
    const request = accessToken
      ? apiClient.post(
          "/incompatibilites/guest/purchases",
          { accessToken },
          options,
        )
      : apiClient.get(`/incompatibilites/commandes/${orderId}`, options);
    request
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setResource({
            loading: false,
            data: issuePurchases(data, orderId, !!accessToken),
            error: false,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResource({ loading: false, data: null, error: true });
      });
    return () => controller.abort();
  }, [orderId, token, accessToken, refresh]);
  function remember(value) {
    let stored;
    try {
      stored = saveIssueAttempt(value);
    } catch {
      throw Object.assign(Error(), {
        safeMessage: tr(
          "La tentative ne peut pas être conservée dans cet onglet. Vérifiez le stockage avant de poursuivre.",
          "This attempt cannot be saved in this tab. Check browser storage before continuing.",
        ),
      });
    }
    if (active.current) setSaved({ attempt: stored, invalid: false });
    return stored;
  }
  function finish(value) {
    if (!issueReceipt(value)) throw Error("Unconfirmed issue");
    if (!active.current) return;
    try {
      clearIssueAttempt(scope);
    } catch {
      /* Same receipt remains replayable. */
    }
    setSaved({ attempt: null, invalid: false });
    setOpen(false);
    setCode("");
    setLine(null);
    setNotice(
      tr(
        "Votre signalement est enregistré. La boutique examinera le problème.",
        "Your report is recorded. The shop will review the issue.",
      ),
    );
    setRefresh((n) => n + 1);
  }
  async function perform(task) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      if (active.current)
        setError(
          e.safeMessage ||
            (e.response?.data?.code === "GUEST_RETURN_CODE_REQUIRED"
              ? tr(
                  "Saisissez le code email à 8 chiffres, ou vérifiez le résultat si vous avez déjà envoyé cette tentative.",
                  "Enter the 8-digit email code, or check the result if this attempt was already sent.",
                )
              : e.response?.data?.code === "GUEST_RETURN_INVALID"
                ? tr(
                    "Le code ou l’accès est invalide ou expiré. Vérifiez le suivi et redemandez un code si votre accès est encore valide.",
                    "The code or access is invalid or expired. Check tracking and request a code again if access is still valid.",
                  )
                : e.response?.status === 409
                  ? tr(
                      "L’article ou le dossier a changé. Actualisez le suivi avant de poursuivre.",
                      "The item or case has changed. Refresh tracking before continuing.",
                    )
                  : "") ||
            tr(
              "Résultat non confirmé. Gardez cette tentative et vérifiez le suivi avant de réessayer.",
              "Result not confirmed. Keep this attempt and check the case before retrying.",
            ),
        );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function send(value, suppliedCode) {
    const { data } = await apiClient.post(
      value.mode === "guest" ? "/incompatibilites/guest" : "/incompatibilites",
      value.mode === "guest"
        ? {
            ...value.body,
            accessToken: value.accessToken,
            actionKey: value.actionKey,
            challengeId: value.challengeId,
            ...(suppliedCode ? { code: suppliedCode } : {}),
          }
        : value.body,
      {
        timeout: 20000,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    return data;
  }
  async function requestCode(value) {
    const { data } = await apiClient.post(
      "/incompatibilites/guest/request",
      { ...value.body, accessToken: value.accessToken },
      { timeout: 20000 },
    );
    if (data.available === false)
      throw Object.assign(Error(), {
        safeMessage: tr(
          "L’envoi du code est indisponible. Contactez la boutique.",
          "Code delivery is unavailable. Contact the shop.",
        ),
      });
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        data.challengeId || "",
      )
    )
      throw Error("Invalid challenge");
    // Validated before another request; malformed proof never enables an action.
    remember({ ...value, challengeId: data.challengeId });
    setCode("");
    setNotice(
      tr(
        "Utilisez le code envoyé à l’email de cette commande.",
        "Use the code sent to this order’s email.",
      ),
    );
  }
  async function submit(event) {
    event.preventDefault();
    await perform(async () => {
      let value = attempt;
      if (!value) {
        if (!line || Number(form.quantite) > line.quantite)
          throw Object.assign(Error(), {
            safeMessage: tr(
              "Vérifiez la quantité reçue.",
              "Check the purchased quantity.",
            ),
          });
        let content;
        try {
          content = issueContent({ ...form, quantite: Number(form.quantite) });
        } catch {
          throw Object.assign(Error(), {
            safeMessage: tr(
              "Choisissez un motif et décrivez le problème en 10 à 2 000 caractères.",
              "Choose a reason and describe the issue in 10 to 2,000 characters.",
            ),
          });
        }
        // Persist before network: uncertain outcome keeps exactly the same request.
        value = remember({
          scope,
          mode,
          orderId,
          body: {
            requestId: crypto.randomUUID(),
            ligneCommandeId: line.id,
            ...content,
          },
          ...(accessToken
            ? { accessToken, actionKey: newGuestKey(), challengeId: "" }
            : {}),
        });
      }
      if (value.mode === "guest" && !value.challengeId) {
        await requestCode(value);
        return;
      }
      try {
        finish(await send(value, code.trim()));
      } catch (e) {
        if (value.mode !== "guest" || (e.response && e.response.status < 500))
          throw e;
        // Receipt-only replay cannot perform a new guest action without the code.
        try {
          finish(await send(value));
        } catch {
          throw e;
        }
      }
    });
  }
  const label = (values) => values[lang === "en" ? 1 : 0];
  const displayed = attempt?.body || form;
  return (
    <section
      className="e-purchase-reviews"
      aria-labelledby="purchase-issues-title"
    >
      <h2 id="purchase-issues-title">
        {tr(
          "Un article ne convient pas à votre montage ?",
          "An item does not fit your circuit?",
        )}
      </h2>
      <p>
        {tr(
          "Décrivez le problème à la boutique. Ce dossier reste privé ; un signalement ne vaut pas accord de retour ou de remboursement.",
          "Describe the issue to the shop. This case stays private; reporting an issue does not approve a return or refund.",
        )}
      </p>
      {resource.loading && (
        <p role="status">{tr("Chargement du suivi…", "Loading cases…")}</p>
      )}
      {resource.error && (
        <p role="alert">
          {tr(
            "Le suivi des incompatibilités est indisponible.",
            "Issue tracking is unavailable.",
          )}{" "}
          <button
            className="e-btn e-btn-outline"
            onClick={() => setRefresh((n) => n + 1)}
          >
            {tr("Actualiser", "Refresh")}
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {resource.data && (
        <>
          {!resource.data.eligible && (
            <p>
              {tr(
                "Le signalement sera disponible après réception de la commande.",
                "Reporting will be available after receiving the order.",
              )}
            </p>
          )}
          {accessToken &&
            resource.data.eligible &&
            !resource.data.codeAvailable && (
              <p>
                {tr(
                  "La vérification par email est indisponible. Contactez la boutique pour votre problème.",
                  "Email verification is unavailable. Contact the shop about your issue.",
                )}{" "}
                <Link to="/contact">
                  {tr("Contacter la boutique", "Contact the shop")}
                </Link>
              </p>
            )}
          {resource.data.lignes.map((item) => (
            <div className="e-review-purchase" key={item.id}>
              <div>
                <strong>{item.nomProduit}</strong>
                {item.incompatibilite && (
                  <>
                    <p>{label(states[item.incompatibilite.statut])}</p>
                    <p>
                      {item.incompatibilite.quantite}{" "}
                      {tr("pièce(s) concernée(s)", "affected item(s)")} ·{" "}
                      {label(reasons[item.incompatibilite.motif])}
                    </p>
                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.incompatibilite.description}
                    </p>
                    {item.incompatibilite.reponseBoutique && (
                      <>
                        <strong>
                          {tr("Réponse de la boutique", "Shop reply")}
                        </strong>
                        <p
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {item.incompatibilite.reponseBoutique}
                        </p>
                      </>
                    )}
                    {item.incompatibilite.statut === "RETOUR_CONFIRME" && (
                      <p>
                        {item.incompatibilite.retourQuantite}{" "}
                        {tr(
                          "pièce(s) retournée(s), confirmées le",
                          "returned item(s), confirmed on",
                        )}{" "}
                        {new Intl.DateTimeFormat(
                          lang === "en" ? "en-GB" : "fr-FR",
                          { timeZone: "Africa/Douala" },
                        ).format(
                          new Date(item.incompatibilite.retourConfirmeAt),
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>
              {!item.incompatibilite && resource.data.eligible && (
                <button
                  className="e-btn e-btn-outline"
                  disabled={
                    busy ||
                    !!attempt ||
                    saved.invalid ||
                    (!!accessToken && !resource.data.codeAvailable)
                  }
                  onClick={() => {
                    setLine(item);
                    setForm({
                      quantite: 1,
                      motif: "BROCHAGE",
                      description: "",
                    });
                    setError("");
                    setCode("");
                    setOpen(true);
                  }}
                >
                  {tr("Signaler un problème", "Report an issue")}
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {saved.invalid && (
        <p role="alert">
          {tr(
            "La tentative conservée est illisible. Vérifiez les dossiers ci-dessus avant de l’effacer.",
            "The saved attempt cannot be read. Check the cases above before clearing it.",
          )}{" "}
          <button
            disabled={busy || !resource.data}
            className="e-btn e-btn-outline"
            onClick={() => {
              try {
                clearIssueAttempt(scope);
                setSaved({ attempt: null, invalid: false });
              } catch {
                setError(
                  tr(
                    "Le stockage de cet onglet est indisponible.",
                    "Tab storage is unavailable.",
                  ),
                );
              }
            }}
          >
            {tr("Effacer la tentative illisible", "Clear unreadable attempt")}
          </button>
        </p>
      )}
      {attempt && (
        <p className="e-review-pending">
          {tr(
            "Une tentative est conservée dans cet onglet.",
            "An attempt is saved in this tab.",
          )}{" "}
          <button
            className="e-btn e-btn-outline"
            disabled={busy}
            onClick={() => {
              setLine(
                resource.data?.lignes.find(
                  (item) => item.id === attempt.body.ligneCommandeId,
                ),
              );
              setCode("");
              setError("");
              setOpen(true);
            }}
          >
            {tr("Reprendre la tentative", "Resume attempt")}
          </button>
        </p>
      )}
      {attempt && resource.data && (
        <p>
          <button
            type="button"
            className="e-btn e-btn-outline"
            disabled={busy}
            onClick={() => {
              if (
                !window.confirm(
                  tr(
                    "Avez-vous vérifié le suivi ci-dessus ? Effacer la tentative ne supprime aucun dossier enregistré.",
                    "Have you checked tracking above? Clearing the attempt does not delete any recorded case.",
                  ),
                )
              )
                return;
              try {
                clearIssueAttempt(scope);
                setSaved({ attempt: null, invalid: false });
                setOpen(false);
                setCode("");
              } catch {
                setError(
                  tr(
                    "Le stockage de cet onglet est indisponible.",
                    "Tab storage is unavailable.",
                  ),
                );
              }
            }}
          >
            {tr(
              "Effacer la tentative après vérification",
              "Clear attempt after checking",
            )}
          </button>
        </p>
      )}
      {!open && error && <p role="alert">{error}</p>}
      <Modal
        open={open}
        onClose={() => {
          if (!busy) {
            setOpen(false);
            setCode("");
          }
        }}
        title={tr("Signaler une incompatibilité", "Report an incompatibility")}
      >
        <form
          className="e-form e-review-form e-incompatibility-form"
          onSubmit={submit}
        >
          <p>
            <strong>
              {line?.nomProduit ||
                tr("Article de votre commande", "Item from your order")}
            </strong>
          </p>
          <label className="e-field">
            {tr("Quantité concernée", "Affected quantity")}
            <input
              type="number"
              min="1"
              max={line?.quantite || 1000000}
              step="1"
              required
              disabled={busy || !!attempt}
              value={displayed.quantite}
              onChange={(e) => setForm({ ...form, quantite: e.target.value })}
            />
          </label>
          <label className="e-field">
            {tr("Problème rencontré", "Issue encountered")}
            <select
              value={displayed.motif}
              disabled={busy || !!attempt}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
            >
              {Object.entries(reasons).map(([id, names]) => (
                <option key={id} value={id}>
                  {label(names)}
                </option>
              ))}
            </select>
          </label>
          <label className="e-field">
            {tr("Votre montage et le problème", "Your circuit and the issue")}
            <textarea
              required
              minLength="10"
              maxLength="2000"
              rows="5"
              disabled={busy || !!attempt}
              value={displayed.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <p>
            {tr(
              "Texte privé. Évitez mots de passe et coordonnées. La boutique vous répondra dans ce suivi.",
              "Private text. Avoid passwords and contact details. The shop will reply in this tracking page.",
            )}
          </p>
          {attempt?.challengeId && (
            <label className="e-field">
              {tr("Code email à 8 chiffres", "8-digit email code")}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                maxLength="8"
                value={code}
                disabled={busy}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}
          {error && <p role="alert">{error}</p>}
          <button className="e-btn" disabled={busy || saved.invalid}>
            {busy
              ? tr("Vérification…", "Checking…")
              : attempt
                ? tr(
                    "Reprendre avec le même contenu",
                    "Retry with the same content",
                  )
                : accessToken
                  ? tr(
                      "Recevoir le code de vérification",
                      "Get verification code",
                    )
                  : tr("Enregistrer le signalement", "Record report")}
          </button>
          {attempt && (
            <button
              type="button"
              className="e-btn e-btn-outline"
              disabled={busy}
              onClick={() => perform(async () => finish(await send(attempt)))}
            >
              {tr(
                "Vérifier le résultat de cette tentative",
                "Check this attempt’s result",
              )}
            </button>
          )}
          {attempt?.challengeId && (
            <button
              type="button"
              className="e-btn e-btn-outline"
              disabled={busy}
              onClick={() => perform(() => requestCode(attempt))}
            >
              {tr("Redemander un code", "Request a code again")}
            </button>
          )}
        </form>
      </Modal>
    </section>
  );
}
