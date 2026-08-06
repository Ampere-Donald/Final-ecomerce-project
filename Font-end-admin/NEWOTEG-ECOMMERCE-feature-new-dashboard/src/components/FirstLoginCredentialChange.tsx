import { FormEvent, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminAuthApi, getApiErrorMessage } from '../services/api';

export const FirstLoginCredentialChange = () => {
  const { admin, logout, refreshAdmin } = useAdminAuth();
  const pinAccount = admin?.role === 'VENDEUR' || admin?.role === 'CAISSIER';
  const [currentSecret, setCurrentSecret] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const secretLabel = pinAccount ? 'PIN' : 'mot de passe';
  const secretType = pinAccount || !showSecrets ? 'password' : 'text';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (pinAccount && (!/^\d{4,6}$/.test(currentSecret) || !/^\d{4,6}$/.test(newSecret))) {
      setError('Le PIN doit contenir entre 4 et 6 chiffres.');
      return;
    }
    if (!pinAccount && newSecret.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newSecret === currentSecret) {
      setError(`Choisissez un nouveau ${secretLabel} différent du code temporaire.`);
      return;
    }
    if (newSecret !== confirmation) {
      setError(`La confirmation du ${secretLabel} ne correspond pas.`);
      return;
    }

    setSubmitting(true);
    try {
      if (pinAccount) await adminAuthApi.changePin(currentSecret, newSecret);
      else await adminAuthApi.changePassword(currentSecret, newSecret);
      await refreshAdmin();
    } catch (changeError) {
      setError(getApiErrorMessage(changeError, `Impossible de modifier votre ${secretLabel}.`));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="bg-slate-950 px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <ShieldCheck size={25} aria-hidden="true" />
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide">
              {admin?.role === 'CAISSIER' ? 'Poste caisse' : admin?.role === 'VENDEUR' ? 'Poste vente' : 'Administration'}
            </span>
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Première connexion</p>
          <h1 className="mt-2 text-2xl font-extrabold">Bienvenue {admin?.nom}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Le code reçu est temporaire. Définissez maintenant votre {secretLabel} personnel avant d’accéder à votre espace.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" aria-hidden="true" />
            <span>Votre nouveau {secretLabel} ne sera visible par personne.</span>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">{pinAccount ? 'PIN temporaire' : 'Mot de passe temporaire'}</span>
            <span className="relative block">
              <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={currentSecret}
                onChange={event => setCurrentSecret(pinAccount ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)}
                type={secretType}
                inputMode={pinAccount ? 'numeric' : undefined}
                autoComplete="current-password"
                required
                autoFocus
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-12 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Nouveau {secretLabel}</span>
            <span className="relative block">
              <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={newSecret}
                onChange={event => setNewSecret(pinAccount ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)}
                type={secretType}
                inputMode={pinAccount ? 'numeric' : undefined}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-12 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Confirmer le nouveau {secretLabel}</span>
            <span className="relative block">
              <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={confirmation}
                onChange={event => setConfirmation(pinAccount ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)}
                type={secretType}
                inputMode={pinAccount ? 'numeric' : undefined}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-12 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              {!pinAccount && (
                <button
                  type="button"
                  onClick={() => setShowSecrets(value => !value)}
                  aria-label={showSecrets ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  {showSecrets ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            {submitting ? 'Enregistrement…' : `Enregistrer mon nouveau ${secretLabel}`}
          </button>

          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <LogOut size={17} aria-hidden="true" /> Se déconnecter
          </button>
        </form>
      </section>
    </main>
  );
};
