import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import PageMeta from "./PageMeta";
import { ArrowRight, FileText, RefreshCw, ShoppingCart } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { useCart } from "../context/CartContext";
import apiClient from "../utils/apiClient";
import { resolveImageUrl } from "../utils/mapProduct";
import { formatFCFA } from "../utils/formatFCFA";
import { Copy, Crumbs, Photo } from "./Elements";
import Footer from "./Footer";
import { ReceptionSummary } from "./ReceptionChoice";
import useResource from "./useResource";
import {
  initialChoices,
  materialRows,
  projectLink,
  projectSelection,
  readProject,
  readProjectPage,
  selectionChanged,
} from "./projectData";
import "./projects.css";

const levels = {
  DEBUTANT: ["Débutant", "Beginner"],
  INTERMEDIAIRE: ["Intermédiaire", "Intermediate"],
  AVANCE: ["Avancé", "Advanced"],
};
const titleOf = (p, lang) => (lang === "en" && p.titreEn ? p.titreEn : p.titre);
const summaryOf = (p, lang) =>
  lang === "en" && p.resumeEn ? p.resumeEn : p.resume;
const materialImage = (raw) => {
  const safe = projectLink(raw, true);
  return safe?.startsWith("/design-e/") || safe?.startsWith("/images/")
    ? safe
    : safe
      ? resolveImageUrl(safe)
      : "";
};
function ProjectVisual({ project }) {
  const image = materialImage(project.imageUrl);
  const [failed, setFailed] = useState("");
  return image && failed !== image ? (
    <img
      src={image}
      alt=""
      width="600"
      height="400"
      loading="lazy"
      onError={() => setFailed(image)}
    />
  ) : (
    <div className="e-project-visual-fallback">
      <FileText size={36} aria-hidden="true" />
      <Copy fr="Liste de matériel" en="Material list" />
    </div>
  );
}
function ProjectListItem({ project }) {
  const { lang } = useI18n();
  return (
    <article className="e-project-list-item">
      <Link
        className="e-project-list-visual"
        to={`/projets/${project.slug}`}
        aria-label={titleOf(project, lang)}
      >
        <ProjectVisual project={project} />
      </Link>
      <div>
        <span className="e-project-level">
          <Copy fr={levels[project.niveau][0]} en={levels[project.niveau][1]} />
        </span>
        <h2>
          <Link to={`/projets/${project.slug}`}>{titleOf(project, lang)}</Link>
        </h2>
        <p>{summaryOf(project, lang)}</p>
        <p className="e-project-availability">
          {project.lignes.length} <Copy fr="références" en="references" /> ·{" "}
          <Copy
            fr={
              project.materielRequisDisponible
                ? "Matériel requis disponible"
                : "Certaines pièces sont à vérifier"
            }
            en={
              project.materielRequisDisponible
                ? "Required material available"
                : "Some parts need checking"
            }
          />
        </p>
        <Link className="e-project-open" to={`/projets/${project.slug}`}>
          <Copy fr="Préparer le matériel" en="Prepare the material" />
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
function ProjectState({ loading, error, retry }) {
  if (loading)
    return (
      <p className="e-state" role="status">
        <Copy fr="Chargement des projets…" en="Loading projects…" />
      </p>
    );
  const missing = error?.response?.status === 404;
  return (
    <section className="e-state" role="alert">
      <h2>
        <Copy
          fr={
            missing
              ? "Ce projet n’est plus disponible"
              : "Impossible de lire les projets"
          }
          en={
            missing
              ? "This project is no longer available"
              : "Unable to read projects"
          }
        />
      </h2>
      <p>
        <Copy
          fr={
            missing
              ? "La boutique a pu retirer ou modifier cette liste. Consultez les autres projets ou demandez conseil."
              : "Vérifiez votre connexion puis réessayez. Rien n’a été ajouté au panier."
          }
          en={
            missing
              ? "The shop may have withdrawn or changed this list. Browse other projects or ask for advice."
              : "Check your connection and try again. Nothing has been added to the cart."
          }
        />
      </p>
      <button className="e-btn e-secondary" onClick={retry}>
        <Copy fr="Réessayer" en="Try again" />
      </button>{" "}
      <Link to="/projets">
        <Copy fr="Tous les projets" en="All projects" />
      </Link>
    </section>
  );
}
export function ProjectTeaser() {
  const resource = useResource("/projets?page=1&limit=2");
  let rows = [];
  try {
    if (resource.data) rows = readProjectPage(resource.data).rows;
  } catch {
    /* Keep access to the project library if its preview is unavailable. */
  }
  return (
    <section className="e-section e-project-teaser">
      <div className="e-section-head">
        <div>
          <h2>
            <Copy
              fr="Un projet, les pièces pour le réaliser"
              en="A project and the parts to build it"
            />
          </h2>
          <p>
            <Copy
              fr="Objectif, accessoires et quantités, réunis dans une liste préparée par la boutique."
              en="Purpose, accessories and quantities, together in a list prepared by the shop."
            />
          </p>
        </div>
        <Link to="/projets">
          <Copy fr="Voir les projets" en="View projects" />{" "}
          <ArrowRight size={17} />
        </Link>
      </div>
      {rows.length > 0 && (
        <div className="e-projects-list">
          {rows.map((p) => (
            <ProjectListItem key={p.id} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}
function ProjectLibrary() {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get("page") || 1),
    page =
      Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 10000
        ? rawPage
        : 1;
  const resource = useResource(`/projets?page=${page}&limit=12`);
  let result = null,
    parseError = null;
  try {
    if (resource.data) result = readProjectPage(resource.data);
  } catch (e) {
    parseError = e;
  }
  return (
    <>
      <PageMeta />
      <div className="e-wrap e-project-page">
        <Crumbs title={<Copy fr="Projets" en="Projects" />} />
        <div className="e-page-title">
          <h1>
            <Copy
              fr="Préparer votre prochain projet"
              en="Prepare your next project"
            />
          </h1>
          <p>
            <Copy
              fr="Choisissez un usage, relisez ses contraintes et composez votre liste de matériel. Chaque pièce reste à votre choix."
              en="Choose a purpose, review its constraints and assemble your material list. You choose each part."
            />
          </p>
        </div>
        {resource.loading || resource.error || parseError ? (
          <ProjectState {...resource} error={resource.error || parseError} />
        ) : result?.rows.length ? (
          <>
            <div className="e-projects-list">
              {result.rows.map((p) => (
                <ProjectListItem key={p.id} project={p} />
              ))}
            </div>
            <nav className="e-project-pages" aria-label="Pagination">
              <button
                className="e-btn e-secondary"
                disabled={page <= 1}
                onClick={() => setParams({ page: String(page - 1) })}
              >
                <Copy fr="Précédent" en="Previous" />
              </button>
              <span>
                {page} / {result.pages}
              </span>
              <button
                className="e-btn e-secondary"
                disabled={page >= result.pages}
                onClick={() => setParams({ page: String(page + 1) })}
              >
                <Copy fr="Suivant" en="Next" />
              </button>
            </nav>
          </>
        ) : (
          <section className="e-project-empty">
            <h2>
              <Copy
                fr="Les projets se préparent en boutique"
                en="Projects are being prepared by the shop"
              />
            </h2>
            <p>
              <Copy
                fr="Aucune liste publiée pour le moment. Décrivez votre projet à l’équipe ou préparez votre liste de références."
                en="No published lists yet. Describe your project to the team or prepare your list of references."
              />
            </p>
            <Link className="e-btn" to="/devis">
              <Copy
                fr="Préparer une demande de devis"
                en="Prepare a quote request"
              />
            </Link>{" "}
            <Link to="/contact">
              <Copy fr="Demander conseil" en="Ask for advice" />
            </Link>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
function ProjectDetail({ slug }) {
  const resource = useResource(`/projets/public/${encodeURIComponent(slug)}`);
  const { lang } = useI18n();
  let project = null,
    parseError = null;
  try {
    if (resource.data) project = readProject(resource.data, slug);
  } catch (e) {
    parseError = e;
  }
  return resource.loading || resource.error || parseError || !project ? (
    <>
      {resource.error?.response?.status === 404 && <PageMeta title={`${lang === "en" ? "Project not found" : "Projet introuvable"} — X-Electronic`} noindex />}
      <div className="e-wrap e-project-page">
        <Crumbs title={<Copy fr="Projet" en="Project" />} />
        <ProjectState {...resource} error={resource.error || parseError} />
      </div>
      <Footer />
    </>
  ) : (
    <MaterialSelection key={project.id} initial={project} />
  );
}
function MaterialSelection({ initial }) {
  const { lang } = useI18n();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const navigate = useNavigate();
  const { cartItems, addSelection, cartVerified } = useCart();
  const [project, setProject] = useState(initial);
  const [rows, setRows] = useState(() => materialRows(initial, materialImage));
  const [choices, setChoices] = useState(() => initialChoices(initial));
  const [partialAccepted, setPartialAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const lock = useRef(false),
    active = useRef(true),
    abort = useRef(null);
  const cartRef = useRef({ cartItems, addSelection });
  useEffect(() => {
    cartRef.current = { cartItems, addSelection };
  }, [cartItems, addSelection]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      abort.current?.abort();
    };
  }, []);
  const selected = projectSelection(rows, choices, cartItems);
  const reasons = {
    missing: tr("Référence indisponible", "Reference unavailable"),
    removed: tr(
      "Ligne retirée du projet. Décochez-la pour poursuivre.",
      "Line removed from the project. Uncheck it to continue.",
    ),
    approval: tr(
      "Vérification technique à renouveler par la boutique",
      "Technical review needs renewing by the shop",
    ),
    availability: tr("Disponibilité à confirmer", "Availability to confirm"),
    out: tr("Rupture de stock", "Out of stock"),
    price: tr("Prix à confirmer", "Price to confirm"),
    empty: tr("Choisissez au moins une pièce.", "Choose at least one part."),
    quantity: tr(
      "Indiquez des quantités entières entre 1 et 10 000.",
      "Enter whole quantities from 1 to 10,000.",
    ),
    insufficient: tr(
      "Une quantité dépasse le stock disponible, en tenant compte du panier.",
      "A quantity exceeds available stock, including units already in the cart.",
    ),
  };
  const change = (id, patch) => {
    if (busy) return;
    const current = choices[id] || {
      selected: false,
      quantity: String(rows.find((r) => r.id === id)?.quantite || 1),
    };
    setChoices({ ...choices, [id]: { ...current, ...patch } });
    setPartialAccepted(false);
    setError("");
  };
  async function verify(add) {
    if (lock.current || (add && !cartVerified)) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    const pathname = window.location.pathname;
    abort.current = controller;
    try {
      const { data } = await apiClient.get(
        `/projets/public/${encodeURIComponent(project.slug)}`,
        { timeout: 15000, signal: controller.signal },
      );
      // Router transitions may update the URL before passive-effect cleanup.
      // Never commit an addition for a project the customer has just left.
      if (
        !active.current ||
        controller.signal.aborted ||
        window.location.pathname !== pathname
      )
        return;
      const fresh = readProject(data, project.slug);
      if (fresh.id !== project.id) throw Error("Project identity changed");
      const freshRows = materialRows(fresh, materialImage, rows, choices);
      const changed = selectionChanged(
        project,
        fresh,
        rows,
        freshRows,
        choices,
      );
      const current = projectSelection(
        freshRows,
        choices,
        cartRef.current.cartItems,
      );
      setProject(fresh);
      setRows(freshRows);
      setUnavailable(false);
      if (!add) {
        setPartialAccepted(false);
        setError(
          tr(
            "Liste actualisée. Relisez votre sélection avant l’ajout.",
            "List updated. Review your selection before adding it.",
          ),
        );
        return;
      }
      if (changed) {
        setPartialAccepted(false);
        setError(
          tr(
            "La liste, un prix ou une disponibilité a changé. Rien n’a été ajouté. Relisez les informations actualisées avant de confirmer à nouveau.",
            "The list, a price or availability changed. Nothing was added. Review the updated information before confirming again.",
          ),
        );
        return;
      }
      if (current.error) {
        setError(reasons[current.error]);
        return;
      }
      if (current.partial && !partialAccepted) {
        setError(
          tr(
            "Confirmez l’achat de cette sélection partielle.",
            "Confirm the purchase of this partial selection.",
          ),
        );
        return;
      }
      if (!cartRef.current.addSelection(current.items)) {
        setError(
          tr(
            "Votre panier a changé. Vérifiez les quantités avant de réessayer.",
            "Your cart changed. Check quantities before trying again.",
          ),
        );
        return;
      }
      navigate("/panier");
    } catch (e) {
      if (!active.current || controller.signal.aborted) return;
      if (e.response?.status === 404) setUnavailable(true);
      setError(
        e.response?.status === 404
          ? tr(
              "Ce projet n’est plus publié. Rien n’a été ajouté ; consultez la boutique.",
              "This project is no longer published. Nothing was added; contact the shop.",
            )
          : tr(
              "La vérification n’a pas abouti. Rien n’a été ajouté. Réessayez.",
              "Verification failed. Nothing was added. Try again.",
            ),
      );
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <>
      <PageMeta title={`${titleOf(project, lang)} — X-Electronic`} />
      <div className="e-wrap e-project-page">
        <nav className="e-crumbs" aria-label="Breadcrumb">
          <Link to="/">
            <Copy fr="Accueil" en="Home" />
          </Link>
          <span>/</span>
          <Link to="/projets">
            <Copy fr="Projets" en="Projects" />
          </Link>
          <span>/</span>
          <span>{titleOf(project, lang)}</span>
        </nav>
        <header className="e-project-lead">
          <div>
            <span className="e-project-level">
              <Copy
                fr={levels[project.niveau][0]}
                en={levels[project.niveau][1]}
              />
            </span>
            <h1>{titleOf(project, lang)}</h1>
            <p>{summaryOf(project, lang)}</p>
            <p className="e-project-purpose">{project.objectif}</p>
          </div>
          <div className="e-project-hero-visual">
            <ProjectVisual project={project} />
          </div>
        </header>
        <section
          className="e-project-guidance"
          aria-label={tr("Avant de commencer", "Before you begin")}
        >
          <div>
            <h2>
              <Copy fr="Avant de commencer" en="Before you begin" />
            </h2>
            <p>{project.prerequis}</p>
          </div>
          <div>
            <h2>
              <Copy fr="Contraintes et limites" en="Constraints and limits" />
            </h2>
            <p>{project.contraintes}</p>
          </div>
        </section>
        <div className="e-project-material-layout">
          <section>
            <div className="e-section-head">
              <div>
                <h2>
                  <Copy
                    fr="Composez votre matériel"
                    en="Choose your material"
                  />
                </h2>
                <p>
                  <Copy
                    fr="Les quantités indiquées sont conseillées pour un projet. Vous pouvez les modifier et retirer une pièce."
                    en="Quantities are recommended for one project. You can change them or remove a part."
                  />
                </p>
              </div>
              <button
                className="e-text-button"
                disabled={busy}
                onClick={() => void verify(false)}
              >
                <RefreshCw size={16} />
                <Copy fr="Actualiser" en="Refresh" />
              </button>
            </div>
            {!project.validationActuelle && (
              <p className="e-project-warning" role="note">
                <Copy
                  fr="Cette liste doit être revérifiée par la boutique. Demandez conseil avant de préparer ce montage."
                  en="This list needs another review by the shop. Ask for advice before preparing this build."
                />
              </p>
            )}
            <ul className="e-project-materials">
              {rows.map((row) => {
                const choice = choices[row.id] || {
                  selected: false,
                  quantity: String(row.quantite),
                };
                const inCart =
                  cartItems.find((item) => item.id === row.product?.id)
                    ?.quantity || 0;
                const remaining =
                  row.product?.stock == null
                    ? null
                    : Math.max(0, row.product.stock - inCart);
                const exceeded =
                  choice.selected &&
                  !row.reason &&
                  Number(choice.quantity) > remaining;
                return (
                  <li
                    className={row.reason ? "is-unavailable" : ""}
                    key={row.id}
                  >
                    <div className="e-project-material-identify">
                      <label className="e-check">
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={choice.selected}
                          onChange={(e) =>
                            change(row.id, { selected: e.target.checked })
                          }
                        />
                        <span>
                          {lang === "en" && row.produit?.designationEn
                            ? row.produit.designationEn
                            : row.nomAttendu}
                        </span>
                      </label>
                      <p className="e-reference">
                        {row.referenceAttendue ||
                          tr("Référence à préciser", "Reference to confirm")}
                      </p>
                      <p>{row.role}</p>
                      <small>
                        {row.necessaire
                          ? tr(
                              "Nécessaire au projet",
                              "Required for the project",
                            )
                          : tr(
                              "Accessoire facultatif",
                              "Optional accessory",
                            )}{" "}
                        · {tr("Quantité conseillée", "Recommended quantity")} :{" "}
                        {row.quantite}
                      </small>
                    </div>
                    {row.product && (
                      <Link
                        className="e-project-material-photo"
                        to={`/product/${encodeURIComponent(row.product.id)}`}
                        aria-label={tr("Voir ", "View ") + row.product.model}
                      >
                        <Photo product={row.product} />
                      </Link>
                    )}
                    <div className="e-project-material-buy">
                      {row.reason ? (
                        <p className="e-project-line-warning">
                          {reasons[row.reason]}
                        </p>
                      ) : (
                        <>
                          <strong>
                            {formatFCFA(row.product.retailPrice)} /{" "}
                            {tr("unité", "unit")}
                          </strong>
                          <small>
                            {row.product.stock}{" "}
                            {tr("disponible(s)", "available")}
                            {inCart > 0 &&
                              ` · ${inCart} ${tr("déjà au panier", "already in cart")}`}
                          </small>
                        </>
                      )}
                      <label className="e-project-quantity">
                        {tr("Quantité à ajouter", "Quantity to add")}
                        <input
                          type="number"
                          min="1"
                          max={Math.min(10000, remaining || 10000)}
                          step="1"
                          disabled={
                            busy || !choice.selected || Boolean(row.reason)
                          }
                          value={choice.quantity}
                          onChange={(e) =>
                            change(row.id, { quantity: e.target.value })
                          }
                          aria-label={
                            tr("Quantité : ", "Quantity: ") +
                            (row.referenceAttendue || row.nomAttendu)
                          }
                        />
                      </label>
                      {exceeded && (
                        <p className="e-project-line-warning">
                          {tr(
                            "Quantité supérieure à la disponibilité restante.",
                            "Quantity exceeds remaining availability.",
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <section className="e-project-documents">
              <h2>
                <Copy fr="Documentation du projet" en="Project documentation" />
              </h2>
              <ul>
                {project.documents.map((doc, i) => (
                  <li key={i}>
                    {projectLink(doc.url) ? (
                      <a
                        href={projectLink(doc.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText size={17} />
                        {doc.titre}
                      </a>
                    ) : (
                      <span>
                        {doc.titre} —{" "}
                        <Copy fr="Lien à confirmer" en="Link to confirm" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p>
                <Copy
                  fr="Consultez les documents et les limites du montage avant de choisir. La liste ne remplace pas un conseil technique adapté à votre usage."
                  en="Read the documents and build limitations before choosing. This list does not replace technical advice for your specific use."
                />
              </p>
            </section>
          </section>
          <aside
            className="e-project-selection"
            aria-label={tr("Votre sélection", "Your selection")}
          >
            <h2>
              <Copy fr="Votre sélection" en="Your selection" />
            </h2>
            <p>
              {selected.count}{" "}
              <Copy fr="référence(s) choisie(s)" en="chosen reference(s)" />
            </p>
            <div className="e-project-total">
              <span>
                <Copy
                  fr="Estimation du matériel"
                  en="Estimated material cost"
                />
              </span>
              <strong>
                {selected.error
                  ? tr("À vérifier", "To check")
                  : formatFCFA(selected.total)}
              </strong>
            </div>
            {selected.partial && (
              <div className="e-project-partial">
                <p>
                  <Copy
                    fr="Cette sélection ne comprend pas tout le matériel requis, aux quantités conseillées. Elle ne constitue pas un kit complet."
                    en="This selection does not include all required material at the recommended quantities. It is not a complete kit."
                  />
                </p>
                <label className="e-check">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={partialAccepted}
                    onChange={(e) => setPartialAccepted(e.target.checked)}
                  />
                  <span>
                    <Copy
                      fr="Je souhaite acheter seulement cette sélection"
                      en="I want to buy only this selection"
                    />
                  </span>
                </label>
              </div>
            )}
            {error && (
              <p className="e-form-error" role="alert">
                {error}
              </p>
            )}
            {selected.error && (
              <p className="e-project-line-warning">
                {reasons[selected.error]}
              </p>
            )}
            <button
              className="e-btn"
              disabled={
                busy ||
                !cartVerified ||
                unavailable ||
                Boolean(selected.error) ||
                (selected.partial && !partialAccepted)
              }
              onClick={() => void verify(true)}
            >
              <ShoppingCart size={17} />
              <Copy
                fr={busy ? "Vérification…" : "Vérifier et ajouter au panier"}
                en={busy ? "Checking…" : "Check and add to cart"}
              />
            </button>
            <p className="e-project-final-check">
              <Copy
                fr="Prix, stock et liste relus avant l’ajout. Le panier ne réserve aucune pièce ; la boutique confirme la réception de la commande."
                en="Prices, stock and list are checked again before adding. The cart does not reserve any part; the shop confirms order reception."
              />
            </p>
            {!cartVerified && (
              <p className="e-project-line-warning" role="status">
                <Copy
                  fr="Votre panier doit finir d’être vérifié avant l’ajout. Si ce message persiste, rechargez la page après avoir rétabli la connexion."
                  en="Your cart must finish verification before adding items. If this message persists, restore the connection and reload the page."
                />
              </p>
            )}
            <ReceptionSummary />
            <Link to="/contact">
              <Copy
                fr="Un doute sur votre montage ? Demander conseil"
                en="Unsure about your build? Ask for advice"
              />
            </Link>
          </aside>
        </div>
      </div>
      <Footer />
    </>
  );
}
export default function Projects() {
  const { slug } = useParams();
  return slug ? <ProjectDetail slug={slug} /> : <ProjectLibrary />;
}
