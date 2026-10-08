import EquivalenceEntry from "./EquivalenceEntry";
import ProjectTeaser from "./ProjectTeaser";
import { CommercialTeaser } from './Commercial';
import "./home-hero.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "./PageMeta";
import {
  ArrowRight,
  MapPin,
  MessageCircle,
  Truck,
} from "lucide-react";
import useResource from "./useResource";
import { adaptProduct, resultPage } from "./productData";
import { resolveImageUrl } from "../utils/mapProduct";
import { Copy, Card, State } from "./Elements";
import Footer from "./Footer";

export default function Home() {
  const [project, setProject] = useState("");
  const resource = useResource(
    "/produits?limit=5&inStock=true" +
      (project ? "&search=" + encodeURIComponent(project) : ""),
  );
  let rows = [],
    parseError = null;
  try {
    if (resource.data)
      rows = resultPage(resource.data).rows.map((p) =>
        adaptProduct(p, resolveImageUrl),
      );
  } catch (e) {
    parseError = e;
  }
  const families = [
    ["Câbles & connectique", "Cables & connectors", "/design-e/category-v2-cables.webp", "câble", "Fils, câbles et connecteurs", "Wires, cables and connectors"],
    ["Alimentation", "Power supplies", "/design-e/category-v2-power.webp", "alimentation", "Modules et chargeurs", "Modules and chargers"],
    ["Composants", "Components", "/design-e/category-v2-components.webp", "composant", "Condensateurs, relais et circuits", "Capacitors, relays and circuits"],
    ["Outillage", "Tools", "/design-e/category-v2-tools.webp", "outillage", "Mesure et réparation", "Measurement and repair"],
    ["Vidéo & adaptateurs", "Video & adapters", "/design-e/category-v2-video.webp", "adaptateur", "HDMI, VGA et conversion", "HDMI, VGA and conversion"],
    ["Tout le catalogue", "All products", "/design-e/category-v2-catalogue.webp", "", "Toutes nos catégories", "Browse every category"],
  ];
  return (
    <>
      <PageMeta />
      <div className="e-wrap e-home">
        <section className="e-commerce-hero" aria-labelledby="home-hero-title">
          <img className="e-hero-scene" src="/design-e/hero-scene-v2-1440.webp" srcSet="/design-e/hero-scene-v2-1440.webp 1440w, /design-e/hero-scene-v2-2160.webp 2160w" sizes="100vw" width="2160" height="720" fetchPriority="high" alt="Atelier électronique : alimentation, multimètre, câbles et composants" />
          <div className="e-hero-copy">
            <p className="e-hero-location"><MapPin size={16} aria-hidden="true" /><Copy fr="Votre boutique électronique à Douala · Akwa" en="Your electronics shop in Douala · Akwa" /></p>
            <h1 id="home-hero-title"><Copy fr={<>Tout l’essentiel pour vos <span>réparations et projets électroniques.</span></>} en={<>Everything for your <span>electronics repairs and projects.</span></>} /></h1>
            <p className="e-hero-description"><Copy fr="Composants, câbles, alimentation et outillage. Pour les techniciens, les passionnés et les professionnels, avec le conseil pour bien choisir." en="Components, cables, power supplies and tools. For technicians, enthusiasts and professionals, with advice to help you choose." /></p>
            <div className="e-hero-actions">
              <Link className="e-btn" to="/catalogue"><Copy fr="Explorer le catalogue" en="Explore the catalogue" /><ArrowRight size={18} /></Link>
              <Link className="e-btn e-secondary" to="/equivalences"><Copy fr="Trouver un équivalent" en="Find an equivalent" /><ArrowRight size={18} /></Link>
            </div>
            <Link className="e-hero-advice" to="/contact"><MessageCircle size={17} /><Copy fr="Un doute sur une pièce ? Demandez conseil" en="Unsure about a part? Ask for advice" /></Link>
          </div>
          <div className="e-hero-products">

            <Link className="e-hero-float e-hero-float-power" to="/catalogue?search=alimentation"><img src="/design-e/category-v2-power.webp" width="72" height="72" alt="" /><div><strong><Copy fr="Alimentation" en="Power supplies" /></strong><span><Copy fr="Modules et chargeurs" en="Modules and chargers" /><ArrowRight size={16} /></span></div></Link>
            <Link className="e-hero-float e-hero-float-cables" to="/catalogue?search=câble"><img src="/design-e/hero-wire-v2.webp" width="72" height="72" alt="" /><div><strong><Copy fr="Câbles & connectique" en="Cables & connectors" /></strong><span><Copy fr="Voir la sélection" en="Explore the selection" /><ArrowRight size={16} /></span></div></Link>
          </div>
        </section>
        <nav className="e-visual-families" aria-label="Catégories / Categories">
          {families.map(([fr, en, image, q, detailFr, detailEn]) => (
            <Link className="e-visual-family" key={fr} to={"/catalogue" + (q ? "?search=" + encodeURIComponent(q) : "")}>
              <img src={image} alt="" width="72" height="72" loading="lazy" />
              <span><strong><Copy fr={fr} en={en} /></strong><small><Copy fr={detailFr} en={detailEn} /></small></span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <EquivalenceEntry illustrated />
        <section className="e-section">
          <div className="e-section-head">
            <div>
              <h2>
                <Copy
                  fr="Pour vos prochains projets"
                  en="For your next projects"
                />
              </h2>
              <p>
                <Copy
                  fr="Les bons accessoires pour passer à la pratique."
                  en="Find the right accessories to get started."
                />
              </p>
            </div>
            <Link to="/catalogue">
              <Copy fr="Tout le catalogue" en="All products" />{" "}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="e-tabs">
            {[
              ["", "Tous", "All"],
              ["câble", "Connecter", "Connect"],
              ["chargeur", "Alimenter", "Power"],
              ["outillage", "Mesurer & assembler", "Measure & assemble"],
            ].map(([value, fr, en]) => (
              <button
                key={value}
                aria-pressed={project === value}
                onClick={() => setProject(value)}
              >
                <Copy fr={fr} en={en} />
              </button>
            ))}
          </div>
          <State {...resource} error={resource.error || parseError}>
            {rows.length ? (
              <div className="e-product-grid e-project-grid">
                {rows.map((p) => (
                  <Card key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <p className="e-note">
                <Copy
                  fr="Aucune référence disponible dans cette sélection. Consultez le catalogue ou demandez conseil."
                  en="No products available in this selection. Browse the catalogue or ask us for advice."
                />
              </p>
            )}
          </State>
        </section>
        <ProjectTeaser />
        <CommercialTeaser mode="arrivages" />
        <CommercialTeaser mode="offres" />
        <section className="e-advice-ribbon">
          <MessageCircle size={30} />
          <div>
            <h2>
              <Copy
                fr="Le bon conseil, avant le bon branchement."
                en="The right advice before you connect."
              />
            </h2>
            <p>
              <Copy
                fr="Une référence, une photo ou un doute : nous vous aidons à choisir."
                en="A reference, a photo or a question: we help you choose."
              />
            </p>
          </div>
          <Link className="e-btn e-secondary" to="/contact">
            <Copy fr="Demander conseil" en="Ask for advice" />
          </Link>
        </section>
        <section className="e-local">
          <img
            src="/images/7.jpeg"
            alt="Boutique NEWOTEG à Douala"
            width="150"
            height="136"
            loading="lazy"
          />
          <div>
            <h2>
              <Copy fr="À vos côtés, à Akwa." en="Here for you in Akwa." />
            </h2>
            <p>
              <Copy
                fr="Retrouvez la boutique à Camp Yabassi, Douala. Faites confirmer la disponibilité avant votre déplacement."
                en="Visit our shop in Camp Yabassi, Douala. Confirm availability before travelling."
              />
            </p>
          </div>
          <div className="e-delivery">
            <Truck />
            <strong>
              <Copy fr="Livraison et retrait" en="Delivery and pickup" />
            </strong>
            <Link to="/livraison">
              <Copy fr="Préparer ma réception" en="Plan delivery or pickup" />
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
