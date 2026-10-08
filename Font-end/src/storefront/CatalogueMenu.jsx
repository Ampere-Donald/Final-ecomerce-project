import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cable,
  Zap,
  Cpu,
  Wrench,
  Monitor,
  Grid2X2,
  Sparkles,
  Tag,
  ArrowLeftRight,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Copy } from "./Elements";
import useResource from "./useResource";
import { catalogueFamilies, categoryDestination } from "./catalogueNavigation";

const icons = {
  cables: Cable,
  power: Zap,
  components: Cpu,
  tools: Wrench,
  video: Monitor,
};
const quickLinks = [
  [
    "/arrivages",
    Sparkles,
    "Nouveautés",
    "New arrivals",
    "Découvrez les derniers arrivages.",
    "Discover the latest arrivals.",
  ],
  [
    "/offres",
    Tag,
    "Promotions",
    "Offers",
    "Consultez les offres actives.",
    "Explore current offers.",
  ],
  [
    "/equivalences",
    ArrowLeftRight,
    "Trouver un équivalent",
    "Find an equivalent",
    "Rechercher une pièce de remplacement.",
    "Find a replacement part.",
  ],
  [
    "/devis",
    FileText,
    "Demander un devis",
    "Request a quote",
    "Préparer une demande pour vos projets.",
    "Prepare a request for your projects.",
  ],
];

export default function CatalogueMenu({ onNavigate }) {
  const resource = useResource("/categories");
  const families = catalogueFamilies(resource.data);
  const [selected, setSelected] = useState("");
  const family = families.find((f) => f.key === selected) || families[0];
  const { lang } = useI18n();
  const label = (item) => (lang === "en" ? item.en : item.fr);
  return (
    <div className="e-catalogue-panel" id="header-catalogue-panel">
      <div
        className="e-catalogue-families"
        role="group"
        aria-label={lang === "en" ? "Product families" : "Familles de produits"}
      >
        {families.map((item) => {
          const Icon = icons[item.key] || Grid2X2;
          return (
            <button
              type="button"
              key={item.key}
              aria-pressed={family?.key === item.key}
              aria-controls="header-category-links"
              onMouseEnter={() => setSelected(item.key)}
              onFocus={() => setSelected(item.key)}
              onClick={() => setSelected(item.key)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label(item)}</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          );
        })}
        {resource.loading && (
          <p role="status">
            <Copy fr="Chargement des familles…" en="Loading categories…" />
          </p>
        )}
        {resource.error && (
          <div role="status">
            <p>
              <Copy
                fr="Les familles sont momentanément indisponibles."
                en="Categories are temporarily unavailable."
              />
            </p>
            <button type="button" onClick={resource.retry}>
              <Copy fr="Réessayer" en="Retry" />
            </button>
          </div>
        )}
      </div>
      <div className="e-catalogue-content" id="header-category-links">
        <h2>
          {family ? (
            label(family)
          ) : (
            <Copy fr="Notre catalogue" en="Our catalogue" />
          )}
        </h2>
        <p className="e-catalogue-intro">
          <Copy
            fr="Explorez les familles de notre catalogue."
            en="Explore our catalogue categories."
          />
        </p>
        <div className="e-catalogue-category-grid">
          {family?.categories.map((category) => (
            <Link
              key={category.id}
              to={categoryDestination(category.id)}
              onClick={onNavigate}
            >
              <strong>{category.nom}</strong>
              <span>
                {category.description ||
                  (lang === "en"
                    ? "See products in this category"
                    : "Voir les produits de cette famille")}
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </div>
        {!resource.loading && !resource.error && !families.length && (
          <p>
            <Copy
              fr="Retrouvez les articles dans le catalogue complet."
              en="Browse products in the full catalogue."
            />
          </p>
        )}
      </div>
      <nav
        className="e-catalogue-shortcuts"
        aria-label={lang === "en" ? "Quick access" : "Accès rapides"}
      >
        {quickLinks.map((item) => {
          const [url, Icon, fr, en, description, english] = item;
          return (
            <Link key={url} to={url} onClick={onNavigate}>
              <Icon size={19} aria-hidden="true" />
              <div>
                <strong>{lang === "en" ? en : fr}</strong>
                <small>{lang === "en" ? english : description}</small>
              </div>
            </Link>
          );
        })}
      </nav>
      <Link className="e-catalogue-all" to="/catalogue" onClick={onNavigate}>
        <div>
          <strong>
            <Copy fr="Voir tout le catalogue" en="See the full catalogue" />
          </strong>
          <small>
            <Copy
              fr="Accéder à l’ensemble de nos familles et produits."
              en="Browse all our categories and products."
            />
          </small>
        </div>
        <ArrowRight size={22} aria-hidden="true" />
      </Link>
    </div>
  );
}
