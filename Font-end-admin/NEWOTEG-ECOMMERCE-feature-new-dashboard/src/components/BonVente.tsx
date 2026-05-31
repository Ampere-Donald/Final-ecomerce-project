import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Minus, Plus, Send, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { bonVenteApi, clientApi, produitApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';

type Produit = {
  id: string;
  nomProduit: string;
  marque?: string | null;
  prixDetail?: number | null;
  quantiteStock?: number;
};

type Client = {
  id: string;
  nom: string;
  prenom?: string | null;
};

type CartItem = {
  produit: Produit;
  quantite: number;
};

type Bon = {
  id: string;
  numero: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'ANNULE';
  createdAt: string;
  lignes: Array<{ id: string; nomProduit: string; quantite: number; sousTotal: number | string }>;
};

const formatFCFA = (value: number | string | null | undefined) =>
  `${Math.round(Number(value || 0)).toLocaleString('fr-FR')} FCFA`;

export const BonVente = () => {
  const { admin } = useAdminAuth();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ESPECES');
  const [mesBons, setMesBons] = useState<Bon[]>([]);
  const [monScore, setMonScore] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'vente' | 'historique'>('vente');
  const [message, setMessage] = useState<string | null>(null);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.produit.prixDetail || 0) * item.quantite, 0),
    [cart],
  );

  const loadData = async () => {
    const [produitData, clientData, bonsData, scoreData] = await Promise.all([
      produitApi.getAll(),
      clientApi.getAll(),
      bonVenteApi.mesBons(),
      bonVenteApi.monScore(),
    ]);
    setProduits(produitData);
    setClients(clientData);
    setMesBons(bonsData);
    setMonScore(Number(scoreData?.nombreTickets || 0));
  };

  useEffect(() => {
    loadData().catch(() => setMessage('Impossible de charger les donnees vendeur.'));
  }, []);

  const addToCart = (produit: Produit) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.produit.id === produit.id);
      if (existing) {
        return prev.map((item) =>
          item.produit.id === produit.id ? { ...item, quantite: item.quantite + 1 } : item,
        );
      }
      return [...prev, { produit, quantite: 1 }];
    });
  };

  const updateQuantity = (produitId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.produit.id === produitId
            ? { ...item, quantite: Math.max(0, item.quantite + delta) }
            : item,
        )
        .filter((item) => item.quantite > 0),
    );
  };

  const submitBon = async () => {
    if (!cart.length) return;
    try {
      setSubmitting(true);
      setMessage(null);
      await bonVenteApi.create({
        clientId: selectedClientId || undefined,
        methodePaiement: paymentMethod,
        lignes: cart.map((item) => ({
          produitId: item.produit.id,
          quantite: item.quantite,
          prixUnitaire: Number(item.produit.prixDetail || 0),
        })),
      });
      setCart([]);
      setSelectedClientId('');
      setMessage('Bon envoye a la caisse.');
      await loadData();
      setActiveTab('historique');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setMessage(apiError.response?.data?.message || 'Impossible de creer le bon.');
    } finally {
      setSubmitting(false);
    }
  };

  const annuler = async (id: string) => {
    await bonVenteApi.annuler(id);
    await loadData();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bons de vente</h1>
          <p className="text-sm text-slate-500">Vendeur: {admin?.nom}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          Mon score ce mois: {monScore} ticket{monScore > 1 ? 's' : ''}
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <AlertCircle size={16} />
          {message}
        </div>
      )}

      <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setActiveTab('vente')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-bold ${activeTab === 'vente' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Vente
        </button>
        <button
          onClick={() => setActiveTab('historique')}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-bold ${activeTab === 'historique' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          Mes bons
        </button>
      </div>

      {activeTab === 'vente' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {produits.map((produit) => (
              <button
                key={produit.id}
                onClick={() => addToCart(produit)}
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary"
              >
                <p className="line-clamp-2 min-h-10 font-bold text-slate-900">{produit.nomProduit}</p>
                <p className="mt-1 text-xs text-slate-500">{produit.marque || 'Sans marque'}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-black text-primary">{formatFCFA(produit.prixDetail)}</span>
                  <span className="text-xs text-slate-400">Stock {produit.quantiteStock ?? 0}</span>
                </div>
              </button>
            ))}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Panier</h2>
            <div className="mt-4 space-y-3">
              {cart.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">Aucun produit ajoute.</p>
              ) : cart.map((item) => (
                <div key={item.produit.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{item.produit.nomProduit}</p>
                    <p className="text-xs text-slate-500">{formatFCFA(item.produit.prixDetail)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.produit.id, -1)} className="rounded-md bg-slate-100 p-1"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantite}</span>
                    <button onClick={() => updateQuantity(item.produit.id, 1)} className="rounded-md bg-slate-100 p-1"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
                <option value="">Client comptoir</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.nom} {client.prenom || ''}</option>
                ))}
              </select>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
                <option value="ESPECES">Especes</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CARTE">Carte</option>
                <option value="VIREMENT">Virement</option>
              </select>
              <div className="flex items-center justify-between text-lg font-black">
                <span>Total</span>
                <span>{formatFCFA(total)}</span>
              </div>
              <button
                onClick={submitBon}
                disabled={!cart.length || submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                <Send size={18} />
                Envoyer a la caissiere
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className="space-y-3">
          {mesBons.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">Aucun bon cree.</p>
          ) : mesBons.map((bon) => (
            <div key={bon.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-black text-slate-900">{bon.numero}</p>
                  <p className="text-xs text-slate-500">{new Date(bon.createdAt).toLocaleString('fr-FR')}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                  bon.statut === 'VALIDE' ? 'bg-emerald-100 text-emerald-700' :
                  bon.statut === 'ANNULE' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {bon.statut}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {bon.lignes.map((ligne) => (
                  <p key={ligne.id}>{ligne.quantite} x {ligne.nomProduit} - {formatFCFA(ligne.sousTotal)}</p>
                ))}
              </div>
              {bon.statut === 'EN_ATTENTE' && (
                <button onClick={() => annuler(bon.id)} className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  <Trash2 size={16} />
                  Annuler
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
