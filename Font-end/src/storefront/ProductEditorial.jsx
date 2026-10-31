import { Link } from './LocaleRouter';
import { useI18n } from '../context/I18nContext';
import { getProductEditorial } from './productEditorial.js';

export default function ProductEditorial({ product }) {
  const { lang } = useI18n();
  const entry = getProductEditorial(product, lang);
  if (!entry) return null;
  const copy = entry[lang];
  return <section className="e-product-editorial" aria-labelledby="product-editorial-title">
    <h2 id="product-editorial-title">{copy.title}</h2>
    <p>{copy.summary}</p>
    <h3>{lang === 'en' ? 'Before choosing' : 'Avant de choisir'}</h3>
    <ul>{copy.checks.map(text => <li key={text}>{text}</li>)}</ul>
    <details>
      <summary>{lang === 'en' ? 'Sources and review' : 'Sources et relecture'}</summary>
      <ul>{copy.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul>
      <p>{lang === 'en' ? 'Reviewed on ' : 'Relu le '}<time dateTime={entry.reviewedAt}>{entry.reviewedAt.split('-').reverse().join('/')}</time>. {lang === 'en' ? 'Reference documents describe the documented version; photographs show the photographed item.' : 'Les documents décrivent leur version de référence ; les photographies montrent les exemplaires photographiés.'}</p>
    </details>
    <p className="e-note">{lang === 'en' ? 'Need help comparing with your part? ' : 'Besoin de comparer avec votre pièce ? '}<Link to="/contact">{lang === 'en' ? 'Contact the shop with the full reference.' : 'Contactez la boutique avec la référence complète.'}</Link></p>
  </section>;
}
