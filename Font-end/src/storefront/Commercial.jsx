import { Link, useLocation } from "react-router-dom";
import PageMeta from "./PageMeta";
import { ArrowRight } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import useResource from "./useResource";
import { adaptProduct } from "./productData";
import { resolveImageUrl } from "../utils/mapProduct";
import { Card, Copy, Crumbs, State } from "./Elements";
import useOfferClock from "./useOfferClock";
import { readMerchandising } from "./offerData";
import Footer from "./Footer";
import "./commercial.css";
function useCommercial(mode) {
  const resource = useResource(
    "/produits/" + (mode === "offres" ? "flash" : "arrivages"),
  );
  const now = useOfferClock(resource.data);
  let rows = [],
    error = resource.error;
  try {
    if (resource.data)
      rows = readMerchandising(resource.data, mode).filter(raw => mode !== "offres" || Date.parse(raw.offre.fin) > now).map((raw) => ({
        ...adaptProduct(raw, resolveImageUrl),
        arrivalDate: raw.arrivageAt,
      }));
  } catch (e) {
    error = e;
  }
  return { ...resource, error, rows };
}
function CommercialRows({ rows, mode }) {
  const { lang } = useI18n();
  return (
    <div className="e-grid e-commercial-grid">
      {rows.map((product) => (
        <div key={product.id}>
          {mode === "arrivages" && (
            <p className="e-arrival-date">
              <Copy fr="Arrivage du " en="Arrival on " />
              <time dateTime={product.arrivalDate}>
                {new Intl.DateTimeFormat(lang === "fr" ? "fr-CM" : "en-CM", {
                  dateStyle: "medium",
                  timeZone: "Africa/Douala",
                }).format(new Date(product.arrivalDate))}
              </time>
            </p>
          )}
          <Card product={product} compare={false} />
        </div>
      ))}
    </div>
  );
}
function OfferTerms() {
  return (
    <p className="e-commercial-terms">
      <Copy
        fr="Prix détail par unité vendue. Le prix catalogue indiqué est le tarif courant hors offre, pas un ancien prix de vente. Pas de cumul automatique avec un tarif par quantité ou un devis négocié. Le montant est revérifié avant l’enregistrement de votre commande."
        en="Retail price per sold unit. The listed catalogue price is the current price outside the offer, not a historical selling price. No automatic combination with volume pricing or a negotiated quote. The amount is checked again before your order is recorded."
      />
    </p>
  );
}
export function CommercialTeaser({ mode }) {
  const resource = useCommercial(mode);
  if (resource.loading || resource.error || !resource.rows.length) return null;
  const offers = mode === "offres";
  return (
    <section
      className={
        "e-section e-commercial-teaser " +
        (offers ? "is-offers" : "is-arrivals")
      }
    >
      <div className="e-section-head">
        <div>
          <h2>
            <Copy
              fr={
                offers
                  ? "Les offres du moment"
                  : "Récemment arrivés en boutique"
              }
              en={offers ? "Current offers" : "Recently arrived at the shop"}
            />
          </h2>
          <p>
            <Copy
              fr={
                offers
                  ? "Des prix datés, pour les pièces disponibles."
                  : "Les dernières réceptions d’achat validées, avec du stock disponible."
              }
              en={
                offers
                  ? "Dated prices for available parts."
                  : "Recent validated purchase receipts with available stock."
              }
            />
          </p>
        </div>
        <Link to={"/" + mode}>
          <Copy
            fr={offers ? "Voir les offres" : "Voir les arrivages"}
            en={offers ? "View offers" : "View arrivals"}
          />
          <ArrowRight size={17} />
        </Link>
      </div>
      <CommercialRows rows={resource.rows.slice(0, 4)} mode={mode} />
      {offers && <OfferTerms />}
    </section>
  );
}
export default function Commercial() {
  const mode = useLocation().pathname === "/offres" ? "offres" : "arrivages";
  const offers = mode === "offres",
    resource = useCommercial(mode);
  return (
    <>
      <PageMeta />
      <div className="e-wrap e-commercial-page">
        <Crumbs
          title={
            <Copy
              fr={offers ? "Offres" : "Arrivages"}
              en={offers ? "Offers" : "Arrivals"}
            />
          }
        />
        <div className="e-page-lead">
          <h1>
            <Copy
              fr={offers ? "Les offres du moment" : "Les derniers arrivages"}
              en={offers ? "Current offers" : "Recent arrivals"}
            />
          </h1>
          <p>
            <Copy
              fr={
                offers
                  ? "Une sélection des offres actives sur les pièces disponibles. Retrouvez le prix, la référence exacte et la date de fin sur chaque fiche."
                  : "Une sélection des réceptions d’achat validées au cours des 30 derniers jours, pour les pièces encore disponibles."
              }
              en={
                offers
                  ? "A selection of active offers on available parts. Find the price, exact reference and end date on each product page."
                  : "A selection of validated purchase receipts from the last 30 days for parts still available."
              }
            />
          </p>
        </div>
        <State {...resource}>
          {resource.rows.length ? (
            <CommercialRows rows={resource.rows} mode={mode} />
          ) : (
            <div className="e-state">
              <h2>
                <Copy
                  fr={
                    offers
                      ? "Aucune offre active pour le moment"
                      : "Aucun arrivage disponible pour le moment"
                  }
                  en={
                    offers
                      ? "No active offers at the moment"
                      : "No available arrivals at the moment"
                  }
                />
              </h2>
              <p>
                <Copy
                  fr="Les autres références restent accessibles dans le catalogue."
                  en="Other products remain available in the catalogue."
                />
              </p>
            </div>
          )}
        </State>
        {!resource.loading && !resource.error && !resource.rows.length && (
          <p className="e-commercial-empty">
            <Copy
              fr="Vous cherchez une pièce précise ? "
              en="Looking for a specific part? "
            />
            <Link to="/catalogue">
              <Copy fr="Consulter le catalogue" en="Browse the catalogue" />
            </Link>{" "}
            ·{" "}
            <Link to="/contact">
              <Copy fr="Demander conseil" en="Ask for advice" />
            </Link>
          </p>
        )}
        {offers && <OfferTerms />}
      </div>
      <Footer />
    </>
  );
}
