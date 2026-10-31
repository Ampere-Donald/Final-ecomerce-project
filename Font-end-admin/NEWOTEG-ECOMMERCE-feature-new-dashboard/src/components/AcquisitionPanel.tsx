import { useEffect, useState } from 'react';
import { loadAcquisition, type AcquisitionReport, type Channel } from '../services/acquisition';
import { type Period } from '../services/parcours';
const names: Record<Channel, string> = { RECHERCHE_NATURELLE: 'Recherche naturelle', CAMPAGNE_PAYANTE: 'Campagne payante', SOCIAL: 'Réseaux sociaux', SITE_REFERENT: 'Site référent', DIRECT_OU_INCONNU: 'Direct ou origine non identifiable' };
export default function AcquisitionPanel({ period }: { period: Period }) {
  const [state, setState] = useState<{ key: string; data?: AcquisitionReport; error?: boolean }>();
  const key = period.debut + ':' + period.fin;
  useEffect(() => {
    const controller = new AbortController();
    void loadAcquisition({ debut: period.debut, fin: period.fin }, controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ key, data });
    }).catch(() => { if (!controller.signal.aborted) setState({ key, error: true }); });
    return () => controller.abort();
  }, [key, period]);
  const current = state?.key === key ? state : undefined;
  return <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="acquisition-title">
    <h2 id="acquisition-title" className="font-display text-xl font-semibold">Origine déclarée des demandes et commandes</h2>
    <p className="mt-2 max-w-[75ch] text-sm leading-relaxed text-slate-600">Période choisie. La source est classée à l’arrivée sur le site ; un référent absent reste indéterminé. Les anciennes demandes sans information ne sont pas attribuées rétroactivement.</p>
    {current?.error ? <p role="status" className="mt-4 text-sm">Répartition indisponible. Les autres résultats restent consultables.</p> : !current?.data ? <p role="status" className="mt-4 text-sm">Chargement de la répartition…</p> : <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm"><caption className="sr-only">Demandes et commandes par origine, du {period.debut} au {period.fin}</caption>
        <thead><tr>{['Origine', 'Devis transmis', 'Commandes enregistrées', 'Dont reçues'].map(label => <th key={label} scope="col" className="px-3 py-3 text-left font-medium">{label}</th>)}</tr></thead>
        <tbody>{current.data.canaux.map(row => <tr key={row.canalEntree || 'unknown'} className="border-t border-slate-100"><th scope="row" className="px-3 py-3 text-left font-medium">{row.canalEntree ? names[row.canalEntree] : 'Origine non renseignée'}</th>{[row.devisDemandes, row.commandesEnregistrees, row.commandesRecues].map((n, i) => <td key={i} className="px-3 py-3 tabular-nums">{n.toLocaleString('fr-FR')}</td>)}</tr>)}</tbody>
      </table>
    </div>}
    <p className="mt-4 max-w-[75ch] text-xs leading-relaxed text-slate-500">Les devis peuvent ensuite devenir des commandes : ces colonnes ne s’additionnent pas en clients uniques. « Reçues » décrit l’état actuel des commandes créées dans la période, sans prouver un paiement. Les clics de conseil et WhatsApp ne sont pas comptés comme ventes.</p>
  </section>;
}
