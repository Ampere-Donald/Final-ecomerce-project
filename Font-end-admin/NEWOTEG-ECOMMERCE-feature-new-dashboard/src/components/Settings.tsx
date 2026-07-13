import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Printer as PrinterIcon } from 'lucide-react';
import { User, Bell, Shield, Wallet, Globe, Smartphone, CheckCircle2, AlertCircle, Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAuthApi, equivalenceApi } from '../services/api';
import { PrinterSettings } from './PrinterSettings';

type Tab = 'profile' | 'security' | 'printer' | 'ia';

type IaStats = {
  configured: boolean;
  model?: string;
  appelsJour: number;
  appelsMois: number;
};

type IaHealth = {
  configured: boolean;
  model: string;
  ok: boolean;
  message: string;
};

export const Settings = () => {
  const { admin } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Statistiques IA (équivalences)
  const [iaStats, setIaStats] = useState<IaStats | null>(null);
  const [iaHealth, setIaHealth] = useState<IaHealth | null>(null);
  const [iaHealthLoading, setIaHealthLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'ia') return;
    equivalenceApi.stats().then(setIaStats).catch(() => setIaStats(null));
  }, [activeTab]);

  const handleGeminiHealth = async () => {
    setIaHealthLoading(true);
    setIaHealth(null);
    try {
      setIaHealth(await equivalenceApi.health());
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Test Gemini impossible.';
      setIaHealth({
        configured: false,
        model: 'gemini-2.5-flash',
        ok: false,
        message: Array.isArray(message) ? message.join(', ') : message,
      });
    } finally {
      setIaHealthLoading(false);
    }
  };

  const adminName = admin?.nom || 'Admin';
  const initials = adminName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }

    setPwLoading(true);
    try {
      await adminAuthApi.changePassword(oldPassword, newPassword);
      setPwMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erreur lors du changement de mot de passe.';
      setPwMessage({ type: 'error', text: Array.isArray(msg) ? msg.join(', ') : msg });
    } finally {
      setPwLoading(false);
    }
  };

  const tabs = [
    { key: 'profile' as Tab, label: 'Infos Profil', icon: User },
    { key: 'printer' as Tab, label: 'Imprimante tickets', icon: PrinterIcon },
    { key: 'security' as Tab, label: 'Sécurité', icon: Shield },
    { key: 'ia' as Tab, label: 'IA & Équivalences', icon: Sparkles },
  ];

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Paramètres du Compte</h2>
        <p className="text-slate-500 text-sm">Gérez votre profil et votre sécurité</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar tabs */}
        <aside className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === item.key
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:col-span-3 space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="font-bold text-lg mb-6 text-slate-900">Profil Administrateur</h3>
              <div className="flex items-center gap-6 mb-8">
                <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/20">
                  {initials}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">{adminName}</p>
                  <p className="text-sm text-slate-500">{admin?.role || 'Administrateur'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Nom</label>
                  <input
                    type="text"
                    value={admin?.nom || ''}
                    readOnly
                    className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    value={admin?.email || ''}
                    readOnly
                    className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Rôle</label>
                  <input
                    type="text"
                    value={admin?.role || 'Administrateur'}
                    readOnly
                    className={`${inputClass} bg-slate-100 cursor-not-allowed`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">ID</label>
                  <input
                    type="text"
                    value={admin?.id || ''}
                    readOnly
                    className={`${inputClass} bg-slate-100 cursor-not-allowed text-xs`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="font-bold text-lg mb-6 text-slate-900">Changer le mot de passe</h3>

              {pwMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg mb-6 text-sm font-medium ${
                  pwMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {pwMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {pwMessage.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Mot de passe actuel</label>
                  <div className="relative">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      className={inputClass}
                      placeholder="Entrez votre mot de passe actuel"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className={inputClass}
                      placeholder="Minimum 8 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputClass}
                    placeholder="Répétez le nouveau mot de passe"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pwLoading ? 'Modification...' : 'Mettre à jour le mot de passe'}
                </button>
              </form>
            </div>
          )}

          {/* IA & Équivalences Tab */}
          {activeTab === 'printer' && <PrinterSettings />}

          {activeTab === 'ia' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <h3 className="font-bold text-lg mb-1 text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-600" />
                Équivalences assistées par IA
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Suggestions de pièces équivalentes (Gemini, free tier). Surveillez la consommation du quota gratuit.
              </p>

              {iaStats == null ? (
                <p className="text-sm text-slate-400">Chargement…</p>
              ) : (
                <div className="space-y-5">
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
                      iaStats.configured
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {iaStats.configured ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {iaStats.configured
                      ? 'Service IA configuré (clé GEMINI_API_KEY présente).'
                      : 'Clé GEMINI_API_KEY manquante — les suggestions sont indisponibles.'}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Test Gemini Flash</p>
                        <p className="text-xs text-slate-500">
                          Modele configure : {iaStats.model || 'gemini-2.5-flash'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGeminiHealth}
                        disabled={iaHealthLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {iaHealthLoading && <Loader2 size={16} className="animate-spin" />}
                        {iaHealthLoading ? 'Test en cours...' : 'Tester Gemini Flash'}
                      </button>
                    </div>

                    {iaHealth && (
                      <div
                        className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
                          iaHealth.ok
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {iaHealth.ok ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                        <div>
                          <p className="font-semibold">{iaHealth.message}</p>
                          <p className="text-xs opacity-80">
                            Modele teste : {iaHealth.model} | Cle configuree : {iaHealth.configured ? 'oui' : 'non'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-5 text-center">
                      <p className="text-3xl font-bold text-violet-600">{iaStats.appelsJour}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">Recherches aujourd'hui</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-5 text-center">
                      <p className="text-3xl font-bold text-violet-600">{iaStats.appelsMois}</p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">Recherches ce mois-ci</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Le free tier Gemini Flash autorise environ 1 500 requêtes/jour. Au-delà, les suggestions renvoient
                    un message d'indisponibilité temporaire.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
