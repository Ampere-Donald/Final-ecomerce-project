import { Link } from "./LocaleRouter";
import LanguageLink from './LanguageLink';
import { Copy } from "./Elements";
import MotionToggle from './MotionToggle';
export default function Footer() {
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
          <Link to="/guides"><Copy fr="Guides de choix" en="Selection guides" /></Link>
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
          <LanguageLink />
          <MotionToggle />
        </nav>
        <small>© {new Date().getFullYear()} NEWOTEG · X-Electronic</small>
      </div>
    </footer>
  );
}
