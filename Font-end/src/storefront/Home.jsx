import EquivalenceEntry from "./EquivalenceEntry";
import { ProjectTeaser } from "./Projects";
import { CommercialTeaser } from './Commercial';
import { createElement } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Cable,
  Cpu,
  Wrench,
  Grid2X2,
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
    ["Câbles & connectique", "Cables & connectors", Cable, "câble"],
    ["Alimentation", "Power supplies", Cpu, "chargeur"],
    ["Composants", "Components", Cpu, "composant"],
    ["Outillage", "Tools", Wrench, "outillage"],
    ["Vidéo & adaptateurs", "Video & adapters", Grid2X2, "adaptateur"],
    ["Tout le catalogue", "All products", Grid2X2, ""],
  ];
  return (
    <>
      <Helmet>
        <title>X-Electronic — La boutique électronique de NEWOTEG</title>
        <meta
          name="description"
          content="Composants, câbles, alimentation et outillage à Douala. Trouvez votre référence ou demandez conseil à X-Electronic, la boutique de NEWOTEG."
        />
      </Helmet>
      <div className="e-wrap e-home">
        <section className="e-discovery">
          <div>
            <p className="e-location">
              <MapPin size={17} />
              <Copy
                fr="Votre boutique électronique à Douala"
                en="Your electronics shop in Douala"
              />
            </p>
            <h1>
              <Copy
                fr={
                  <>
                    Votre prochain projet
                    <br />
                    commence ici.
                  </>
                }
                en={
                  <>
                    Your next project
                    <br />
                    starts here.
                  </>
                }
              />
            </h1>
            <p className="e-intro">
              <Copy
                fr={
                  <>
                    Composants, câbles, alimentation et outillage.
                    <br />
                    Du premier branchement à votre prochain projet.
                  </>
                }
                en="Components, cables, power supplies and tools. From your first connection to your next project."
              />
            </p>
            <div className="e-actions">
              <Link className="e-btn e-gold" to="/catalogue">
                <Copy fr="Explorer le catalogue" en="Explore the catalogue" />
                <ArrowRight size={18} />
              </Link>
              <Link to="/contact">
                <Copy fr="Un conseil pour choisir ?" en="Need help choosing?" />
              </Link>
            </div>
          </div>
          <div className="e-photo-composition">
            <Link className="e-measure-scene" to="/catalogue?search=multimètre">
              <img
                src="/design-e/multimetre.webp"
                alt="Multimètre — visuel marketing"
                width="400"
                height="400"
              />
              <span>
                <Copy fr="Mesurer & vérifier" en="Measure & check" />
                <ArrowRight size={15} />
              </span>
            </Link>
            <Link className="e-cable-scene" to="/catalogue?search=HDMI">
              <img
                src="/design-e/hdmi-5m.webp"
                alt="Câble HDMI — visuel marketing"
                width="250"
                height="250"
              />
              <span>
                <Copy fr="Relier vos appareils" en="Connect your devices" />
              </span>
            </Link>
          </div>
        </section>
        <nav className="e-families">
          {families.map(([fr, en, Icon, q], i) => (
            <Link
              className={`e-family e-tone-${i}`}
              key={fr}
              to={"/catalogue" + (q ? "?search=" + encodeURIComponent(q) : "")}
            >
              <span>{createElement(Icon, { size: 23 })}</span>
              <Copy fr={fr} en={en} />
            </Link>
          ))}
        </nav>
        <EquivalenceEntry />
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
