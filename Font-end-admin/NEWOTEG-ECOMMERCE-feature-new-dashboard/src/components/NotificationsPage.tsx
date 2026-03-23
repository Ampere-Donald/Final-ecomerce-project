import React, { useEffect, useState, useCallback } from 'react';
import { Bell, Search, ChevronLeft, ChevronRight, CheckCheck, Eye, EyeOff, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { notificationApi } from '../services/api';

const typeLabels: Record<string, string> = {
  COMMANDE_CREEE: 'Commande créée',
  COMMANDE_STATUT: 'Statut commande',
  PRODUIT_CREE: 'Produit créé',
  PRODUIT_MAJ: 'Produit modifié',
  PRODUIT_SUPPRIME: 'Produit supprimé',
  STOCK_CHANGE: 'Stock modifié',
  CATEGORIE_CREEE: 'Catégorie créée',
  CATEGORIE_MAJ: 'Catégorie modifiée',
  CATEGORIE_SUPPRIMEE: 'Catégorie supprimée',
  VENTE_CREEE: 'Vente créée',
  VENTE_MAJ: 'Vente modifiée',
  ACHAT_CREE: 'Achat créé',
  ACHAT_MAJ: 'Achat modifié',
  ACHAT_SUPPRIME: 'Achat supprimé',
  COMPTE_CREE: 'Compte créé',
  COMPTE_MAJ: 'Compte modifié',
  COMPTE_SUPPRIME: 'Compte supprimé',
  FOURNISSEUR_CREE: 'Fournisseur créé',
  FOURNISSEUR_MAJ: 'Fournisseur modifié',
  FOURNISSEUR_SUPPRIME: 'Fournisseur supprimé',
  CAISSE_CREEE: 'Caisse créée',
  CAISSE_MAJ: 'Caisse modifiée',
  CAISSE_SUPPRIMEE: 'Caisse supprimée',
  MOUVEMENT_STOCK_CREE: 'Mouvement stock',
};

const typeBadgeColor = (type: string) => {
  if (type.includes('SUPPRIM')) return 'bg-red-100 text-red-700';
  if (type.includes('CREE') || type.includes('CREEE')) return 'bg-green-100 text-green-700';
  if (type.includes('MAJ') || type.includes('STATUT')) return 'bg-blue-100 text-blue-700';
  return 'bg-slate-100 text-slate-600';
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

export const NotificationsPage = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [lueFilter, setLueFilter] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (actorFilter) params.actorName = actorFilter;
      if (lueFilter) params.lue = lueFilter;
      const result = await notificationApi.getAllPaginated(params);
      setData(result.data || []);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, actorFilter, lueFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleToggleRead = async (n: any) => {
    try {
      if (n.lue) {
        await notificationApi.markAsUnread(n.id);
      } else {
        await notificationApi.markAsRead(n.id);
      }
      setData(prev => prev.map(item => item.id === n.id ? { ...item, lue: !item.lue } : item));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setData(prev => prev.map(item => ({ ...item, lue: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const typeOptions = Object.keys(typeLabels);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">{total} notification{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={handleMarkAllRead}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          <CheckCheck size={18} /><span>Tout marquer comme lu</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Rechercher dans les messages..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none">
            <option value="">Tous les types</option>
            {typeOptions.map(t => (
              <option key={t} value={t}>{typeLabels[t]}</option>
            ))}
          </select>
          <input type="text" placeholder="Filtrer par acteur..." value={actorFilter}
            onChange={e => { setActorFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          <select value={lueFilter} onChange={e => { setLueFilter(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none">
            <option value="">Lu / Non-lu</option>
            <option value="false">Non lues</option>
            <option value="true">Lues</option>
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
        {loading ? (
          <p className="py-8 text-center text-slate-500">Chargement...</p>
        ) : data.length === 0 ? (
          <div className="py-12 text-center">
            <Bell size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Aucune notification trouvée.</p>
          </div>
        ) : (
          data.map(n => (
            <div key={n.id} className={`p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors ${!n.lue ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}>
              <div className={`size-2 rounded-full mt-2 shrink-0 ${!n.lue ? 'bg-primary' : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${typeBadgeColor(n.type)}`}>
                        {typeLabels[n.type] || n.type}
                      </span>
                      {n.actorName && (
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {n.actorName} ({n.actorRole})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  <button onClick={() => handleToggleRead(n)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0" title={n.lue ? 'Marquer non lu' : 'Marquer lu'}>
                    {n.lue ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeft size={16} /> Précédent
          </button>
          <span className="text-sm text-slate-500">Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Suivant <ChevronRight size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );
};
