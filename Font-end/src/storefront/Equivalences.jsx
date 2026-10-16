import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageMeta from "./PageMeta";
import { ArrowRight, Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { resolveImageUrl } from "../utils/mapProduct";
import { adaptProduct } from "./productData";
import {
  mergeReplacementSuggestions,
  parseEquivalences,
  parseReplacementDossiers,
} from "./equivalenceData";
import { Copy, Crumbs, Photo, Price, Stock } from "./Elements";
import Footer from "./Footer";
import OfferDetails from "./OfferDetails";
import TechnicalSource from "./TechnicalSource";
import ReplacementDecision from "./ReplacementDecision";

function Finder({ initial, targetId }) {
  const { lang } = useI18n();
  const [query, setQuery] = useState(initial);
  const [application, setApplication] = useState("");
  const [state, setState] = useState({ status: "idle" });
  const active = useRef(null);
  const resultsRef = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (["success", "error"].includes(state.status)) {
      const header = document.querySelector(".e-header");
      const pinned =
        header &&
        ["sticky", "fixed"].includes(getComputedStyle(header).position);
      if (resultsRef.current)
        resultsRef.current.style.scrollMarginTop = `${(pinned ? header.getBoundingClientRect().height : 0) + 18}px`;
      resultsRef.current?.focus({ preventScroll: true });
      resultsRef.current?.scrollIntoView({ block: "start" });
    }
  }, [state.status]);
  function edit(value) {
    active.current?.abort();
    active.current = null;
    setQuery(value);
    setState({ status: "idle" });
  }
  function editApplication(value) {
    active.current?.abort();
    active.current = null;
    setApplication(value);
    setState({ status: "idle" });
  }
  async function submit(event, options = {}) {
    event?.preventDefault();
    const text = query.trim();
    if (!text || text.length > 255) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ status: "loading" });
    const useTarget = targetId && query === initial;
    const searchedApplication = options.application ?? application.trim();
    const page = options.page ?? 0;
    if (options.application !== undefined) setApplication(options.application);
    const scope = useTarget ? { produitId: targetId } : { query: text };
    const [model, reviewed] = await Promise.allSettled([
      apiClient
        .post(
          "/equivalence/suggest",
          {
            ...scope,
            source: "ecommerce",
            ...(searchedApplication
              ? { application: searchedApplication }
              : {}),
          },
          { signal: controller.signal, timeout: 45000 },
        )
        .then(({ data }) =>
          parseEquivalences(data, useTarget ? targetId : null),
        ),
      apiClient
        .post(
          "/equivalence/cas/rechercher",
          { ...scope, application: searchedApplication, page },
          { signal: controller.signal, timeout: 15000 },
        )
        .then(({ data }) =>
          parseReplacementDossiers(
            data,
            searchedApplication,
            useTarget ? targetId : null,
          ),
        ),
    ]);
    if (active.current !== controller || controller.signal.aborted) return;
    if (model.status === "rejected" && reviewed.status === "rejected") {
      setState({
        status: "error",
        limited: [model, reviewed].some(
          (r) => r.reason?.response?.status === 429,
        ),
      });
      return;
    }
    const modelData =
      model.status === "fulfilled"
        ? model.value
        : { suggestions: [], catalogueOnly: true, message: "" };
    const register =
      reviewed.status === "fulfilled"
        ? reviewed.value
        : { suggestions: [], nextPage: null, limiteAtteinte: false };
    setState({
      status: "success",
      ...modelData,
      suggestions: mergeReplacementSuggestions(modelData, register),
      hasDossiers: register.suggestions.length > 0,
      nextPage: register.nextPage,
      limiteAtteinte: register.limiteAtteinte,
      page,
      reviewError: reviewed.status === "rejected",
      matchingError: model.status === "rejected",
      searched: text,
      searchedApplication,
    });
  }
  return (
    <>
      <div className="e-equivalence-workspace">
        <form className="e-equivalence-form" onSubmit={submit}>
          <label htmlFor="equivalence-query">
            <Copy
              fr="La pièce que vous cherchez"
              en="The part you are looking for"
            />
          </label>
          <textarea
            id="equivalence-query"
            value={query}
            onChange={(e) => edit(e.target.value)}
            maxLength={255}
            required
            rows={3}
            placeholder={
              lang === "fr"
                ? "Référence, type de composant, tension, valeur…"
                : "Reference, component type, voltage, value…"
            }
            aria-describedby="equivalence-hint"
          />
          <p id="equivalence-hint">
            <Copy
              fr="Recopiez le marquage de votre pièce et précisez les caractéristiques que vous connaissez."
              en="Copy the marking on your part and include the specifications you know."
            />
          </p>
          {targetId && query === initial && (
            <p className="e-equivalence-origin">
              <Copy
                fr="Recherche à partir de la fiche sélectionnée."
                en="Searching from the selected product."
              />{" "}
              <button
                type="button"
                className="e-text-button"
                onClick={() => edit("")}
              >
                <Copy fr="Chercher une autre pièce" en="Find another part" />
              </button>
            </p>
          )}
          <label htmlFor="equivalence-application">
            <Copy
              fr="Votre montage et ses contraintes (facultatif)"
              en="Your circuit and its requirements (optional)"
            />
          </label>
          <textarea
            id="equivalence-application"
            value={application}
            onChange={(e) => editApplication(e.target.value)}
            maxLength={500}
            rows={3}
            aria-describedby="equivalence-application-hint"
            placeholder={
              lang === "fr"
                ? "Usage, alimentation, boîtier, brochage, température…"
                : "Use, supply, package, pinout, temperature…"
            }
          />
          <p id="equivalence-application-hint">
            <Copy
              fr="Indiquez les conditions que la pièce doit respecter. Évitez les coordonnées personnelles."
              en="Describe the requirements the part must meet. Do not include personal contact details."
            />
          </p>
          <button
            className="e-btn"
            disabled={!query.trim() || state.status === "loading"}
          >
            <Search size={18} />
            <Copy
              fr={
                state.status === "loading"
                  ? "Recherche en cours…"
                  : "Rechercher un équivalent"
              }
              en={
                state.status === "loading" ? "Searching…" : "Find an equivalent"
              }
            />
          </button>
        </form>
        <aside className="e-equivalence-help">
          <h2>
            <Copy
              fr="Le bon rôle. Les bons paramètres."
              en="The right role. The right specifications."
            />
          </h2>
          <p>
            <Copy
              fr="Le système compare votre besoin aux composants disponibles chez X-Electronic."
              en="The system compares your needs with components available at X-Electronic."
            />
          </p>
          <p>
            <Copy
              fr="Tension, valeur, puissance, boîtier et brochage : précisez ce qui compte pour votre montage."
              en="Voltage, value, power, package and pinout: specify what matters for your circuit."
            />
          </p>
          <Link to="/contact">
            <Copy
              fr="Besoin d’aide pour identifier la pièce ?"
              en="Need help identifying your part?"
            />
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
      <div
        className="e-equivalence-results"
        ref={resultsRef}
        tabIndex={-1}
        aria-live="polite"
        aria-busy={state.status === "loading"}
      >
        {state.status === "loading" && (
          <p role="status">
            <Copy
              fr="Recherche de pièces pouvant remplir le même rôle dans notre catalogue…"
              en="Looking for parts that could fulfil the same role in our catalogue…"
            />
          </p>
        )}
        {state.status === "error" && (
          <div className="e-state" role="alert">
            <h2>
              <Copy
                fr={
                  state.limited
                    ? "Le service est très sollicité"
                    : "La recherche n’a pas abouti"
                }
                en={
                  state.limited
                    ? "The service is busy"
                    : "The search could not be completed"
                }
              />
            </h2>
            <p>
              <Copy
                fr="Votre référence est conservée. Réessayez dans un instant ou demandez conseil à la boutique."
                en="Your reference is saved. Try again shortly or contact the shop."
              />
            </p>
            <button className="e-btn" onClick={submit}>
              <Copy fr="Réessayer" en="Try again" />
            </button>
          </div>
        )}
        {state.status === "success" && (
          <>
            <h2>
              <Copy
                fr={`Résultats pour « ${state.searched} »`}
                en={`Results for “${state.searched}”`}
              />
            </h2>
            {state.searchedApplication && (
              <p className="e-equivalence-summary">
                <strong>
                  <Copy fr="Votre montage : " en="Your circuit: " />
                </strong>
                {state.searchedApplication}
              </p>
            )}
            {(state.reviewError || state.matchingError) && (
              <div className="e-equivalence-partial" role="alert">
                <p>
                  <Copy
                    fr={
                      state.reviewError
                        ? "Les dossiers relus n’ont pas pu être vérifiés. Les pistes ci-dessous restent non validées."
                        : "Les autres pistes sont indisponibles. Les dossiers relus ci-dessous restent consultables."
                    }
                    en={
                      state.reviewError
                        ? "Reviewed dossiers could not be checked. The suggestions below remain unverified."
                        : "Other suggestions are unavailable. The reviewed dossiers below are still available."
                    }
                  />
                </p>
                <button
                  type="button"
                  className="e-text-button"
                  onClick={(e) => submit(e, { page: state.page })}
                >
                  <Copy fr="Réessayer la recherche" en="Retry the search" />
                </button>
              </div>
            )}
            {state.suggestions.length ? (
              <>
                <p className="e-equivalence-summary">
                  <Copy
                    fr={
                      state.hasDossiers
                        ? "Les dossiers relus décrivent un usage précis. Les autres pistes restent à vérifier avec un technicien."
                        : state.catalogueOnly
                          ? "Pistes issues du catalogue : leur compatibilité technique reste à vérifier."
                          : "Le moteur propose des pistes à examiner. Aucune compatibilité technique n’est validée : faites vérifier les caractéristiques par un technicien avant tout remplacement."
                    }
                    en={
                      state.hasDossiers
                        ? "Reviewed dossiers describe a specific use. Other suggestions still need checking by a technician."
                        : state.catalogueOnly
                          ? "Catalogue matches: technical compatibility still needs checking."
                          : "The matching engine suggests parts to review. Technical compatibility is not verified: ask a technician to check the specifications before replacing your component."
                    }
                  />
                </p>
                <div>
                  {state.suggestions.map((s) => {
                    const product = adaptProduct(
                      { ...s, id: s.produitId },
                      resolveImageUrl,
                    );
                    const name =
                      lang === "en" && product.englishName
                        ? product.englishName
                        : product.model;
                    return (
                      <article className="e-equivalent" key={s.produitId}>
                        <Link
                          className="e-equivalent-photo"
                          aria-label={name}
                          to={"/product/" + encodeURIComponent(s.produitId)}
                        >
                          <Photo product={product} />
                        </Link>
                        <div className="e-equivalent-description">
                          <Stock product={product} />
                          <h3>
                            <Link
                              to={"/product/" + encodeURIComponent(s.produitId)}
                            >
                              {name}
                            </Link>
                          </h3>
                          {s.code && (
                            <p className="e-reference">
                              {s.codeFamille ? `${s.codeFamille} / ` : ""}
                              {s.code}
                            </p>
                          )}
                          {!s.dossiers?.length && (
                            <span className="e-compatibility e-compatibility--inconnue">
                              <Copy
                                fr={
                                  state.catalogueOnly
                                    ? "Correspondance catalogue"
                                    : "Piste non validée par un technicien"
                                }
                                en={
                                  state.catalogueOnly
                                    ? "Catalogue match"
                                    : "Not technician-verified"
                                }
                              />
                            </span>
                          )}
                          {s.dossiers?.map((d) => (
                            <ReplacementDecision
                              key={d.application}
                              dossier={d}
                              onUseScope={(application) =>
                                submit(null, { application })
                              }
                            />
                          ))}
                          {!s.dossiers?.length && s.raison && (
                            <p className="e-equivalent-reason">
                              {state.catalogueOnly ? (
                                <Copy
                                  fr="Suggestion catalogue basée sur les correspondances produit en stock."
                                  en="Catalogue suggestion based on matching stocked products."
                                />
                              ) : (
                                s.raison
                              )}
                            </p>
                          )}
                          {!s.dossiers?.length &&
                            (s.avertissement || !state.catalogueOnly) && (
                              <p className="e-equivalent-warning">
                                <strong>
                                  <Copy fr="À vérifier : " en="Check: " />
                                </strong>
                                {state.catalogueOnly ? (
                                  <Copy
                                    fr="Vérifier les caractéristiques techniques avant substitution."
                                    en="Check the technical specifications before substitution."
                                  />
                                ) : (
                                  s.avertissement || (
                                    <Copy
                                      fr="le rôle électrique, les valeurs, la polarité, le boîtier et le brochage dans une fiche constructeur."
                                      en="electrical role, ratings, polarity, package and pinout against a manufacturer datasheet."
                                    />
                                  )
                                )}
                              </p>
                            )}
                          {s.caracteristiques?.length ? (
                            <details className="e-equivalent-sources">
                              <summary>
                                <Copy
                                  fr="Caractéristiques et sources disponibles"
                                  en="Available specifications and sources"
                                />
                              </summary>
                              <p>
                                <Copy
                                  fr="Ces sources documentent la pièce proposée. Elles ne valident pas son remplacement dans votre montage."
                                  en="These sources document the suggested part. They do not validate it as a replacement in your circuit."
                                />
                              </p>
                              <ul>
                                {s.caracteristiques.map((c, index) => (
                                  <li key={index}>
                                    <strong>{c.nomAttribut}</strong>
                                    <span>{c.valeur}</span>
                                    <TechnicalSource source={c.documentation} />
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : (
                            <p className="e-equivalent-source-empty">
                              <Copy
                                fr="Aucune caractéristique relue disponible pour cette proposition. Consultez la fiche et faites vérifier votre montage."
                                en="No reviewed specifications available for this suggestion. Review the product and have your circuit checked."
                              />
                            </p>
                          )}
                        </div>
                        <div className="e-equivalent-action">
                          <Price value={product.retailPrice} />
                          <OfferDetails product={product} />
                          <Link
                            className="e-btn e-secondary"
                            to={"/product/" + encodeURIComponent(s.produitId)}
                          >
                            <Copy
                              fr="Examiner cette pièce"
                              en="Review this part"
                            />
                            <ArrowRight size={17} />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="e-state">
                <h3>
                  <Copy
                    fr={
                      state.nextPage !== null || state.page > 0
                        ? "Aucun dossier relu disponible sur cette page"
                        : "Aucun équivalent proposé"
                    }
                    en={
                      state.nextPage !== null || state.page > 0
                        ? "No reviewed dossier available on this page"
                        : "No equivalent suggested"
                    }
                  />
                </h3>
                <p>
                  {state.nextPage !== null || state.page > 0 ? (
                    <Copy
                      fr="Consultez les autres pages de dossiers ou demandez conseil à la boutique."
                      en="Check the other dossier pages or ask the shop for advice."
                    />
                  ) : (
                    (lang === "fr" && state.message) || (
                      <Copy
                        fr="Aucune pièce en stock n’a pu être proposée pour cette recherche. Précisez votre référence ou demandez conseil."
                        en="No stocked part could be suggested. Refine your reference or ask for advice."
                      />
                    )
                  )}
                </p>
                <Link className="e-btn e-secondary" to="/contact">
                  <Copy
                    fr="Faire vérifier ma recherche"
                    en="Ask the shop to check"
                  />
                </Link>
              </div>
            )}
          </>
        )}
        {state.status === "success" &&
          (state.nextPage !== null ||
            state.page > 0 ||
            state.limiteAtteinte) && (
            <nav
              className="e-replacement-pages"
              aria-label={
                lang === "fr"
                  ? "Dossiers de remplacement"
                  : "Replacement dossiers"
              }
            >
              <p>
                <Copy
                  fr={`Dossiers relus — page ${state.page + 1}. Les pistes de recherche peuvent être répétées d’une page à l’autre.`}
                  en={`Reviewed dossiers — page ${state.page + 1}. Search suggestions may repeat across pages.`}
                />
              </p>
              {state.page > 0 && (
                <button
                  type="button"
                  className="e-btn e-secondary"
                  onClick={(e) => submit(e, { page: state.page - 1 })}
                >
                  <Copy fr="Dossiers précédents" en="Previous dossiers" />
                </button>
              )}
              {state.nextPage !== null && (
                <button
                  type="button"
                  className="e-btn e-secondary"
                  onClick={(e) => submit(e, { page: state.nextPage })}
                >
                  <Copy
                    fr="Autres dossiers relus"
                    en="More reviewed dossiers"
                  />
                </button>
              )}
              {state.limiteAtteinte && (
                <p>
                  <Copy
                    fr="La limite de consultation est atteinte. Demandez conseil à la boutique pour poursuivre."
                    en="The browsing limit has been reached. Ask the shop for help continuing."
                  />
                </p>
              )}
            </nav>
          )}
      </div>
    </>
  );
}

export default function Equivalences() {
  const { lang } = useI18n();
  const [params] = useSearchParams();
  const initial = (params.get("query") || "").slice(0, 255);
  const targetId = params.get("produitId") || "";
  return (
    <>
      <PageMeta />
      <div className="e-wrap e-equivalences">
        <Crumbs title={lang === "fr" ? "Équivalences" : "Equivalents"} />
        <div className="e-page-lead">
          <h1>
            <Copy fr="Trouver un équivalent" en="Find an equivalent" />
          </h1>
          <p>
            <Copy
              fr="Votre référence exacte est introuvable ? Cherchons une pièce qui peut remplir le même rôle."
              en="Cannot find your exact reference? Look for a part that can fulfil the same role."
            />
          </p>
        </div>
        <Finder
          key={initial + targetId}
          initial={initial}
          targetId={targetId}
        />
      </div>
      <Footer />
    </>
  );
}
