import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { Copy } from "./Elements";
export default function Footer() {
  const { lang, toggleLang } = useI18n();
  return (
    <footer className="e-footer">
      <div className="e-wrap">
        <div>
          <h2>X-Electronic</h2>
          <p>
            <Copy
              fr="La boutique électronique de NEWOTEG."
              en="The NEWOTEG electronics shop."
            />
          </p>
          <p>
            <Copy
              fr="Composants, câbles, pièces et accessoires."
              en="Components, cables, parts and accessories."
            />
          </p>
        </div>
        <div>
          <strong>
            <Copy fr="Retrouvez-nous à Douala" en="Find us in Douala" />
          </strong>
          <p>Akwa, Camp Yabassi</p>
          <Link to="/contact">
            <Copy
              fr="Conseil et informations boutique"
              en="Advice and shop information"
            />
          </Link>
        </div>
        <nav>
          <Link to="/catalogue">
            <Copy fr="Catalogue" en="Catalogue" />
          </Link>
          <Link to="/devis">
            <Copy fr="Demander un devis" en="Request a quote" />
          </Link>
          <Link to="/projets">
            <Copy fr="Projets et matériel" en="Projects and material" />
          </Link>
          <Link to="/arrivages">
            <Copy fr="Arrivages" en="Arrivals" />
          </Link>
          <Link to="/offres">
            <Copy fr="Offres" en="Offers" />
          </Link>
          <Link to="/about">
            <Copy fr="À propos" en="About" />
          </Link>
          <Link to="/livraison">
            <Copy fr="Livraison" en="Delivery" />
          </Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/suivi-invite">
            <Copy fr="Suivi sans compte" en="Guest order tracking" />
          </Link>
          <Link to="/terms">
            <Copy fr="Conditions" en="Terms" />
          </Link>
          <Link to="/privacy">
            <Copy fr="Confidentialité" en="Privacy" />
          </Link>
          <button onClick={toggleLang}>
            {lang === "fr" ? "English" : "Français"}
          </button>
        </nav>
        <small>© {new Date().getFullYear()} NEWOTEG · X-Electronic</small>
      </div>
    </footer>
  );
}
