import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Edit2, Trash2, Tags, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { attributApi, valeurAttributApi } from '../services/api';

/* ── Attribut Modal Form ─────────────────────────────────────────────
   Extracted OUTSIDE the main component so React doesn't unmount it on
   every parent state change (avoids "one character at a time" bug).
──────────────────────────────────────────────────────────────────────*/
interface AttributModalProps {
  title: string;
  formData: { nom: string };
  setFormData: React.Dispatch<React.SetStateAction<{ nom: string }>>;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const AttributModalForm: React.FC<AttributModalProps> = ({ title, formData, setFormData, isSubmitting, onSubmit, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'attribut *</label>
          <input
            type="text" required maxLength={100}
            value={formData.nom}
            onChange={e => setFormData(prev => ({ ...prev, nom: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Ex: Couleur, Taille, Matiere..."
            autoFocus
          />
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50">
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

/* ── Valeur Modal Form ──────────────────────────────────────────────*/
interface ValeurModalProps {
  title: string;
  formData: { valeur: string; attributId: string };
  setFormData: React.Dispatch<React.SetStateAction<{ valeur: string; attributId: string }>>;
  attributs: any[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const ValeurModalForm: React.FC<ValeurModalProps> = ({ title, formData, setFormData, attributs, isSubmitting, onSubmit, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
    >
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Attribut parent *</label>
          <select
            required
            value={formData.attributId}
            onChange={e => setFormData(prev => ({ ...prev, attributId: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            <option value="">-- Choisir un attribut --</option>
            {attributs.map(a => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Valeur *</label>
          <input
            type="text" required maxLength={100}
            value={formData.valeur}
            onChange={e => setFormData(prev => ({ ...prev, valeur: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder="Ex: Rouge, XL, Coton..."
            autoFocus
          />
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50">
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

/* ── Main Component ─────────────────────────────────────────────────*/
export const Attributs = () => {
  // ── Attributs state ──
  const [attributs, setAttributs] = useState<any[]>([]);
  const [loadingAttr, setLoadingAttr] = useState(true);
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [editAttrModal, setEditAttrModal] = useState<{ open: boolean; attr: any }>({ open: false, attr: null });
  const [attrFormData, setAttrFormData] = useState({ nom: '' });
  const [isAttrSubmitting, setIsAttrSubmitting] = useState(false);
  const [searchAttr, setSearchAttr] = useState('');

  // ── Valeurs state ──
  const [valeurs, setValeurs] = useState<any[]>([]);
  const [loadingVal, setLoadingVal] = useState(true);
  const [isValModalOpen, setIsValModalOpen] = useState(false);
  const [editValModal, setEditValModal] = useState<{ open: boolean; val: any }>({ open: false, val: null });
  const [valFormData, setValFormData] = useState({ valeur: '', attributId: '' });
  const [isValSubmitting, setIsValSubmitting] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // ── Fetch ──
  const fetchAttributs = async () => {
    try {
      const data = await attributApi.getAll();
      setAttributs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttr(false);
    }
  };

  const fetchValeurs = async () => {
    try {
      const data = await valeurAttributApi.getAll();
      setValeurs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVal(false);
    }
  };

  useEffect(() => { fetchAttributs(); fetchValeurs(); }, []);

  // ── Helpers ──
  const getAttributName = (attributId: string) => {
    const attr = attributs.find(a => a.id === attributId);
    return attr ? attr.nom : '—';
  };

  const countValeurs = (attributId: string) => valeurs.filter(v => v.attributId === attributId).length;

  // ── Attribut CRUD ──
  const resetAttrForm = () => setAttrFormData({ nom: '' });

  const handleAttrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAttrSubmitting(true);
      await attributApi.create(attrFormData);
      await fetchAttributs();
      setIsAttrModalOpen(false);
      resetAttrForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la creation de l\'attribut.');
    } finally {
      setIsAttrSubmitting(false);
    }
  };

  const handleAttrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAttrModal.attr) return;
    try {
      setIsAttrSubmitting(true);
      await attributApi.update(editAttrModal.attr.id, attrFormData);
      await fetchAttributs();
      setEditAttrModal({ open: false, attr: null });
      resetAttrForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise a jour.');
    } finally {
      setIsAttrSubmitting(false);
    }
  };

  const handleAttrDelete = async (id: string) => {
    if (!confirm('Supprimer cet attribut ? Les valeurs associees seront egalement supprimees.')) return;
    try {
      await attributApi.delete(id);
      setAttributs(prev => prev.filter(a => a.id !== id));
      setValeurs(prev => prev.filter(v => v.attributId !== id));
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  const openAttrEdit = (attr: any) => {
    setAttrFormData({ nom: attr.nom });
    setEditAttrModal({ open: true, attr });
  };

  // ── Valeur CRUD ──
  const resetValForm = () => setValFormData({ valeur: '', attributId: '' });

  const handleValSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsValSubmitting(true);
      await valeurAttributApi.create(valFormData);
      await fetchValeurs();
      setIsValModalOpen(false);
      resetValForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la creation de la valeur.');
    } finally {
      setIsValSubmitting(false);
    }
  };

  const handleValEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editValModal.val) return;
    try {
      setIsValSubmitting(true);
      await valeurAttributApi.update(editValModal.val.id, valFormData);
      await fetchValeurs();
      setEditValModal({ open: false, val: null });
      resetValForm();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise a jour.');
    } finally {
      setIsValSubmitting(false);
    }
  };

  const handleValDelete = async (id: string) => {
    if (!confirm('Supprimer cette valeur ?')) return;
    try {
      await valeurAttributApi.delete(id);
      setValeurs(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      alert('Erreur lors de la suppression.');
    }
  };

  const openValEdit = (val: any) => {
    setValFormData({ valeur: val.valeur, attributId: val.attributId });
    setEditValModal({ open: true, val });
  };

  // ── Filtered lists ──
  const filteredAttributs = attributs.filter(a => a.nom?.toLowerCase().includes(searchAttr.toLowerCase()));
  const filteredValeurs = valeurs.filter(v =>
    v.valeur?.toLowerCase().includes(searchVal.toLowerCase()) ||
    getAttributName(v.attributId).toLowerCase().includes(searchVal.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 — Attributs
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attributs Produits</h1>
          <p className="text-sm text-slate-500 mt-1">Gerez les attributs et leurs valeurs pour enrichir vos fiches produits.</p>
        </div>
        <button onClick={() => { resetAttrForm(); setIsAttrModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouvel Attribut</span>
        </button>
      </div>

      {/* Attribut modals */}
      <AnimatePresence>
        {isAttrModalOpen && (
          <AttributModalForm
            title="Ajouter un attribut"
            formData={attrFormData} setFormData={setAttrFormData}
            isSubmitting={isAttrSubmitting} onSubmit={handleAttrSubmit}
            onClose={() => setIsAttrModalOpen(false)}
          />
        )}
        {editAttrModal.open && (
          <AttributModalForm
            title="Modifier l'attribut"
            formData={attrFormData} setFormData={setAttrFormData}
            isSubmitting={isAttrSubmitting} onSubmit={handleAttrEdit}
            onClose={() => setEditAttrModal({ open: false, attr: null })}
          />
        )}
      </AnimatePresence>

      {/* Attributs table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher un attribut..." value={searchAttr} onChange={e => setSearchAttr(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Nom de l'attribut</th>
                <th className="px-6 py-4">Nombre de valeurs</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingAttr ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filteredAttributs.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center">
                  <Tags size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucun attribut trouve.</p>
                </td></tr>
              ) : (
                filteredAttributs.map(attr => (
                  <tr key={attr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Tags size={18} />
                        </div>
                        <span className="font-bold text-slate-900">{attr.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary">{countValeurs(attr.id)} valeur{countValeurs(attr.id) !== 1 ? 's' : ''}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openAttrEdit(attr)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleAttrDelete(attr.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loadingAttr ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filteredAttributs.length === 0 ? (
            <div className="py-12 text-center">
              <Tags size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucun attribut trouve.</p>
            </div>
          ) : (
            filteredAttributs.map(attr => (
              <div key={attr.id} className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Tags size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{attr.nom}</p>
                  <p className="text-xs font-semibold text-primary mt-0.5">{countValeurs(attr.id)} valeur{countValeurs(attr.id) !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openAttrEdit(attr)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                  <button onClick={() => handleAttrDelete(attr.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 — Valeurs d'attributs
      ════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Valeurs d'Attributs</h1>
          <p className="text-sm text-slate-500 mt-1">Ajoutez et gerez les valeurs associees a chaque attribut.</p>
        </div>
        <button onClick={() => { resetValForm(); setIsValModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all font-semibold shadow-sm">
          <PlusCircle size={18} /><span>Nouvelle Valeur</span>
        </button>
      </div>

      {/* Valeur modals */}
      <AnimatePresence>
        {isValModalOpen && (
          <ValeurModalForm
            title="Ajouter une valeur"
            formData={valFormData} setFormData={setValFormData}
            attributs={attributs} isSubmitting={isValSubmitting}
            onSubmit={handleValSubmit} onClose={() => setIsValModalOpen(false)}
          />
        )}
        {editValModal.open && (
          <ValeurModalForm
            title="Modifier la valeur"
            formData={valFormData} setFormData={setValFormData}
            attributs={attributs} isSubmitting={isValSubmitting}
            onSubmit={handleValEdit} onClose={() => setEditValModal({ open: false, val: null })}
          />
        )}
      </AnimatePresence>

      {/* Valeurs table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher une valeur..." value={searchVal} onChange={e => setSearchVal(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Valeur</th>
                <th className="px-6 py-4">Attribut parent</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingVal ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Chargement...</td></tr>
              ) : filteredValeurs.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center">
                  <Tags size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Aucune valeur trouvee.</p>
                </td></tr>
              ) : (
                filteredValeurs.map(val => (
                  <tr key={val.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Tags size={18} />
                        </div>
                        <span className="font-bold text-slate-900">{val.valeur}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                        {getAttributName(val.attributId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openValEdit(val)} className="p-1.5 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleValDelete(val.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors hover:bg-slate-100 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loadingVal ? (
            <p className="py-8 text-center text-slate-500">Chargement...</p>
          ) : filteredValeurs.length === 0 ? (
            <div className="py-12 text-center">
              <Tags size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Aucune valeur trouvee.</p>
            </div>
          ) : (
            filteredValeurs.map(val => (
              <div key={val.id} className="p-4 flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Tags size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900">{val.valeur}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mt-0.5">
                    {getAttributName(val.attributId)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openValEdit(val)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg"><Edit2 size={16} /></button>
                  <button onClick={() => handleValDelete(val.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};
