import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { resolveImageUrl } from "../utils/mapProduct";
import { adaptProduct, resultPage } from "./productData";
import { Copy, Photo, Price, Stock } from "./Elements";
import { highlightParts, suggestionPath } from "./catalogueNavigation";

function Highlight({ text, query }) {
  return highlightParts(text, query).map((part, i) =>
    part.match ? <mark key={i}>{part.text}</mark> : part.text,
  );
}

export default function HeaderSearch({ initial = "", preserveInitialValue = false, onInteract }) {
  const [value, setValue] = useState(() => preserveInitialValue && typeof document !== 'undefined'
    ? document.getElementById('header-product-search')?.value || initial : initial);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [result, setResult] = useState({ query: "", rows: [], error: false });
  const root = useRef(null);
  const navigate = useNavigate();
  const { lang } = useI18n();
  const query = value.trim();
  const visible = open && query.length >= 2;
  const loading = result.query !== query;
  const rows = loading || result.error ? [] : result.rows;
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const destination = `/catalogue${query ? "?search=" + encodeURIComponent(query) : ""}`;

  useEffect(() => {
    if (query.length < 2 || !open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiClient
        .get(suggestionPath(query), { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted)
            setResult({
              query,
              rows: resultPage(data)
                .rows.slice(0, 6)
                .map((raw) => adaptProduct(raw, resolveImageUrl)),
              error: false,
            });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({ query, rows: [], error: true });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  useEffect(() => {
    const outside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  useEffect(() => {
    if (selected >= 0)
      document
        .getElementById(`header-product-${selected}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  function keyboard(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setSelected(-1);
    } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      onInteract();
      if (rows.length)
        setSelected((i) =>
          event.key === "ArrowDown"
            ? (i + 1) % rows.length
            : i <= 0
              ? rows.length - 1
              : i - 1,
        );
    } else if (event.key === "Enter" && visible && rows[selected]) {
      event.preventDefault();
      setOpen(false);
      navigate(`/product/${rows[selected].id}`);
    }
  }

  return (
    <div
      className="e-header-search"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <form
        className="e-search"
        role="search"
        action="/catalogue"
        method="get"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          setOpen(false);
          navigate(destination);
        }}
      >
        <Search aria-hidden="true" size={21} />
        <label className="e-sr" htmlFor="header-product-search">
          {tr(
            "Rechercher un produit ou une référence",
            "Search products or references",
          )}
        </label>
        <input
          id="header-product-search"
          name="search"
          type="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={255}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls="header-suggestions"
          aria-activedescendant={
            visible && rows[selected] ? `header-product-${selected}` : undefined
          }
          value={value}
          onFocus={() => {
            onInteract();
            setOpen(true);
          }}
          onChange={(event) => {
            setValue(event.target.value);
            setSelected(-1);
            setOpen(true);
            onInteract();
          }}
          onKeyDown={keyboard}
          placeholder={tr(
            "Un produit, une référence, un besoin…",
            "A product, a reference, a project…",
          )}
        />
        <button aria-label={tr("Rechercher", "Search")}>
          <span>
            <Copy fr="Rechercher" en="Search" />
          </span>
          <ArrowRight size={20} />
        </button>
      </form>
      {visible && (
        <div className="e-search-panel">
          <p className="e-search-feedback" role="status" aria-live="polite">
            {loading
              ? tr("Recherche en cours…", "Searching…")
              : result.error
                ? tr(
                    "Suggestions indisponibles. La recherche complète reste accessible.",
                    "Suggestions unavailable. You can still search the catalogue.",
                  )
                : rows.length
                  ? tr(
                      `${rows.length} suggestions`,
                      `${rows.length} suggestions`,
                    )
                  : tr(
                      "Aucun article correspondant. Essayez une autre référence.",
                      "No matching product. Try another reference.",
                    )}
          </p>
          <div
            role="listbox"
            id="header-suggestions"
            aria-label={tr("Suggestions de produits", "Product suggestions")}
            aria-busy={loading}
          >
            {rows.map((product, index) => (
              <Link
                key={product.id}
                id={`header-product-${index}`}
                role="option"
                aria-selected={selected === index}
                className="e-search-result"
                to={`/product/${product.id}`}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setSelected(index)}
              >
                <div className="e-search-photo">
                  <Photo product={product} thumbnail eager />
                </div>
                <div className="e-search-detail">
                  <strong>
                    <Highlight
                      text={
                        lang === "en"
                          ? product.englishName || product.model
                          : product.model
                      }
                      query={query}
                    />
                  </strong>
                  {product.reference && (
                    <small>
                      {tr("Réf. : ", "Ref: ")}
                      <Highlight text={product.reference} query={query} />
                    </small>
                  )}
                  <Stock product={product} />
                </div>
                <Price value={product.retailPrice} />
              </Link>
            ))}
          </div>
          <Link
            className="e-search-all"
            to={destination}
            onClick={() => setOpen(false)}
          >
            {tr(
              `Voir tous les résultats pour « ${query} »`,
              `See all results for “${query}”`,
            )}
            <ArrowRight size={17} />
          </Link>
          {!loading && !rows.length && (
            <Link
              className="e-search-advice"
              to="/contact"
              onClick={() => setOpen(false)}
            >
              <Copy fr="Demander conseil" en="Ask for advice" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
