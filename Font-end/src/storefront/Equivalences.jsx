import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { resolveImageUrl } from "../utils/mapProduct";
import { adaptProduct } from "./productData";
import { parseEquivalences } from "./equivalenceData";
import { Copy, Crumbs, Photo, Price, Stock } from "./Elements";
import Footer from "./Footer";

function Finder({ initial, targetId }) {
  const { lang } = useI18n();
  const [query, setQuery] = useState(initial);
  const [state, setState] = useState({ status: "idle" });
  const active = useRef(null);
  const resultsRef = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (["success", "error"].includes(state.status)) {
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
  async function submit(event) {
    event.preventDefault();
    const text = query.trim();
    if (!text || text.length > 255) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setState({ status: "loading" });
    const useTarget = targetId && query === initial;
    try {
      const { data } = await apiClient.post(
        "/equivalence/suggest",
        {
          ...(useTarget ? { produitId: targetId } : { query: text }),
          source: "ecommerce",
        },
        { signal: controller.signal, timeout: 45000 },
      );
      if (active.current !== controller || controller.signal.aborted) return;
      setState({
        status: "success",
        ...parseEquivalences(data, useTarget ? targetId : null),
        searched: text,
      });
    } catch (error) {
      if (active.current !== controller || controller.signal.aborted) return;
      setState({ status: "error", limited: error.response?.status === 429 });
    }
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
            {state.suggestions.length ? (
              <>
                <p className="e-equivalence-summary">
                  <Copy
                    fr={
                      state.catalogueOnly
                        ? "Pistes issues du catalogue : leur compatibilité technique reste à vérifier."
                        : "Le moteur propose des pistes à examiner. Aucune compatibilité technique n’est validée : faites vérifier les caractéristiques par un technicien avant tout remplacement."
                    }
                    en={
                      state.catalogueOnly
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
                    return (
                      <article className="e-equivalent" key={s.produitId}>
                        <Link
                          className="e-equivalent-photo"
                          aria-label={s.nomProduit}
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
                              {s.nomProduit}
                            </Link>
                          </h3>
                          {s.code && (
                            <p className="e-reference">
                              {s.codeFamille ? `${s.codeFamille} / ` : ""}
                              {s.code}
                            </p>
                          )}
                          <span
                            className={
                              "e-compatibility e-compatibility--" +
                              (state.catalogueOnly
                                ? "inconnue"
                                : "inconnue")
                            }
                          >
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
                          {s.raison && (
                            <p className="e-equivalent-reason">{s.raison}</p>
                          )}
                          {(s.avertissement || !state.catalogueOnly) && (
                            <p className="e-equivalent-warning">
                              <strong>
                                <Copy fr="À vérifier : " en="Check: " />
                              </strong>
                              {s.avertissement || (
                                <Copy
                                  fr="le rôle électrique, les valeurs, la polarité, le boîtier et le brochage dans une fiche constructeur."
                                  en="electrical role, ratings, polarity, package and pinout against a manufacturer datasheet."
                                />
                              )}
                            </p>
                          )}
                        </div>
                        <div className="e-equivalent-action">
                          <Price value={product.retailPrice} />
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
                    fr="Aucun équivalent proposé"
                    en="No equivalent suggested"
                  />
                </h3>
                <p>
                  {state.message || (
                    <Copy
                      fr="Aucune pièce en stock n’a pu être proposée pour cette recherche. Précisez votre référence ou demandez conseil."
                      en="No stocked part could be suggested. Refine your reference or ask for advice."
                    />
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
      </div>
    </>
  );
}

export default function Equivalences() {
  const [params] = useSearchParams();
  const initial = (params.get("query") || "").slice(0, 255);
  const targetId = params.get("produitId") || "";
  return (
    <>
      <Helmet>
        <title>Trouver un équivalent — X-Electronic</title>
        <meta
          name="description"
          content="Recherchez une pièce de remplacement parmi les composants électroniques NEWOTEG en stock."
        />
      </Helmet>
      <div className="e-wrap e-equivalences">
        <Crumbs title="Équivalences" />
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
