import EquivalenceEntry from "./EquivalenceEntry";
import { useMemo, useState } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { seoFamilies, seoFamily, familyPath, familyParameters } from './seoFamilies.js';
import PageMeta from "./PageMeta";
import { SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { resolveImageUrl } from "../utils/mapProduct";
import useResource from "./useResource";
import { adaptProduct, resultPage } from "./productData";
import { Copy, Crumbs, State, Modal } from "./Elements";
import CatalogueGrid from './CatalogueGrid';
import Footer from "./Footer";
import { ComparisonLink } from "./ComparisonAction";
import { useJourneyObservation } from "./useJourney.js";
import { catalogueQuery } from "./catalogueQuery";
import useBrowserReady from "./useBrowserReady";

export default function Catalogue() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const family = seoFamily(location.pathname);
  const effectiveParams = familyParameters(params, family);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(false);
  const { lang } = useI18n();
  const ready = useBrowserReady();
  const { query, category, subcategory, inStock, sort, page, path } = catalogueQuery(effectiveParams);
  const resource = useResource(path, true);
  const categories = useResource("/categories");
  const hierarchy = useResource("/categories?includeSousCategories=true");
  const { result, parseError } = useMemo(() => {
    try {
      const result = resource.data ? resultPage(resource.data) : { rows: [], total: 0, pages: 1 };
      return { result: { ...result, rows: result.rows.map(raw => adaptProduct(raw, resolveImageUrl)) }, parseError: null };
    } catch (parseError) {
      return { result: { rows: [], total: 0, pages: 1 }, parseError };
    }
  }, [resource.data]);
  useJourneyObservation(
    "RECHERCHE_VIDE",
    Boolean(
      query.trim() &&
      page === 1 &&
      resource.data &&
      !resource.loading &&
      !resource.error &&
      !parseError &&
      result.total === 0,
    ),
    JSON.stringify([
      query,
      category,
      inStock,
      params.get("minPrice"),
      params.get("maxPrice"),
    ]),
    lang,
  );
  const categoryData = hierarchy.data || categories.data;
  const cats = Array.isArray(categoryData) ? categoryData : categoryData?.data || [];
  const children = cats.find((c) => c.id === category)?.sousCategories || [];
  const change = (key, value) => {
    if (family && ['category', 'sub'].includes(key)) {
      const next = new URLSearchParams(effectiveParams);
      if (value) next.set(key, value); else next.delete(key);
      if (key === 'category') next.delete('sub');
      next.delete('page');
      navigate('/catalogue' + (next.size ? '?' + next : ''));
      return;
    }
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === "category") next.delete("sub");
      if (key !== "page") next.delete("page");
      return next;
    });
  };
  const pageLink = number => {
    const next = new URLSearchParams(params);
    if (number > 1) next.set('page', String(number)); else next.delete('page');
    return location.pathname + (next.size ? '?' + next.toString() : '');
  };
  const filters = (
    <>
      <label className="e-field">
        <Copy fr="Famille" en="Category" />
        <select
          disabled={!ready}
          value={category}
          onChange={(e) => change("category", e.target.value)}
        >
          <option value="">
            {lang === "fr" ? "Toutes les familles" : "All categories"}
          </option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
      </label>
      <label className="e-field">
        <Copy fr="Sous-catégorie" en="Subcategory" />
        <select disabled={!ready || !category} value={subcategory}
          onChange={(e) => change("sub", e.target.value)}>
          <option value="">{lang === "fr" ? "Toutes les sous-catégories" : "All subcategories"}</option>
          {children.map((child) => <option key={child.id} value={child.id}>{child.nom} ({child._count?.produits ?? 0})</option>)}
        </select>
      </label>
      {categories.error && (
        <p role="status">
          <Copy
            fr="Les familles ne sont pas disponibles pour le moment."
            en="Categories are temporarily unavailable."
          />
        </p>
      )}
      <label className="e-check">
        <input
          type="checkbox"
          disabled={!ready}
          checked={inStock}
          onChange={(e) => change("instock", e.target.checked ? "true" : "")}
        />
        <Copy fr="En stock uniquement" en="In stock only" />
      </label>
      <div className="e-price-fields">
        {[
          ["minPrice", "Prix min.", "Min. price"],
          ["maxPrice", "Prix max.", "Max. price"],
        ].map(([key, fr, en]) => (
          <label className="e-field" key={key}>
            <Copy fr={fr} en={en} /> (FCFA)
            <input
              type="number"
              disabled={!ready}
              min="0"
              inputMode="numeric"
              value={params.get(key) || ""}
              onChange={(e) => change(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <button
        className="e-btn e-secondary"
        disabled={!ready}
        onClick={() => setParams(query ? { search: query } : {})}
      >
        <Copy fr="Réinitialiser les filtres" en="Reset filters" />
      </button>
    </>
  );
  return (
    <>
      <PageMeta title={query ? `${query} — Catalogue — X-Electronic` : undefined} />
      <div className="e-wrap e-catalogue">
        <Crumbs title={family ? (lang === 'en' ? family.en : family.fr) : 'Catalogue'} />
        <div className="e-page-lead">
          <h1>
            {query ? (
              lang === "fr" ? (
                `Résultats pour « ${query} »`
              ) : (
                `Results for “${query}”`
              )
            ) : (
              family ? (lang === 'en' ? family.en : family.fr) : <Copy fr="Produits électroniques" en="Electronic products" />
            )}
          </h1>
          {family && <p>{lang === 'en' ? family.descriptionEn : family.descriptionFr}</p>}
          <p aria-live="polite">
            {resource.loading ? (
              <Copy fr="Recherche en cours…" en="Searching…" />
            ) : resource.error || parseError ? (
              <Copy fr="Résultats indisponibles" en="Results unavailable" />
            ) : (
              `${result.total} ${lang === "fr" ? "référence(s)" : "product(s)"}`
            )}
          </p>
        </div>
        <nav className="e-chips e-family-links" aria-label={lang === 'en' ? 'Specialist categories' : 'Familles spécialisées'}>
          {seoFamilies.map(item => <Link key={item.slug} to={familyPath(item)} aria-current={item === family ? 'page' : undefined}>{lang === 'en' ? item.en : item.fr}</Link>)}
          {family && <Link to="/catalogue"><Copy fr="Tout le catalogue" en="All products" /></Link>}
        </nav>
        <div className="e-tools">
          <button className="e-btn e-secondary" disabled={!ready} onClick={() => setOpen(true)}>
            <SlidersHorizontal size={18} />
            <Copy fr="Filtres" en="Filters" />
          </button>
          <button className="e-view" disabled={!ready} onClick={() => setList(!list)}>
            <Copy
              fr={list ? "Vue grille" : "Vue liste"}
              en={list ? "Grid view" : "List view"}
            />
          </button>
          <ComparisonLink />
          <label className="e-sort">
            <span>
              <Copy fr="Trier par" en="Sort by" />
            </span>
            <select
              disabled={!ready}
              aria-label={
                lang === "fr" ? "Trier les produits" : "Sort products"
              }
              value={sort}
              onChange={(e) => change("sort", e.target.value)}
            >
              {[
                ...(query.trim() ? [["relevance", "Pertinence", "Relevance"]] : []),
                ["name-asc", "Nom A–Z", "Name A–Z"],
                ["name-desc", "Nom Z–A", "Name Z–A"],
                ["price-asc", "Prix croissant", "Price low to high"],
                ["price-desc", "Prix décroissant", "Price high to low"],
              ].map(([v, fr, en]) => (
                <option value={v} key={v}>
                  {lang === "fr" ? fr : en}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="e-chips">
          {[
            ["search", query],
            ["category", cats.find((c) => c.id === category)?.nom || category],
            ["sub", children.find((c) => c.id === subcategory)?.nom || subcategory],
            [
              "instock",
              inStock ? (lang === "fr" ? "En stock" : "In stock") : "",
            ],
            [
              "minPrice",
              params.get("minPrice")
                ? `Min. ${params.get("minPrice")} FCFA`
                : "",
            ],
            [
              "maxPrice",
              params.get("maxPrice")
                ? `Max. ${params.get("maxPrice")} FCFA`
                : "",
            ],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <span key={k}>
                {v}
                <button
                  disabled={!ready}
                  aria-label={`${lang === "fr" ? "Effacer" : "Remove"} ${v}`}
                  onClick={() => change(k, "")}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
        </div>
        <State {...resource} error={resource.error || parseError}>
          {result.rows.length ? (
            <CatalogueGrid products={result.rows} list={list} />
          ) : (
            <div className="e-state">
              <h2>
                <Copy
                  fr="Aucun résultat pour cette recherche"
                  en="No results for this search"
                />
              </h2>
              <p>
                <Copy
                  fr="Essayez une autre référence ou retirez un filtre."
                  en="Try another reference or remove a filter."
                />
              </p>
              <button className="e-btn" disabled={!ready} onClick={() => setParams({})}>
                <Copy fr="Voir tous les produits" en="View all products" />
              </button>
              <Link to="/contact">
                <Copy fr="Demander conseil" en="Ask for advice" />
              </Link>
            </div>
          )}
        </State>
        {!resource.error && result.pages > 1 && (
          <nav className="e-pagination" aria-label="Pagination">
            {page > 1 ? <Link to={pageLink(page - 1)} rel="prev"><Copy fr="Précédent" en="Previous" /></Link> : <span aria-disabled="true"><Copy fr="Précédent" en="Previous" /></span>}
            <span>
              {page} / {result.pages}
            </span>
            {page < result.pages ? <Link to={pageLink(page + 1)} rel="next"><Copy fr="Suivant" en="Next" /></Link> : <span aria-disabled="true"><Copy fr="Suivant" en="Next" /></span>}
          </nav>
        )}
        {query && <EquivalenceEntry query={query} />}
        <div className="e-catalogue-hint">
          <span><Copy fr="Une référence ou un besoin précis ?" en="A reference or a specific need?" /></span>
          <Link to="/contact"><Copy fr="Demander conseil" en="Ask for advice" /><ArrowRight size={16} /></Link>
        </div>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={lang === "fr" ? "Filtrer les produits" : "Filter products"}
      >
        {filters}
        <button className="e-btn e-filter-apply" onClick={() => setOpen(false)}>
          <Copy fr="Voir les résultats" en="View results" />
        </button>
      </Modal>
      <Footer />
    </>
  );
}
