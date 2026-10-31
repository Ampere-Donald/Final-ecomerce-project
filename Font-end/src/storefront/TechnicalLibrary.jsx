import { Link, useLocation } from 'react-router-dom';
import { Crumbs } from './Elements';
import Footer from './Footer';
import { seoFamilies, familyPath } from './seoFamilies.js';
import { publishedEditorial } from './publishedEditorial.generated.js';
import { editorialPath } from './editorialRoutes.js';
import './technical-library.css';

const formattedDate = date => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
function Sources({ entry, ids }) {
  return <p className="e-library-sources">Source{ids.length > 1 ? 's' : ''} : {ids.map((id, index) => {
    const source = entry.sources.find(item => item.id === id);
    return <span key={id}>{index > 0 && ' ; '}<a href={source.url} rel="noopener noreferrer" target="_blank">{source.label}</a> — {source.locator}</span>;
  })}</p>;
}
function Article({ entry }) {
  return <article className="e-library-article" aria-labelledby="library-title">
    <p className="e-library-kicker">{entry.type === 'guide' ? 'Guide de choix' : 'Dossier de remplacement'} · Français</p>
    <h1 id="library-title">{entry.title}</h1>
    <p className="e-library-intro">{entry.summary}</p>
    <p className="e-library-date">Révisé le <time dateTime={entry.reviewedAt}>{formattedDate(entry.reviewedAt)}</time></p>
    <nav className="e-library-toc" aria-label="Sommaire"><strong>Sommaire</strong><ol>{entry.sections.map(section =>
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
    <section className="e-library-limits" aria-labelledby="library-limits"><h2 id="library-limits">Portée et limites</h2>
      {entry.limits.map(limit => <p key={limit}>{limit}</p>)}<p>{entry.review.scope}</p>
    </section>
    {entry.replacement && <section className="e-library-section"><h2>Conditions du remplacement</h2>
      <p>{entry.replacement.context}</p><p>{entry.replacement.original} → {entry.replacement.candidate}</p>
      <h3>Différences</h3><ul>{entry.replacement.differences.map(value => <li key={value}>{value}</li>)}</ul>
      <h3>Conditions</h3><ul>{entry.replacement.conditions.map(value => <li key={value}>{value}</li>)}</ul>
      <p>{entry.replacement.conclusion}</p>
    </section>}
    {(entry.families.length > 0 || entry.products.length > 0) && <section className="e-library-section"><h2>Poursuivre dans le catalogue</h2>
      <ul>{entry.families.map(slug => { const family = seoFamilies.find(item => item.slug === slug); return <li key={slug}><Link to={familyPath(family)}>{family.fr}</Link></li>; })}
        {entry.products.map(product => <li key={product.id}><Link to={'/product/' + product.id}>{product.label}</Link></li>)}</ul>
      <p>Les prix et disponibilités sont à consulter sur les fiches du catalogue.</p>
    </section>}
    <section className="e-library-contact"><h2>Préparer votre demande</h2><p>Réunissez la référence complète, le modèle de l’appareil et les informations indiquées dans ce guide.</p>
      <div className="e-actions"><Link className="e-btn" to="/contact">Demander conseil</Link><Link to="/guides">Tous les guides</Link></div>
    </section>
  </article>;
}
export default function TechnicalLibrary() {
  const { pathname } = useLocation();
  const list = pathname === '/guides' || pathname === '/remplacement';
  const replacement = pathname === '/remplacement';
  const entry = publishedEditorial.find(item => editorialPath(item) === pathname);
  const entries = publishedEditorial.filter(item => item.type === (replacement ? 'replacement' : 'guide'));
  const title = list ? replacement ? 'Dossiers de remplacement' : 'Les bons repères pour choisir' : entry?.title || 'Page introuvable';
  return <><div className="e-wrap e-editorial e-library" lang="fr"><Crumbs title={title} />
    {list ? <><header className="e-library-header"><p className="e-library-kicker">Bibliothèque technique · Français</p><h1>{title}</h1>
      <p className="e-library-intro">{replacement ? 'Chaque dossier publié précise son contexte, ses preuves et les conditions de sa conclusion.'
        : 'Identifiez votre référence, comparez les critères utiles et préparez votre demande avec des sources vérifiables.'}</p></header>
      {entries.length ? <div className="e-library-grid">{entries.map(item => <article key={item.id} className="e-library-card">
        <p className="e-library-kicker">{item.type === 'guide' ? 'Guide de choix' : 'Dossier technique'}</p>
        <h2><Link to={editorialPath(item)}>{item.title}</Link></h2><p>{item.summary}</p>
        <Link className="e-library-read" to={editorialPath(item)}>{item.type === 'guide' ? 'Lire le guide' : 'Lire le dossier'} <span aria-hidden="true">→</span></Link>
      </article>)}</div> : <section className="e-library-contact"><h2>Aucun dossier publié pour le moment</h2><p>Une ressemblance ou une valeur nominale commune ne suffit pas à valider un remplacement.</p><Link className="e-btn" to="/equivalences">Consulter l’outil de recherche</Link></section>}
      <div className="e-library-links"><Link to={replacement ? '/guides' : '/remplacement'}>{replacement ? 'Voir les guides de choix' : 'Voir les dossiers de remplacement'}</Link><Link to="/contact">Demander conseil à la boutique</Link></div>
    </> : entry ? <Article entry={entry} /> : <section><h1>Page introuvable</h1><p>Ce contenu n’est pas disponible.</p><Link className="e-btn" to="/guides">Consulter les guides publiés</Link></section>}
  </div><Footer /></>;
}
