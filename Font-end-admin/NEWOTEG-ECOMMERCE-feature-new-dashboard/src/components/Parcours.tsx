import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { getAdminToken } from '../services/adminSession';
import {
  comparablePeriods,
  defaultPeriod,
  doualaToday,
  events,
  loadComparison,
  observationTotals,
  type Event,
  type Period,
  type Report,
} from '../services/parcours';

const names: Record<Event, string> = {
  RECHERCHE_VIDE: 'Recherches sans résultat',
  FICHE_OUVERTE: 'Fiches produit ouvertes',
  AJOUT_PANIER: 'Ajouts au panier appliqués',
  FRAIS_VUS: 'Conditions de réception vues',
  SORTIE_APRES_FRAIS: 'Sorties après conditions vues',
  REACHAT_AJOUTE: 'Réachats ajoutés au panier',
  WHATSAPP_OUVERT: 'Ouvertures de WhatsApp',
};
const receptions = {
  GENERAL: 'Général',
  RETRAIT: 'Retrait',
  LIVRAISON_A_CONFIRMER: 'Livraison à confirmer',
  LIVRAISON_CALCULEE: 'Livraison calculée',
};
const number = new Intl.NumberFormat('fr-FR');
const signed = (value: number) =>
  value > 0 ? `+${number.format(value)}` : value === 0 ? '0' : `−${number.format(-value)}`;
