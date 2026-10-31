import { Link, useLocation } from './LocaleRouter';
import { useI18n } from '../context/I18nContext';
import { preparedEnglishGuides } from './guidesEnglish.generated.js';
import { Crumbs } from './Elements';
import Footer from './Footer';
import { seoFamilies, familyPath } from './seoFamilies.js';
import { publishedEditorial } from './publishedEditorial.generated.js';
import { editorialBasePath as editorialPath } from './editorialRoutes.js';
import './technical-library.css';

const englishLabels = {
  "Guide de choix": "Selection guide",
  "Dossier de remplacement": "Replacement case",
  "Dossier technique": "Technical case",
  "Français": "English",
  "Révisé le": "Reviewed on",
  "Sommaire": "Contents",
  "Portée et limites": "Scope and limitations",
  "Conditions du remplacement": "Replacement conditions",
  "Différences": "Differences",
  "Conditions": "Conditions",
  "Poursuivre dans le catalogue": "Continue in the catalogue",
  "Les prix et disponibilités sont à consulter sur les fiches du catalogue.": "Check prices and availability on catalogue product pages.",
  "Préparer votre demande": "Prepare your enquiry",
  "Réunissez la référence complète, le modèle de l’appareil et les informations indiquées dans ce guide.": "Gather the full reference, equipment model and information listed in this guide.",
  "Demander conseil": "Ask for advice",
  "Tous les guides": "All guides",
  "Dossiers de remplacement": "Replacement cases",
  "Les bons repères pour choisir": "Know what to check before choosing",
  "Page introuvable": "Page not found",
  "Bibliothèque technique · Français": "Technical library · English",
  "Chaque dossier publié précise son contexte, ses preuves et les conditions de sa conclusion.": "Each published case states its context, evidence and the conditions of its conclusion.",
  "Identifiez votre référence, comparez les critères utiles et préparez votre demande avec des sources vérifiables.": "Identify your reference, compare relevant criteria and prepare your enquiry using verifiable sources.",
  "Lire le guide": "Read the guide",
  "Lire le dossier": "Read the case",
  "Aucun dossier publié pour le moment": "No cases published yet",
  "Une ressemblance ou une valeur nominale commune ne suffit pas à valider un remplacement.": "A similar appearance or shared nominal rating does not establish a valid replacement.",
  "Consulter l’outil de recherche": "Use the search tool",
  "Voir les guides de choix": "See selection guides",
  "Voir les dossiers de remplacement": "See replacement cases",
  "Demander conseil à la boutique": "Ask the shop for advice",
  "Ce contenu n’est pas disponible.": "This content is unavailable.",
  "Consulter les guides publiés": "Browse published guides"
};
const libraryText = (value, lang) => lang === 'en' ? englishLabels[value] || value : value;
const formattedDate = (date, lang) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
function Sources({ entry, ids }) {
  return <p className="e-library-sources">Source{ids.length > 1 ? 's' : ''} : {ids.map((id, index) => {
    const source = entry.sources.find(item => item.id === id);
    return <span key={id}>{index > 0 && ' ; '}<a href={source.url} rel="noopener noreferrer" target="_blank">{source.label}</a> — {source.locator}</span>;
  })}</p>;
}
function Article({ entry }) {
  const { lang } = useI18n();
  const copy = value => libraryText(value, lang);
  return <article className="e-library-article" aria-labelledby="library-title">
    <p className="e-library-kicker">{copy(entry.type === 'guide' ? 'Guide de choix' : 'Dossier de remplacement')} · {lang === 'en' ? 'English' : 'Français'}</p>
    <h1 id="library-title">{entry.title}</h1>
    <p className="e-library-intro">{entry.summary}</p>
    <p className="e-library-date">{copy('Révisé le')} <time dateTime={entry.reviewedAt}>{formattedDate(entry.reviewedAt, lang)}</time></p>
    <nav className="e-library-toc" aria-label={copy('Sommaire')}><strong>{copy('Sommaire')}</strong><ol>{entry.sections.map(section =>
      <li key={section.id}><a href={'#' + section.id}>{section.title}</a></li>)}</ol></nav>
    {entry.sections.map(section => <section key={section.id} id={section.id} className="e-library-section">
      <h2>{section.title}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {section.bullets.length > 0 && <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul>}
      {section.table && <div className="e-library-table-scroll" role="region" aria-label={section.table.caption} tabIndex={0}><table>
        <caption>{section.table.caption}</caption><thead><tr>{section.table.headers.map(header => <th key={header} scope="col">{header}</th>)}</tr></thead>
        <tbody>{section.table.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => column === 0
          ? <th key={column} scope="row">{cell}</th> : <td key={column}>{cell}</td>)}</tr>)}</tbody>
      </table></div>}
      {section.sources.length > 0 && <Sources entry={entry} ids={section.sources} />}
    </section>)}
    <section className="e-library-limits" aria-labelledby="library-limits"><h2 id="library-limits">{copy('Portée et limites')}</h2>
      {entry.limits.map(limit => <p key={limit}>{limit}</p>)}<p>{entry.review.scope}</p>
    </section>
    {entry.replacement && <section className="e-library-section"><h2>{copy('Conditions du remplacement')}</h2>
      <p>{entry.replacement.context}</p><p>{entry.replacement.original} → {entry.replacement.candidate}</p>
      <h3>{copy('Différences')}</h3><ul>{entry.replacement.differences.map(value => <li key={value}>{value}</li>)}</ul>
      <h3>{copy('Conditions')}</h3><ul>{entry.replacement.conditions.map(value => <li key={value}>{value}</li>)}</ul>
      <p>{entry.replacement.conclusion}</p>
    </section>}
    {(entry.families.length > 0 || entry.products.length > 0) && <section className="e-library-section"><h2>{copy('Poursuivre dans le catalogue')}</h2>
      <ul>{entry.families.map(slug => { const family = seoFamilies.find(item => item.slug === slug); return <li key={slug}><Link to={familyPath(family)}>{lang === 'en' ? family.en : family.fr}</Link></li>; })}
        {entry.products.map(product => <li key={product.id}><Link to={'/product/' + product.id}>{product.label}</Link></li>)}</ul>
      <p>{copy('Les prix et disponibilités sont à consulter sur les fiches du catalogue.')}</p>
    </section>}
    <section className="e-library-contact"><h2>{copy('Préparer votre demande')}</h2><p>{copy('Réunissez la référence complète, le modèle de l’appareil et les informations indiquées dans ce guide.')}</p>
      <div className="e-actions"><Link className="e-btn" to="/contact">{copy('Demander conseil')}</Link><Link to="/guides">{copy('Tous les guides')}</Link></div>
    </section>
  </article>;
}
export default function TechnicalLibrary() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const copy = value => libraryText(value, lang);
  const published = lang === 'en' ? preparedEnglishGuides : publishedEditorial;
  const list = pathname === '/guides' || pathname === '/remplacement';
  const replacement = pathname === '/remplacement';
  const entry = published.find(item => editorialPath(item) === pathname);
  const entries = published.filter(item => item.type === (replacement ? 'replacement' : 'guide'));
  const title = list ? copy(replacement ? 'Dossiers de remplacement' : 'Les bons repères pour choisir') : entry?.title || copy('Page introuvable');
  return <><div className="e-wrap e-editorial e-library" lang={lang}><Crumbs title={title} />
    {list ? <><header className="e-library-header"><p className="e-library-kicker">{copy('Bibliothèque technique · Français')}</p><h1>{title}</h1>
      <p className="e-library-intro">{copy(replacement ? 'Chaque dossier publié précise son contexte, ses preuves et les conditions de sa conclusion.'
        : 'Identifiez votre référence, comparez les critères utiles et préparez votre demande avec des sources vérifiables.')}</p></header>
      {entries.length ? <div className="e-library-grid">{entries.map(item => <article key={item.id} className="e-library-card">
        <p className="e-library-kicker">{copy(item.type === 'guide' ? 'Guide de choix' : 'Dossier technique')}</p>
        <h2><Link to={editorialPath(item)}>{item.title}</Link></h2><p>{item.summary}</p>
        <Link className="e-library-read" to={editorialPath(item)}>{copy(item.type === 'guide' ? 'Lire le guide' : 'Lire le dossier')} <span aria-hidden="true">→</span></Link>
      </article>)}</div> : <section className="e-library-contact"><h2>{copy('Aucun dossier publié pour le moment')}</h2><p>{copy('Une ressemblance ou une valeur nominale commune ne suffit pas à valider un remplacement.')}</p><Link className="e-btn" to="/equivalences">{copy('Consulter l’outil de recherche')}</Link></section>}
      <div className="e-library-links"><Link to={replacement ? '/guides' : '/remplacement'}>{copy(replacement ? 'Voir les guides de choix' : 'Voir les dossiers de remplacement')}</Link><Link to="/contact">{copy('Demander conseil à la boutique')}</Link></div>
    </> : entry ? <Article entry={entry} /> : <section><h1>{copy('Page introuvable')}</h1><p>{copy('Ce contenu n’est pas disponible.')}</p><Link className="e-btn" to="/guides">{copy('Consulter les guides publiés')}</Link></section>}
  </div><Footer /></>;
}
