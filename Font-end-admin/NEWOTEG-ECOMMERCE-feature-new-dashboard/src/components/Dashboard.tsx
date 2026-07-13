import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Wallet,
  Landmark,
  Globe,
  Receipt,
  AlarmClock,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Lock,
  PackageX,
  BarChart3,
  HandCoins,
  CloudOff,
  Printer,
  PlayCircle,
  ShoppingBag,
} from 'lucide-react';
import {
  caisseApi,
  caisseJourApi,
  commandeApi,
  ticketApi,
  echeanceApi,
  produitApi,
  clientApi,
  bonVenteApi,
} from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';
import { listQueuedSales, OFFLINE_QUEUE_EVENT } from '../services/offlineSalesQueue';

const fmtFCFA = (n: number | string | null | undefined): string => {
  const v = typeof n === 'string' ? parseFloat(n) : n ?? 0;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
    .format(v || 0)
    .replace(/\s/g, ' ') + ' FCFA';
};

const fmtDateCourt = (d: string | Date): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d));

const daysUntil = (d: string | Date): number => {
  const target = new Date(d);
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const n = new Date();
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  return Math.round((t - today) / 86_400_000);
};

interface Kpi {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  to?: string;
  color: string;
}

interface UrgentAction {
  id: string;
  icon: any;
  label: string;
  detail?: string;
  to: string;
  severity: 'rouge' | 'orange' | 'jaune';
}