const date = (day: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(day + 'T12:00:00Z'));
const range = (period: Period) => `${date(period.debut)} au ${date(period.fin)}`;
type Comparison = Awaited<ReturnType<typeof loadComparison>>;
type Row = { name: string; description?: string; previous: number; selected: number };
function ComparisonTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <table className="block w-full text-sm sm:table sm:table-fixed">
      <caption className="sr-only">{title}</caption>
      <colgroup className="hidden sm:table-column-group">
        <col className="w-[49%]" />
        <col className="w-[17%]" />
        <col className="w-[17%]" />
        <col className="w-[17%]" />
      </colgroup>
      <thead className="block sm:table-header-group">
        <tr className="grid grid-cols-3 border-b border-slate-200 text-xs text-slate-500 sm:table-row">
          <th className="hidden px-4 py-3 text-left font-medium sm:table-cell">Indicateur</th>
          <th scope="col" className="px-2 py-3 text-right font-medium">
            Précédente
          </th>
          <th scope="col" className="px-2 py-3 text-right font-medium text-primary">
            Choisie
          </th>
          <th scope="col" className="px-4 py-3 text-right font-medium">
            Écart
          </th>
        </tr>
      </thead>
      <tbody className="block sm:table-row-group">
        {rows.map((row) => (
          <tr
            key={row.name}
            className="grid grid-cols-3 border-b border-slate-100 last:border-0 sm:table-row"
          >
            <th
              scope="row"
              className="col-span-3 px-4 pb-1 pt-4 text-left font-medium text-slate-900 sm:py-4"
            >
              {row.name}
              {row.description && (
                <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
                  {row.description}
                </span>
              )}
            </th>
            <td className="break-words px-2 py-4 text-right tabular-nums text-slate-600">
              {number.format(row.previous)}
            </td>
            <td className="break-words px-2 py-4 text-right font-semibold tabular-nums text-slate-900">
              {number.format(row.selected)}
            </td>
            <td className="break-words px-4 py-4 text-right tabular-nums text-slate-600">
              {signed(row.selected - row.previous)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Cohort({ report, label }: { report: Report; label: string }) {
  const cohort = report.cohorte;
  return (
    <div className="min-w-0 border-l-2 border-success pl-4">
      <h3 className="text-sm font-semibold">{label}</h3>
      <p className="mt-1 text-xs text-slate-500">Créées du {range(report)}</p>
      <p className="mt-3 text-lg font-semibold tabular-nums">
        {number.format(cohort.livrees + cohort.retirees)} reçues{' '}
        <span className="text-sm font-normal text-slate-500">
          sur {number.format(cohort.commandesEnregistrees)}
        </span>
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {number.format(cohort.livrees)} livrées, {number.format(cohort.retirees)} retirées.
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {cohort.tauxReception === null
          ? 'Taux indisponible : aucune commande créée.'
          : `${new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(cohort.tauxReception)} reçues à la lecture du rapport.`}
      </p>
    </div>
  );
}
function Details({ comparison }: { comparison: Comparison }) {
  const cells = new Map<
    string,
    {
      event: Event;
      langue: string;
      appareil: string;
      reception: keyof typeof receptions;
      previous: number;
      selected: number;
    }
  >();
  for (const side of ['previous', 'selected'] as const)
    for (const cell of comparison[side].observations) {
      const key = [cell.evenement, cell.langue, cell.appareil, cell.reception].join(':');
      const row = cells.get(key) || {
        event: cell.evenement,
        langue: cell.langue,
        appareil: cell.appareil,
        reception: cell.reception,
        previous: 0,
        selected: 0,
      };
      row[side] += cell.nombre;
      cells.set(key, row);
    }
  return (
    <details className="border-t border-slate-200 px-4 py-4">
      <summary className="cursor-pointer rounded text-sm font-semibold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        Détail par langue, écran et réception
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Sommes de chaque période. La largeur d’écran ne désigne pas un modèle de téléphone. Aucune
        recherche saisie ni donnée client.
      </p>
      {cells.size ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {[...cells.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, row]) => (
              <li key={key} className="py-3 text-sm">
                <p className="font-medium">{names[row.event]}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {row.langue === 'fr' ? 'Français' : 'Anglais'}, {row.appareil},{' '}
                  {receptions[row.reception]}
                </p>
                <p className="mt-2 tabular-nums">
                  Précédente : {number.format(row.previous)} ; choisie :{' '}
                  <strong>{number.format(row.selected)}</strong> ; écart :{' '}
                  {signed(row.selected - row.previous)}.
                </p>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-600">Aucune observation reçue pour ces périodes.</p>
      )}
    </details>
  );
}
function Results({ comparison }: { comparison: Comparison }) {
  const { previous, selected } = comparison;
  const businessRows: Row[] = [
    {
      name: 'Commandes web enregistrées',
      description: 'Créées pendant la période ; paiement non supposé.',
      previous: previous.activite.commandesEnregistrees,
      selected: selected.activite.commandesEnregistrees,
    },
    {
      name: 'Demandes de devis',
      description: 'Demandes reçues pendant la période.',
      previous: previous.activite.devisDemandes,
      selected: selected.activite.devisDemandes,
    },
    {
      name: 'Livraisons effectuées',
      description: 'Réceptions datées dans la période, même pour une commande plus ancienne.',
      previous: previous.activite.livraisonsPeriode,
      selected: selected.activite.livraisonsPeriode,
    },
    {
      name: 'Retraits effectués',
      previous: previous.activite.retraitsPeriode,
      selected: selected.activite.retraitsPeriode,
    },
  ];
  const before = observationTotals(previous),
    after = observationTotals(selected);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-2">
        <p className="text-sm">
          <span className="block text-xs text-slate-500">Période précédente</span>
          <strong className="mt-1 block">{range(previous)}</strong>
        </p>
        <p className="text-sm">
          <span className="block text-xs text-primary">Période choisie</span>
          <strong className="mt-1 block">{range(selected)}</strong>
        </p>
      </div>
      {(selected.jourEnCours || previous.jourEnCours) && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          La période inclut aujourd’hui à Douala. Cette journée est incomplète ; son écart ne se
          compare pas à une journée terminée.
        </p>
      )}
      <section
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-labelledby="business-title"
      >
        <div className="px-4 py-5 sm:px-6">
          <h2 id="business-title" className="font-display text-xl font-semibold">
            Résultats de la boutique
          </h2>
          <p className="mt-2 max-w-[75ch] text-sm leading-relaxed text-slate-600">
            Commandes et devis issus des enregistrements métier. Les mêmes commandes ne sont
            comptées qu’une fois.
          </p>
        </div>
        <ComparisonTable title="Comparaison des résultats métier" rows={businessRows} />
        <div className="border-t border-slate-200 px-4 py-5 text-xs leading-relaxed text-slate-500 sm:px-6">
          Commandes sans provenance web démontrable, exclues des résultats web :{' '}
          {number.format(previous.activite.commandesSansProvenance)} dans la précédente,{' '}
          {number.format(selected.activite.commandesSansProvenance)} dans la choisie.
        </div>
      </section>
      <section aria-labelledby="cohort-title">
        <h2 id="cohort-title" className="font-display text-lg font-semibold">
          Que sont devenues les commandes créées ?
        </h2>
        <p className="mt-2 max-w-[75ch] text-sm leading-relaxed text-slate-600">
          État actuel, qui peut évoluer après la période. Les commandes récentes ont eu moins de
          temps pour être reçues : ces taux ne prouvent pas une amélioration.
        </p>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <Cohort report={previous} label="Période précédente" />
          <Cohort report={selected} label="Période choisie" />
        </div>
      </section>
      <section
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-labelledby="observations-title"
      >
        <div className="px-4 py-5 sm:px-6">
          <h2 id="observations-title" className="font-display text-xl font-semibold">
            Actions observées sur le site
          </h2>
          <p className="mt-2 max-w-[75ch] text-sm leading-relaxed text-slate-600">
            {selected.actif && previous.actif
              ? 'Collecte actuellement activée.'
              : 'Collecte actuellement désactivée ou modifiée pendant la lecture.'}{' '}
            Les compteurs historiques restent lisibles. Leur couverture passée n’est pas établie ;
            zéro signifie aucune observation reçue.
          </p>
          <p className="mt-3 max-w-[75ch] text-xs leading-relaxed text-amber-900">
            Ces actions ne sont ni des visiteurs uniques ni un entonnoir de conversion. Coupures et
            blocages peuvent manquer des actions. Une ouverture de WhatsApp ne prouve pas un message
            ou une vente ; une sortie après les conditions ne prouve pas que les frais l’ont causée.
          </p>
        </div>
        <ComparisonTable
          title="Comparaison des observations anonymes"
          rows={events.map((event) => ({
            name: names[event],
            previous: before[event],
            selected: after[event],
          }))}
        />
        <Details comparison={comparison} />
      </section>
      <p className="border-l-2 border-amber-600 pl-4 text-sm leading-relaxed text-slate-600">
        <strong className="text-slate-900">
          Retours pour incompatibilité : non mesurables actuellement.
        </strong>{' '}
        Le registre dédié reste à intégrer. Les annulations et les avis négatifs ne sont pas comptés
        comme des retours.
      </p>
    </div>
  );
}
function ParcoursPanel() {
  const [draft, setDraft] = useState(defaultPeriod);
  const [request, setRequest] = useState({ period: defaultPeriod(), revision: 0 });
  const [state, setState] = useState<{ key: typeof request; result?: Comparison; error?: string }>({
    key: request,
  });
  const [validation, setValidation] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setState({ key: request });
    loadComparison(request.period, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ key: request, result });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            key: request,
            error:
              'Le rapport n’a pas pu être lu. Vérifiez la connexion et réessayez ; aucune valeur n’est remplacée par zéro.',
          });
      });
    return () => controller.abort();
  }, [request]);
  const current = state.key === request ? state : undefined;
  const dirty = draft.debut !== request.period.debut || draft.fin !== request.period.fin;
  function submit() {
    try {
      comparablePeriods(draft);
      setValidation('');
      setRequest({ period: { ...draft }, revision: request.revision + 1 });
    } catch {
      setValidation(
        'Choisissez de 1 à 90 jours valides, sans date future, avec une période précédente disponible.',
      );
    }
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-[#0B1636] sm:text-3xl">
          Parcours du site
        </h1>
        <p className="mt-2 max-w-[75ch] text-sm leading-relaxed text-slate-600">
          Comparer les améliorations du site aux commandes et réceptions réellement enregistrées,
          sur deux périodes de même durée.
        </p>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
          <label className="min-w-0 text-sm font-medium sm:w-44">
            Du
            <input
              type="date"
              required
              max={doualaToday()}
              value={draft.debut}
              onChange={(event) => {
                setDraft({ ...draft, debut: event.target.value });
                setValidation('');
              }}
              className="field mt-2 min-w-0"
            />
          </label>
          <label className="min-w-0 text-sm font-medium sm:w-44">
            Au
            <input
              type="date"
              required
              max={doualaToday()}
              value={draft.fin}
              onChange={(event) => {
                setDraft({ ...draft, fin: event.target.value });
                setValidation('');
              }}
              className="field mt-2 min-w-0"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white"
          >
            Comparer
          </button>
          <button
            type="button"
            onClick={() => {
              setValidation('');
              setRequest({ ...request, revision: request.revision + 1 });
            }}
            disabled={dirty || (!current?.result && !current?.error)}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold disabled:opacity-40"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Actualiser
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Fuseau de Douala. La période précédente a la même durée et se termine la veille du début
          choisi. Défaut : sept jours terminés.
        </p>
        {validation && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {validation}
          </p>
        )}
      </form>
      {dirty ? (
        <p role="status" className="text-sm text-slate-600">
          Dates modifiées. Cliquez sur Comparer pour lire ces périodes.
        </p>
      ) : current?.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {current.error}
        </p>
      ) : current?.result ? (
        <Results comparison={current.result} />
      ) : (
        <p role="status" className="text-sm text-slate-600">
          Lecture des deux périodes…
        </p>
      )}
    </div>
  );
}
export function Parcours() {
  const { admin } = useAdminAuth();
  if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.role))
    return <p role="alert">Ce rapport est réservé aux administrateurs.</p>;
  // Private aggregates never survive an account, role or current-session change.
  return <ParcoursPanel key={JSON.stringify([admin.id, admin.role, getAdminToken()])} />;
}
