import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Mail, Phone, Factory, X, Pencil, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fournisseurApi } from '../services/api';
import { useAdminAuth } from '../context/AdminAuthContext';
import { can } from '../utils/permissions';

export const Fournisseurs = () => {
  const { admin } = useAdminAuth();
  const canDelete = can.deleteEntities(admin?.role);
  const canExport = can.exportCsv(admin?.role);

  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    nomEntreprise: '', contactNom: '', email: '', telephone: '', adresse: ''
  });

  const fetchFournisseurs = async () => {
    try {
      const data = await fournisseurApi.getAll();
      setFournisseurs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFournisseurs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingFournisseur) {
        const updated = await fournisseurApi.update(editingFournisseur.id, formData);
        setFournisseurs(prev => prev.map(f => f.id === editingFournisseur.id ? { ...f, ...updated } : f));
      } else {
        await fournisseurApi.create(formData);
        await fetchFournisseurs();
      }
      setIsModalOpen(false);
      setEditingFournisseur(null);
      setFormData({ nomEntreprise: '', contactNom: '', email: '', telephone: '', adresse: '' });
    } catch (err) {
      console.error(err);
      alert(editingFournisseur ? 'Erreur lors de la modification du fournisseur.' : 'Erreur lors de la création du fournisseur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (f: any) => {
    setEditingFournisseur(f);
    setFormData({
      nomEntreprise: f.nomEntreprise || '',
      contactNom: f.contactNom || '',
      email: f.email || '',
      telephone: f.telephone || '',
      adresse: f.adresse || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (f: any) => {
    if (!confirm(`Supprimer le fournisseur "${f.nomEntreprise}" ? Cette action est irréversible.`)) return;
    try {
      setFournisseurs(prev => prev.filter(item => item.id !== f.id));
      await fournisseurApi.delete(f.id);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression du fournisseur.');
      await fetchFournisseurs();
    }
  };

  const filtered = fournisseurs.filter(f =>
    f.nomEntreprise?.toLowerCase().includes(search.toLowerCase()) ||
    (f.contactNom || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Entreprise', 'Contact', 'Email', 'Téléphone', 'Adresse'];
    const rows = filtered.map(f => [
      `"${f.nomEntreprise || ''}"`, `"${f.contactNom || ''}"`, `"${f.email || ''}"`,
      `"${f.telephone || ''}"`, `"${f.adresse || ''}"`,
    ]);
    const csv = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fournisseurs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fournisseurs</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos partenaires commerciaux et fabricants.</p>
        </div>
        <button onClick={() => { setEditingFournisseur(null); setFormData({ nomEntreprise: '', contactNom: '', email: '', telephone: '', adresse: '' }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouveau Fournisseur</span>
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">{editingFournisseur ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}</h2>
                <button onClick={() => { setIsModalOpen(false); setEditingFournisseur(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'entreprise *</label>
                  <input type="text" required value={formData.nomEntreprise} onChange={e => setFormData({ ...formData, nomEntreprise: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Ex: Alitech Sarl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom du contact principal</label>
                  <input type="text" value={formData.contactNom} onChange={e => setFormData({ ...formData, contactNom: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Nom du responsable" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="contact@fournisseur.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                    <input type="tel" value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="+237 6XX XXX XXX" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
                  <input type="text" value={formData.adresse} onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Rue, Ville, Pays" />
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingFournisseur(null); }} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Annuler</button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 disabled:opacity-50">
                    {isSubmitting ? (editingFournisseur ? 'Modification...' : 'Création...') : (editingFournisseur ? 'Modifier le fournisseur' : 'Créer le fournisseur')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher une entreprise..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          {canExport && (
            <button onClick={handleExportCSV} disabled={filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              <Download size={18} /><span>Exporter CSV</span>
            </button>
          )}
        </div>
        {/* ── Table (desktop) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Entreprise</th>
                <th className="px-6 py-4">Contact Principal</th>
                <th className="px-6 py-4">Adresse</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center">
                  <Factory size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun fournisseur trouvé.</p>
                </td></tr>
              ) : (
                filtered.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Factory size={20} /></div>
                        <span className="font-bold text-slate-900">{f.nomEntreprise}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">{f.contactNom || 'Non spécifié'}</p>
                      <div className="flex flex-col mt-1 space-y-0.5">
                        {f.telephone && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={12} />{f.telephone}</span>}
                        {f.email && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={12} />{f.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{f.adresse || <span className="italic text-slate-300">—</span>}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                          <Pencil size={16} />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDelete(f)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        )}
                        <button className="text-sm font-bold text-primary hover:underline">Voir Historique</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Cards (mobile) ── */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Factory size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun fournisseur trouvé.</p>
            </div>
          ) : (
            filtered.map(f => (
              <div key={f.id} className="p-4 flex items-start gap-3">
                <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Factory size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-900">{f.nomEntreprise}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                        <Pencil size={14} />
                      </button>
                      {canDelete && (
                        <button onClick={() => handleDelete(f)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      )}
                      <button className="text-xs font-bold text-primary hover:underline">Historique</button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{f.contactNom || 'Contact non spécifié'}</p>
                  <div className="flex flex-col mt-1 space-y-0.5">
                    {f.telephone && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Phone size={11} />{f.telephone}</span>}
                    {f.email && <span className="flex items-center gap-1.5 text-xs text-slate-500 truncate"><Mail size={11} />{f.email}</span>}
                    {f.adresse && <span className="text-xs text-slate-400 truncate">{f.adresse}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
