import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Printer, Search, ChevronDown } from 'lucide-react';
import { factureApi, getApiErrorMessage } from '../services/api';
import { ReceiptGenerator } from './ReceiptGenerator';

const fmtFCFA = (n: number | string): string => {
  const v = Number(n) || 0;
  return (
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
      .format(v)
      .replace(/ |\s/g, ' ') + ' FCFA'
  );
};

interface Facture {
  id: string;
  numero: string;
  type: 'FACTURE' | 'TICKET_CAISSE';
  dateEmission: string;
  totalTTC: number | string;
  totalHT: number | string;
  tva: number | string;
  methodePaiement: string;
  printCount: number;
  vendeur?: { nom: string } | null;
  caissier?: { nom: string } | null;
  client?: { nom: string; telephone?: string } | null;
  lignes?: Array<{ nomProduit: string; quantite: number; sousTotalTTC: number | string }>;
}

export const Invoices = () => {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'' | 'FACTURE' | 'TICKET_CAISSE'>('');
  const [printing, setPrinting] = useState<string | null>(null);
  const [receiptFacture, setReceiptFacture] = useState<Facture | null>(null);

  const charger = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      const data = await factureApi.getAll(params);
      setFactures(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Impossible de charger les factures.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
  }, [filterType]);

  const handlePrint = async (f: Facture) => {
    setPrinting(f.id);
    try {
      await factureApi.print(f.id);
      setFactures((prev) =>
        prev.map((x) => x.id === f.id ? { ...x, printCount: (x.printCount || 0) + 1 } : x),
      );
      setReceiptFacture(f);
    } catch {
      // Si l'API échoue, on ouvre quand même le reçu.
      setReceiptFacture(f);
    } finally {
      setPrinting(null);
    }
  };

  const filtered = factures.filter(
    (f) =>
      !search ||
      f.numero.toLowerCase().includes(search.toLowerCase()) ||
      f.vendeur?.nom.toLowerCase().includes(search.toLowerCase()) ||
      f.caissier?.nom.toLowerCase().includes(search.toLowerCase()) ||
      f.client?.nom.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Factures</h1>
          <p className="text-sm text-slate-500">
            {factures.length} facture{factures.length !== 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par numero, vendeur, caissier, client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as '' | 'FACTURE' | 'TICKET_CAISSE')}
            className="appearance-none rounded-lg border border-slate-200 bg-white px-4 py-2 pr-8 text-sm text-slate-700 outline-none focus:border-primary"
          >
            <option value="">Tous les types</option>
            <option value="TICKET_CAISSE">Ticket caisse</option>
            <option value="FACTURE">Facture pro</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {/* Tableau */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400">
          <FileText size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucune facture trouvée</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Numéro</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Vendeur</th>
                <th className="px-4 py-3 text-left">Caissier</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-right">Total TTC</th>
                <th className="px-4 py-3 text-center">Impressions</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-slate-900">{f.numero}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        f.type === 'TICKET_CAISSE'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {f.type === 'TICKET_CAISSE' ? 'Ticket' : 'Facture pro'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(f.dateEmission).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{f.vendeur?.nom ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{f.caissier?.nom ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{f.client?.nom ?? 'Comptoir'}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">
                    {fmtFCFA(f.totalTTC)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{f.printCount}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handlePrint(f)}
                      disabled={printing === f.id}
                      title="Imprimer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                    >
                      <Printer size={13} />
                      {printing === f.id ? '…' : 'Imprimer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Reçu imprimable */}
      {receiptFacture && (
        <ReceiptGenerator
          type={receiptFacture.type === 'FACTURE' ? 'facture' : 'ticket'}
          numero={receiptFacture.numero}
          dateVente={receiptFacture.dateEmission}
          methodePaiement={receiptFacture.methodePaiement}
          montantTotal={Number(receiptFacture.totalTTC)}
          client={receiptFacture.client ? { nom: receiptFacture.client.nom, telephone: receiptFacture.client.telephone } : undefined}
          lignes={(receiptFacture.lignes || []).map((l) => ({
            nomProduit: l.nomProduit,
            quantite: l.quantite,
            prixUnitaire: l.quantite > 0 ? Math.round(Number(l.sousTotalTTC) / l.quantite) : 0,
            sousTotal: Number(l.sousTotalTTC),
          }))}
          onClose={() => setReceiptFacture(null)}
        />
      )}
    </motion.div>
  );
};