const sevClasses: Record<UrgentAction['severity'], string> = {
  rouge: 'bg-red-50 text-red-700 border-red-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  jaune: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const Dashboard = () => {
  const { admin } = useAdminAuth();
  const role = admin?.role;
  const peutAnalyses = can.accessAnalyses(role);
  const isAdminRole = ['SUPER_ADMIN', 'ADMIN'].includes(role || '');

  const [soldeCaisseJour, setSoldeCaisseJour] = useState<number | null>(null);
  const [caisseJourStatut, setCaisseJourStatut] = useState<'OUVERTE' | 'FERMEE' | 'ABSENTE' | 'INCONNUE'>('INCONNUE');
  const [soldeGlobale, setSoldeGlobale] = useState<number | null>(null);
  const [nbCommandesEnAttente, setNbCommandesEnAttente] = useState<number | null>(null);
  const [commandesAnciennes, setCommandesAnciennes] = useState(0);
  const [nbTicketsAttente, setNbTicketsAttente] = useState<number | null>(null);
  const [echeancesUrgentes, setEcheancesUrgentes] = useState<any[]>([]);
  const [echeances7j, setEcheances7j] = useState<any[]>([]);
  const [produitsRupture, setProduitsRupture] = useState(0);
  const [encoursTotal, setEncoursTotal] = useState<number | null>(null);
  const [topDebiteurs, setTopDebiteurs] = useState<any[]>([]);
  const [operationsHorsLigne, setOperationsHorsLigne] = useState(0);
  const [imprimanteDisponible, setImprimanteDisponible] = useState<boolean | null>(null);
  const [bonsVendeurAttente, setBonsVendeurAttente] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const charger = async () => {
      if (role === 'VENDEUR') {
        const bons = await bonVenteApi.mesBons().catch(() => []);
        if (!mounted) return;
        setBonsVendeurAttente((bons || []).filter((bon: any) => bon.statut === 'EN_ATTENTE').length);
        setLoading(false);
        return;
      }

      if (role === 'CAISSIER') {
        const [caisse, tickets] = await Promise.allSettled([
          caisseJourApi.aujourdhui(),
          ticketApi.enAttente(),
        ]);
        if (!mounted) return;
        if (caisse.status === 'fulfilled') {
          const value = caisse.value;
          setSoldeCaisseJour(value?.solde ?? 0);
          setCaisseJourStatut(value?.statut === 'FERMEE' ? 'FERMEE' : value ? 'OUVERTE' : 'ABSENTE');
        } else {
          setCaisseJourStatut('ABSENTE');
        }
        if (tickets.status === 'fulfilled') setNbTicketsAttente((tickets.value || []).length);
        setLoading(false);
        return;
      }

      if (!isAdminRole) {
        setLoading(false);
        return;
      }

      const res = await Promise.allSettled([
        caisseJourApi.aujourdhui(),
        caisseApi.soldeGlobal(),
        commandeApi.getAll(),
        ticketApi.enAttente(),
        echeanceApi.getAVenir(7),
        produitApi.getLowStock(),
        clientApi.getCredits(),
      ]);
      if (!mounted) return;

      if (res[0].status === 'fulfilled') {
        const cj = res[0].value;
        setSoldeCaisseJour(cj?.solde ?? 0);
        setCaisseJourStatut(cj?.statut === 'FERMEE' ? 'FERMEE' : cj ? 'OUVERTE' : 'ABSENTE');
      } else {
        setCaisseJourStatut('ABSENTE');
      }
      if (res[1].status === 'fulfilled') {
        setSoldeGlobale(res[1].value?.total ?? 0);
      }
      if (res[2].status === 'fulfilled') {
        const cmds = res[2].value || [];
        const enAttente = cmds.filter((c: any) => c.statut === 'EN_ATTENTE');
        setNbCommandesEnAttente(enAttente.length);
        const limite = Date.now() - 24 * 3600 * 1000;
        setCommandesAnciennes(
          enAttente.filter((c: any) => new Date(c.dateCommande).getTime() < limite).length,
        );
      }
      if (res[3].status === 'fulfilled') {
        setNbTicketsAttente((res[3].value || []).length);
      }
      if (res[4].status === 'fulfilled') {
        const list = res[4].value || [];
        setEcheances7j(list.slice(0, 5));
        setEcheancesUrgentes(
          list.filter((e: any) => daysUntil(e.dateEcheance) <= 3),
        );
      }
      if (res[5].status === 'fulfilled') {
        setProduitsRupture((res[5].value || []).length);
      }
      if (res[6].status === 'fulfilled') {
        const credits = res[6].value || [];
        setEncoursTotal(credits.reduce((acc: number, c: any) => acc + (c.totalDu || 0), 0));
        setTopDebiteurs(credits.slice(0, 3));
      }
      setLoading(false);
    };
    charger();
    const id = setInterval(charger, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isAdminRole, role]);

  useEffect(() => {
    const chargerEtatLocal = async () => {
      const queued = await listQueuedSales().catch(() => []);
      setOperationsHorsLigne(queued.length);
      const printer = await import('../services/qzPrinter');
      setImprimanteDisponible(
        printer.isAndroidDevice() ? false : printer.isConnected() && Boolean(printer.getPrinterName()),
      );
    };
    void chargerEtatLocal();
    window.addEventListener(OFFLINE_QUEUE_EVENT, chargerEtatLocal);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, chargerEtatLocal);
  }, []);

  const kpis: Kpi[] = useMemo(
    () => {
      if (role === 'VENDEUR') {
        return [
          { icon: ShoppingBag, label: 'Vente en cours', value: 'Ouvrir', sub: 'Scanner ou rechercher un produit', to: '/pos', color: 'text-primary' },
          { icon: Receipt, label: 'Mes tickets', value: bonsVendeurAttente == null ? '…' : String(bonsVendeurAttente), sub: 'en attente de caisse', to: '/mes-tickets', color: 'text-amber-600' },
          { icon: CloudOff, label: 'Hors ligne', value: String(operationsHorsLigne), sub: 'opération(s) à synchroniser', to: '/offline-queue', color: 'text-orange-600' },
        ];
      }
      if (role === 'CAISSIER') {
        return [
          { icon: Wallet, label: 'Caisse du jour', value: soldeCaisseJour == null ? '…' : fmtFCFA(soldeCaisseJour), sub: caisseJourStatut === 'OUVERTE' ? 'Session ouverte' : 'À contrôler', to: '/caisse-jour', color: 'text-primary' },
          { icon: Receipt, label: 'Tickets à encaisser', value: nbTicketsAttente == null ? '…' : String(nbTicketsAttente), sub: 'dans la file', to: '/file-caissier', color: 'text-amber-600' },
          { icon: CloudOff, label: 'Hors ligne', value: String(operationsHorsLigne), sub: 'opération(s) à synchroniser', to: '/offline-queue', color: 'text-orange-600' },
          { icon: Printer, label: 'Imprimante', value: imprimanteDisponible ? 'Prête' : 'À vérifier', sub: 'Epson TM-T20II · 58 mm', to: '/settings', color: imprimanteDisponible ? 'text-emerald-600' : 'text-red-600' },
        ];
      }
      return [
      {
        icon: Wallet,
        label: 'Caisse du jour',
        value: soldeCaisseJour == null ? '…' : fmtFCFA(soldeCaisseJour),
        sub: caisseJourStatut === 'OUVERTE' ? 'Session ouverte' : caisseJourStatut === 'FERMEE' ? 'Caisse fermée' : 'À ouvrir',
        to: '/caisse-jour',
        color: 'text-primary',
      },
      {
        icon: Landmark,
        label: 'Caisse globale + coffres',
        value: soldeGlobale == null ? '…' : fmtFCFA(soldeGlobale),
        sub: 'Trésorerie totale',
        to: '/caisse',
        color: 'text-emerald-600',
      },
      {
        icon: Globe,
        label: 'Commandes en ligne',
        value: nbCommandesEnAttente == null ? '…' : String(nbCommandesEnAttente),
        sub: 'en attente',
        to: '/orders',
        color: 'text-indigo-600',
      },
      {
        icon: Receipt,
        label: 'Tickets boutique',
        value: nbTicketsAttente == null ? '…' : String(nbTicketsAttente),
        sub: 'à encaisser',
        to: '/file-caissier',
        color: 'text-amber-600',
      },
      ];
    },
    [role, bonsVendeurAttente, operationsHorsLigne, imprimanteDisponible, soldeCaisseJour, caisseJourStatut, soldeGlobale, nbCommandesEnAttente, nbTicketsAttente],
  );

  const actions: UrgentAction[] = useMemo(() => {
    const list: UrgentAction[] = [];
    if (isAdminRole) {
    for (const e of echeancesUrgentes) {
      const d = daysUntil(e.dateEcheance);
      list.push({
        id: `ech-${e.id}`,
        icon: AlarmClock,
        label: e.titre,
        detail:
          d < 0
            ? `En retard de ${Math.abs(d)} jour(s)`
            : d === 0
              ? "Aujourd'hui"
              : `Dans ${d} jour(s)`,
        to: '/echeances',
        severity: d < 0 ? 'rouge' : d <= 1 ? 'rouge' : 'orange',
      });
    }
    if (commandesAnciennes > 0) {
      list.push({
        id: 'cmds-old',
        icon: Globe,
        label: `${commandesAnciennes} commande(s) en attente depuis plus de 24h`,
        to: '/orders',
        severity: 'orange',
      });
    }
    if (produitsRupture > 0) {
      list.push({
        id: 'stock',
        icon: PackageX,
        label: `${produitsRupture} produit(s) en rupture ou seuil bas`,
        to: '/stock-alerts',
        severity: 'jaune',
      });
    }
    }
    if (role !== 'VENDEUR' && (nbTicketsAttente ?? 0) > 0) {
      list.push({
        id: 'tickets-attente',
        icon: Receipt,
        label: `${nbTicketsAttente} ticket(s) à encaisser`,
        detail: 'La file caissier attend une action',
        to: '/file-caissier',
        severity: 'orange',
      });
    }
    if (operationsHorsLigne > 0) {
      list.push({
        id: 'offline',
        icon: CloudOff,
        label: `${operationsHorsLigne} opération(s) non synchronisée(s)`,
        detail: 'Contrôler la file locale de cet appareil',
        to: '/offline-queue',
        severity: 'rouge',
      });
    }
    if (role !== 'VENDEUR' && imprimanteDisponible === false) {
      list.push({
        id: 'printer',
        icon: Printer,
        label: 'Imprimante de caisse indisponible',
        detail: 'Vérifier QZ Tray et l’Epson TM-T20II',
        to: '/settings',
        severity: 'orange',
      });
    }
    if (role !== 'VENDEUR' && caisseJourStatut === 'ABSENTE') {
      list.push({
        id: 'caisse-absente',
        icon: PlayCircle,
        label: 'Caisse du jour non ouverte',
        detail: 'Ouvrir la session avant le premier encaissement',
        to: '/caisse-jour',
        severity: 'rouge',
      });
    } else if (role !== 'VENDEUR' && caisseJourStatut === 'FERMEE') {
      list.push({
        id: 'caisse-fermee',
        icon: Lock,
        label: 'Caisse du jour fermée',
        detail: 'La session ne peut plus recevoir d’encaissement',
        to: '/caisse-jour',
        severity: 'jaune',
      });
    }
    return list;
  }, [isAdminRole, role, echeancesUrgentes, commandesAnciennes, produitsRupture, nbTicketsAttente, operationsHorsLigne, imprimanteDisponible, caisseJourStatut]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {new Date().getHours() < 12 ? 'Bonjour' : new Date().getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'}{' '}
            {admin?.nom || 'Administrateur'} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Voici l'état de votre activité maintenant.
          </p>
        </div>
        {peutAnalyses && (
          <Link
            to="/analyses"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/20 bg-primary/5 rounded-lg hover:bg-primary/10"
          >
            <BarChart3 size={16} />
            Voir les analyses détaillées
          </Link>
        )}
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const card = (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all h-full">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-slate-50 ${k.color}`}>
                  <Icon size={20} />
                </div>
                {k.to && <ChevronRight size={16} className="text-slate-300" />}
              </div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
                {k.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              {k.sub && <p className="text-xs text-slate-400 mt-1">{k.sub}</p>}
            </div>
          );
          return k.to ? (
            <Link key={k.label} to={k.to}>
              {card}
            </Link>
          ) : (
            <div key={k.label}>{card}</div>
          );
        })}
      </div>

      {/* Actions urgentes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            <h3 className="font-bold text-slate-900">Actions urgentes</h3>
          </div>
          {actions.length > 0 && (
            <span className="text-xs font-bold text-slate-400">
              {actions.length} à traiter
            </span>
          )}
        </div>
        {loading ? (
          <p className="text-center text-slate-400 py-6 text-sm">Chargement…</p>
        ) : actions.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="text-sm font-medium">Tout est en ordre. Rien à faire pour l'instant.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id}>
                  <Link
                    to={a.to}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg border ${sevClasses[a.severity]}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {a.label}
                      </p>
                      {a.detail && (
                        <p className="text-xs text-slate-500 mt-0.5">{a.detail}</p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdminRole && <>
      {/* Encours clients */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <HandCoins size={18} className="text-primary" />
            <h3 className="font-bold text-slate-900">Encours clients</h3>
          </div>
          <Link to="/credits" className="text-xs font-bold text-primary hover:underline">
            Tout voir
          </Link>
        </div>
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <span className="text-sm text-slate-500">Total dû par les clients</span>
          <span className={`text-2xl font-bold ${(encoursTotal ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {encoursTotal == null ? '…' : fmtFCFA(encoursTotal)}
          </span>
        </div>
        {topDebiteurs.length === 0 ? (
          <div className="text-center text-slate-400 py-6 text-sm">
            Aucun crédit en cours. Tout est soldé 🎉
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {topDebiteurs.map((d) => (
              <li key={d.client?.id}>
                <Link to="/credits" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {d.client?.nom?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {d.client?.nom} {d.client?.prenom || ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-600 whitespace-nowrap">{fmtFCFA(d.totalDu)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Échéances 7 jours */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlarmClock size={18} className="text-primary" />
            <h3 className="font-bold text-slate-900">Échéances — 7 prochains jours</h3>
          </div>
          <Link
            to="/echeances"
            className="text-xs font-bold text-primary hover:underline"
          >
            Tout voir
          </Link>
        </div>
        {echeances7j.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-sm">
            Aucune échéance dans les 7 prochains jours.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {echeances7j.map((e: any) => {
              const d = daysUntil(e.dateEcheance);
              const cls =
                d < 0
                  ? 'bg-red-50 text-red-700'
                  : d <= 1
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-emerald-50 text-emerald-700';
              const label = d < 0 ? 'En retard' : d === 0 ? "Aujourd'hui" : `Dans ${d} j`;
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {e.titre}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fmtDateCourt(e.dateEcheance)}
                      {e.coffre ? ` · ${e.coffre.nom}` : ''}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap ${cls}`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      </>}

      {/* Note minuscule en bas */}
      <p className="text-center text-xs text-slate-400">
        Données rafraîchies toutes les 30 secondes.
        {!peutAnalyses && (
          <>
            {' '}
            <XCircle size={10} className="inline" /> Analyses détaillées non
            disponibles pour votre rôle.
          </>
        )}
      </p>
    </motion.div>
  );
};
