import EquivalenceEntry from "./EquivalenceEntry";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageMeta from "./PageMeta";
import { SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { resolveImageUrl } from "../utils/mapProduct";
import useResource from "./useResource";
import { adaptProduct, resultPage } from "./productData";
import { Copy, Card, Crumbs, State, Modal } from "./Elements";
import Footer from "./Footer";
import { ComparisonLink } from "./ComparisonAction";
import { useJourneyObservation } from "./useJourney.js";

export default function Catalogue() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(false);
  const { lang } = useI18n();
  const query = params.get("search") || "",
    category = params.get("category") || "",
    inStock = params.get("instock") === "true",
    sort = params.get("sort") || "name-asc";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const apiParams = new URLSearchParams({
    page: String(page),
    limit: "24",
    sort: sort.replace("-", "_"),
  });
  if (query) apiParams.set("search", query);
  if (category) apiParams.set("categoryId", category);
  if (inStock) apiParams.set("inStock", "true");
  for (const key of ["minPrice", "maxPrice"])
    if (Number(params.get(key)) > 0) apiParams.set(key, params.get(key));
  const resource = useResource("/produits?" + apiParams);
  const categories = useResource("/categories");
  let result = { rows: [], total: 0, pages: 1 },
    parseError = null;
  try {
    if (resource.data) result = resultPage(resource.data);
  } catch (e) {
    parseError = e;
  }
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
  const cats = Array.isArray(categories.data)
    ? categories.data
    : categories.data?.data || [];
  const change = (key, value) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };
  const filters = (
    <>
      <label className="e-field">
        <Copy fr="Famille" en="Category" />
        <select
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
        <Crumbs title={lang === "fr" ? "Catalogue" : "Catalogue"} />
        <div className="e-page-lead">
          <h1>
            {query ? (
              lang === "fr" ? (
                `Résultats pour « ${query} »`
              ) : (
                `Results for “${query}”`
              )
            ) : (
              <Copy fr="Produits électroniques" en="Electronic products" />
            )}
          </h1>
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
        <div className="e-catalogue-hint">
          <span>
            <Copy
              fr="Une référence ou un besoin précis ?"
              en="A reference or a specific need?"
            />
          </span>
          <Link to="/contact">
            <Copy fr="Demander conseil" en="Ask for advice" />
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="e-tools">
          <button className="e-btn e-secondary" onClick={() => setOpen(true)}>
            <SlidersHorizontal size={18} />
            <Copy fr="Filtres" en="Filters" />
          </button>
          <button className="e-view" onClick={() => setList(!list)}>
            <Copy
              fr={list ? "Vue grille" : "Vue liste"}
              en={list ? "Grid view" : "List view"}
            />
          </button>
          <label className="e-sort">
            <span>
              <Copy fr="Trier par" en="Sort by" />
            </span>
            <select
              aria-label={
                lang === "fr" ? "Trier les produits" : "Sort products"
              }
              value={sort}
              onChange={(e) => change("sort", e.target.value)}
            >
              {[
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
        <div className="e-catalogue-comparison">
          <ComparisonLink />
          <span>
            <Copy
              fr="Choisissez jusqu’à trois articles d’une même famille."
              en="Choose up to three products from one category."
            />
          </span>
        </div>
        <div className="e-chips">
          {[
            ["search", query],
            ["category", cats.find((c) => c.id === category)?.nom || category],
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
                  aria-label={`${lang === "fr" ? "Effacer" : "Remove"} ${v}`}
                  onClick={() => change(k, "")}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
        </div>
        {query && <EquivalenceEntry query={query} />}
        <State {...resource} error={resource.error || parseError}>
          {result.rows.length ? (
            <div
              className={`e-product-grid e-catalog-grid ${list ? "e-list" : ""}`}
            >
              {result.rows.map((raw, index) => (
                <Card
                  eager={index === 0}
                  key={raw.id}
                  product={adaptProduct(raw, resolveImageUrl)}
                />
              ))}
            </div>
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
              <button className="e-btn" onClick={() => setParams({})}>
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
            <button
              disabled={page <= 1}
              onClick={() => change("page", String(page - 1))}
            >
              <Copy fr="Précédent" en="Previous" />
            </button>
            <span>
              {page} / {result.pages}
            </span>
            <button
              disabled={page >= result.pages}
              onClick={() => change("page", String(page + 1))}
            >
              <Copy fr="Suivant" en="Next" />
            </button>
          </nav>
        )}
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
