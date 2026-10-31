import { ArrowRight } from 'lucide-react';
import { Link } from './LocaleRouter';
import { useI18n } from '../context/I18nContext';
import { Copy } from './Elements';
import { selectionGuides } from './editorialLinks.js';
import { editorialBasePath } from './editorialRoutes.js';
import { seoFamilies, familyPath } from './seoFamilies.js';
import './home-guides.css';

export default function HomeGuides() {
  const { lang } = useI18n();
  const guides = selectionGuides(lang);
  return <section className="e-section e-home-guides" aria-labelledby="home-guides-title">
    <div className="e-section-head"><div>
      <h2 id="home-guides-title"><Copy fr="Les repères pour choisir votre pièce" en="Know what to check before choosing a part" /></h2>
      <p><Copy fr="Des guides sourcés pour identifier une référence et préparer vos questions." en="Source-based guides to identify a reference and prepare your questions." /></p>
    </div><Link to="/guides"><Copy fr="Tous les guides" en="All guides" /><ArrowRight size={17} aria-hidden="true" /></Link></div>
    {guides.length > 0 && <ul className="e-home-guides-list">{guides.map(guide => <li key={guide.id}>
      <h3><Link to={editorialBasePath(guide)}>{guide.title}<ArrowRight size={17} aria-hidden="true" /></Link></h3>
      <p>{guide.summary}</p>
    </li>)}</ul>}
    <nav className="e-home-family-links" aria-label={lang === 'en' ? 'Browse reference families' : 'Explorer les familles de références'}>
      {seoFamilies.map(family => <Link key={family.slug} to={familyPath(family)}>{lang === 'en' ? family.en : family.fr}</Link>)}
    </nav>
  </section>;
}
