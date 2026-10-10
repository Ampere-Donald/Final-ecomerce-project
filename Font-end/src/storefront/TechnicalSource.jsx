import { useI18n } from '../context/I18nContext';
import { readTechnicalSource } from './technicalProvenance.js';
import './technical-source.css';

const labels = {
  A_VERIFIER: ['À vérifier', 'To be reviewed'], INCONNU: ['Inconnu', 'Unknown'],
  DOCUMENTE: ['Documenté après relecture', 'Documented after review'],
  CONTRADICTOIRE: ['Sources contradictoires', 'Conflicting sources'], NON_APPLICABLE: ['Non applicable', 'Not applicable'],
};
export default function TechnicalSource({ source }) {
  const { lang } = useI18n();
  const en = lang === 'en', d = readTechnicalSource(source);
  const label = labels[d.etat][en ? 1 : 0];
  const details = ['sourceUrl', 'sourceDocument', 'sourceRepere', 'sourceRevision', 'conditions', 'motif', 'uniteSource', 'reluLe'].some(key => d[key]) || (d.valeurNormalisee && d.uniteNormalisee);
  if (!details) return <small className={`e-technical-state e-technical-${d.etat.toLowerCase()}`}>{label}{d.obsolete ? (en ? ' · review needs renewing' : ' · relecture à renouveler') : ''}</small>;
  const rows = [
    [en ? 'Document' : 'Document', d.sourceDocument],
    [en ? 'Page / section' : 'Page / section', d.sourceRepere],
    [en ? 'Revision' : 'Révision', d.sourceRevision],
    [en ? 'Source unit' : 'Unité d’origine', d.uniteSource],
    [en ? 'Normalized value' : 'Valeur normalisée', d.valeurNormalisee && d.uniteNormalisee ? `${d.valeurNormalisee} ${d.uniteNormalisee}` : null],
    [en ? 'Conditions' : 'Conditions', d.conditions],
    [en ? 'Decision note' : 'Note de décision', d.motif],
    [en ? 'Reviewed on' : 'Relu le', d.reluLe ? new Date(d.reluLe).toLocaleDateString(en ? 'en-GB' : 'fr-FR') : null],
  ].filter(([, value]) => value);
  return <details className={`e-technical-source e-technical-${d.etat.toLowerCase()}`}>
    <summary>{label}<span>{en ? 'Source details' : 'Consulter la source'}</span></summary>
    <div className="e-technical-content">
      {rows.length > 0 && <ul>{rows.map(([key, value]) => <li key={key}><strong>{key} : </strong>{value}</li>)}</ul>}
      {d.sourceUrl && <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">{en ? 'Open source document' : 'Ouvrir le document source'}</a>}
      <p>{en ? 'Reviewing a source does not guarantee this part is a suitable replacement. Check the requirements of your circuit.' : 'La relecture d’une source ne garantit pas une équivalence. Vérifiez les exigences de votre montage.'}</p>
    </div>
  </details>;
}
