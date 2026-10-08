import { createElement, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Search, MessageCircle, Truck } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { Copy } from "./ProductPrimitives";
import { State } from "./Elements";
import { homeCollections, collectionPaths, collectionLink, selectCollection, resolveCategory, categoryLabel } from "./merchandisingData";
import { publicCollectionGet } from "./publicCollectionCache";
import { resolveImageUrl } from "../utils/mapProduct";
import ProductCarousel from "./ProductCarousel";
import { readMerchandising } from "./offerData";
import { adaptProduct } from "./productData";
import useOfferClock from "./useOfferClock";
import ProjectTeaser from "./ProjectTeaser";
function Progressive({ children }) {
  const ref = useRef();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { const timer = setTimeout(() => setReady(true), 0); return () => clearTimeout(timer); }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setReady(true); observer.disconnect(); } }, { rootMargin: "350px" });
    observer.observe(ref.current); return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={ready ? "e-progressive is-ready" : "e-progressive"}>{ready ? children : <div className="e-collection-placeholder" aria-hidden="true" />}</div>;
}
function Collection({ config }) {
  const { lang } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ rows: [], loading: true, categories: [] });
  useEffect(() => {
    let active = true;
    publicCollectionGet("/categories").then(async categories => {
      const responses = await Promise.all(collectionPaths(config, categories).map(publicCollectionGet));
      const rows = selectCollection(responses, resolveImageUrl, config.max);
      if (active) setState({ rows, categories, loading: false });
    }).catch(error => { if (active) setState({ rows: [], categories: [], error, loading: false }); });
    return () => { active = false; };
  }, [config, attempt]);
  const title = config.title[lang === "fr" ? 0 : 1];
  if (!state.loading && !state.error && !state.rows.length) return null;
  return <section className="e-section e-merch-collection" data-collection={config.id} aria-labelledby={"collection-" + config.id}>
    <div className="e-section-head"><div><h2 id={"collection-" + config.id}>{title}</h2><p>{config.description[lang === "fr" ? 0 : 1]}</p></div><Link to={collectionLink(config, state.categories)}><Copy fr="Voir tous les produits" en="View all products" /><ArrowRight size={17} /></Link></div>
    <nav className="e-collection-families" aria-label={lang === "fr" ? "Familles du rayon" : "Shelf categories"}>{[...new Set(config.sources.map(s => s.category))].map(name => {
      const category = resolveCategory(state.categories, name);
      return category ? <Link key={name} to={"/catalogue?category=" + encodeURIComponent(category.id)}>{categoryLabel(name, lang)}</Link> : null;
    })}</nav>
    <State {...state} retry={() => { setState(previous => ({ ...previous, error: null, loading: true })); setAttempt(n => n+1); }}><ProductCarousel products={state.rows} label={title} /></State>
  </section>;
}
function CommercialCollection({ mode }) {
  const { lang } = useI18n();
  const [data, setData] = useState(null);
  const now = useOfferClock(data);
  useEffect(() => {
    let active = true;
    publicCollectionGet("/produits/" + (mode === "offres" ? "flash" : "arrivages")).then(data => {
      readMerchandising(data, mode);
      if (active) setData(data);
    }).catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, [mode]);
  const rows = (data || []).filter(p => mode !== "offres" || Date.parse(p.offre.fin) > now).map(p => ({ ...adaptProduct(p, resolveImageUrl), arrivalDate: p.arrivageAt }));
  if (!rows.length) return null;
  const title = mode === "offres" ? ["Offres du moment", "Current offers"] : ["Nouveaux arrivages", "New arrivals"];
  return <section className="e-section e-merch-collection e-commercial-teaser" data-collection={mode}>
    <div className="e-section-head"><div><h2>{title[lang === "fr" ? 0 : 1]}</h2><p><Copy fr={mode === "offres" ? "Des offres actives, à vérifier sur chaque fiche." : "Les dernières réceptions validées, disponibles en boutique."} en={mode === "offres" ? "Active offers. Check each product page for terms." : "Recent validated receipts, available at the shop."} /></p></div><Link to={"/" + mode}><Copy fr="Voir tous les produits" en="View all products" /><ArrowRight size={17} /></Link></div>
    <ProductCarousel products={rows} label={title[lang === "fr" ? 0 : 1]} arrival={mode === "arrivages"} />
  </section>;
}
export function MerchBanner({ workshop = false }) {
  const main = workshop ? "category-v2-tools" : "category-v2-components";
  const secondary = workshop ? "category-v2-power" : "equivalence-parts-v2";
  return <aside className={"e-merch-banner" + (workshop ? " is-workshop" : "")}>
    <div><h2><Copy fr={workshop ? "Équipez votre atelier" : "Tout pour vos montages et réparations électroniques"} en={workshop ? "Equip your workshop" : "Everything for your electronic circuits and repairs"} /></h2><p><Copy fr={workshop ? "Les bons outils pour mesurer, souder et assembler." : "Composants, cartes, alimentations et accessoires pour donner vie à vos projets."} en={workshop ? "The right tools to measure, solder and assemble." : "Components, boards, power supplies and accessories for your projects."} /></p><Link className="e-btn" to={"/catalogue?search=" + (workshop ? "outillage" : "composants")}><Copy fr={workshop ? "Découvrir l’outillage" : "Découvrir les composants"} en={workshop ? "Discover tools" : "Explore components"} /><ArrowRight size={18} /></Link></div>
    <div className="e-merch-banner-visual" aria-hidden="true">
      <img src={"/design-e/" + main + ".webp"} srcSet={`/design-e/${main}-144.webp 144w, /design-e/${main}.webp 288w`} sizes="(max-width: 760px) 45vw, 288px" width="288" height="288" alt="" loading="lazy" decoding="async" />
      <img src={"/design-e/" + secondary + ".webp"} srcSet={workshop ? `/design-e/${secondary}-144.webp 144w, /design-e/${secondary}.webp 288w` : `/design-e/${secondary}-240.webp 240w, /design-e/${secondary}.webp 480w`} sizes="(max-width: 760px) 32vw, 210px" width={workshop ? 288 : 480} height={workshop ? 288 : 160} alt="" loading="lazy" decoding="async" />
    </div>
  </aside>;
}
export function StoreReassurance() {
  return <section className="e-store-reassurance"><h2><Copy fr="Pourquoi acheter chez NEWOTEG ?" en="Why shop with NEWOTEG?" /></h2><div>{[
    [MessageCircle, "Conseil et assistance", "Advice and assistance", "Une référence ou un doute ? Parlons de votre besoin.", "A reference or a question? Tell us what you need.", "/contact"],
    [MapPin, "Retrait à Akwa, Douala", "Pickup in Akwa, Douala", "Faites confirmer la disponibilité avant votre déplacement.", "Confirm availability before travelling.", "/livraison"],
    [Truck, "Préparer votre livraison", "Plan your delivery", "Destination, disponibilité, frais et délai à confirmer.", "Destination, availability, fees and timing to be confirmed.", "/livraison"],
    [Search, "Chercher la bonne référence", "Find the right reference", "Comparez les caractéristiques et explorez les équivalents.", "Compare specifications and explore alternatives.", "/equivalences"],
  ].map(([Icon, fr, en, detailFr, detailEn, href]) => <Link key={fr} to={href}>{createElement(Icon, { size: 24, "aria-hidden": true })}<strong><Copy fr={fr} en={en} /></strong><span><Copy fr={detailFr} en={detailEn} /></span></Link>)}</div></section>;
}
export default function HomeMerchandising() {
  return <>
    <MerchBanner />
    {homeCollections.map((config,index) => <div key={config.id}>{index === 5 && <MerchBanner workshop />}<Progressive><Collection config={config} /></Progressive></div>)}
    <Progressive><CommercialCollection mode="arrivages" /><CommercialCollection mode="offres" /><ProjectTeaser /></Progressive>
    <StoreReassurance />
  </>;
}
