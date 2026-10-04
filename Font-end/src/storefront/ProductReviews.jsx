import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { useAuth } from "../context/AuthContext";
import apiClient from "../utils/apiClient";
import useResource from "./useResource";
import { orderDate, apiMessage } from "./orderData";
import { reviewList } from "./reviewData";
import "./reviews.css";

function PublishedReviewPhoto({ photo, tr }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="e-review-photo-unavailable">
      <p>
        {tr(
          "La photo est momentanément indisponible.",
          "The photo is temporarily unavailable.",
        )}
      </p>
      <button className="e-text-button" onClick={() => setFailed(false)}>
        {tr("Recharger la photo", "Reload photo")}
      </button>
    </div>
  ) : (
    <img
      className="e-review-photo-public"
      src={
        new URL(
          photo.url,
          new URL(apiClient.defaults.baseURL, window.location.origin),
        ).href
      }
      alt={tr(
        "Photo publiée avec cet avis",
        "Photo published with this review",
      )}
      width={photo.width}
      height={photo.height}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

export default function ProductReviews({ productId }) {
  const { lang } = useI18n(),
    { token } = useAuth();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [page, setPage] = useState(1),
    [report, setReport] = useState(null),
    [motif, setMotif] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const resource = useResource(
    `/avis/produits/${encodeURIComponent(productId)}?page=${page}&limit=10`,
  );
  const validated = useMemo(() => {
    try {
      return resource.data ? { data: reviewList(resource.data, page) } : {};
    } catch {
      return { error: true };
    }
  }, [resource.data, page]);
  const data = validated.data;
  async function sendReport(event) {
    event.preventDefault();
    if (lock.current || !report || !motif) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const { data: result } = await apiClient.post(
        `/avis/${report}/signalement`,
        { motif },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 },
      );
      if (result?.enregistre !== true) throw Error("Unconfirmed report");
      setReport(null);
      setMotif("");
      setNotice(
        tr(
          "Signalement enregistré. La boutique vérifiera le contenu.",
          "Report recorded. The shop will review the content.",
        ),
      );
    } catch (e) {
      setNotice(
        apiMessage(
          e,
          tr(
            "Le signalement n’a pas pu être confirmé. Réessayez.",
            "The report could not be confirmed. Try again.",
          ),
        ),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className="e-reviews e-section"
      aria-labelledby="product-reviews-title"
    >
      <div className="e-reviews-heading">
        <h2 id="product-reviews-title">
          {tr("Avis sur cet article", "Reviews of this item")}
        </h2>
        {data?.total > 0 && (
          <p>
            <strong>
              {data.moyenne.toLocaleString(lang === "en" ? "en-GB" : "fr-FR", {
                maximumFractionDigits: 1,
              })}
              /5
            </strong>{" "}
            · {data.total} {tr("avis publié(s)", "published review(s)")}
          </p>
        )}
      </div>
      <p>
        {tr(
          "Des retours liés à des articles reçus. Les avis positifs et négatifs conformes sont publiés après modération.",
          "Feedback linked to received purchases. Positive and negative reviews that follow the content rules are published after moderation.",
        )}
      </p>
      {resource.loading ? (
        <p role="status">{tr("Chargement des avis…", "Loading reviews…")}</p>
      ) : resource.error || validated.error ? (
        <div role="alert">
          <p>
            {tr(
              "Les avis sont momentanément indisponibles.",
              "Reviews are temporarily unavailable.",
            )}
          </p>
          <button className="e-btn e-secondary" onClick={resource.retry}>
            {tr("Réessayer", "Try again")}
          </button>
        </div>
      ) : data?.total === 0 ? (
        <p className="e-reviews-empty">
          {tr(
            "Aucun avis publié pour le moment. Vous pourrez partager votre expérience depuis le suivi de votre commande reçue.",
            "No published reviews yet. You can share your experience from the tracking page of your received order.",
          )}
        </p>
      ) : (
        data?.items.map((item) => (
          <article className="e-customer-review" key={item.id}>
            <header>
              <strong>{item.pseudonyme}</strong>
              <span className="e-review-verified">
                {tr("Achat vérifié", "Verified purchase")}
              </span>
              <span>{item.note}/5</span>
              <time dateTime={item.createdAt}>
                {orderDate(item.createdAt, lang)}
              </time>
            </header>
            <p>{item.texte}</p>
            {item.photo && (
              <PublishedReviewPhoto key={item.id} photo={item.photo} tr={tr} />
            )}
            {item.projetRealise && (
              <p className="e-review-project">
                {tr("Projet réalisé", "Completed project")} :{" "}
                {item.projetRealise}
              </p>
            )}
            {item.reponseBoutique && (
              <div className="e-shop-reply">
                <strong>{tr("Réponse de la boutique", "Shop reply")}</strong>
                <p>{item.reponseBoutique}</p>
              </div>
            )}
            {report === item.id ? (
              token ? (
                <form onSubmit={sendReport} className="e-review-report">
                  <label className="e-field">
                    {tr("Motif du signalement", "Reason for reporting")}
                    <select
                      required
                      value={motif}
                      onChange={(event) => setMotif(event.target.value)}
                      disabled={busy}
                    >
                      <option value="">
                        {tr("Choisir un motif", "Choose a reason")}
                      </option>
                      <option value="DONNEES_PERSONNELLES">
                        {tr("Données personnelles", "Personal information")}
                      </option>
                      <option value="INJURES_MENACES">
                        {tr("Injures ou menaces", "Abuse or threats")}
                      </option>
                      <option value="SPAM">Spam</option>
                      <option value="HORS_SUJET">
                        {tr("Hors sujet", "Unrelated content")}
                      </option>
                    </select>
                  </label>
                  <button className="e-btn" disabled={busy || !motif}>
                    {tr("Signaler ce contenu", "Report this content")}
                  </button>
                  <button
                    type="button"
                    className="e-text-button"
                    disabled={busy}
                    onClick={() => setReport(null)}
                  >
                    {tr("Fermer", "Close")}
                  </button>
                </form>
              ) : (
                <p>
                  <Link
                    to={`/login?returnTo=${encodeURIComponent("/product/" + productId)}`}
                  >
                    {tr(
                      "Connectez-vous pour signaler ce contenu",
                      "Sign in to report this content",
                    )}
                  </Link>
                </p>
              )
            ) : (
              <button
                className="e-text-button"
                onClick={() => {
                  setReport(item.id);
                  setMotif("");
                  setNotice("");
                }}
              >
                {tr("Signaler un contenu", "Report content")}
              </button>
            )}
          </article>
        ))
      )}
      {notice && <p role="status">{notice}</p>}
      {data && data.total > 10 && (
        <nav
          className="e-actions"
          aria-label={tr("Pages d’avis", "Review pages")}
        >
          <button
            className="e-btn e-secondary"
            disabled={page <= 1 || resource.loading}
            onClick={() => {
              setPage(page - 1);
              setReport(null);
            }}
          >
            {tr("Précédents", "Previous")}
          </button>
          <span>
            {page}/{Math.ceil(data.total / 10)}
          </span>
          <button
            className="e-btn e-secondary"
            disabled={page * 10 >= data.total || resource.loading}
            onClick={() => {
              setPage(page + 1);
              setReport(null);
            }}
          >
            {tr("Suivants", "Next")}
          </button>
        </nav>
      )}
    </section>
  );
}
