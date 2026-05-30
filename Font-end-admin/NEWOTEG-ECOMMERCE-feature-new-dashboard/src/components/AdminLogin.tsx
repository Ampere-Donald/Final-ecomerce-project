import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AlertTriangle, ArrowRight, Eye, EyeOff, Hash, Lock, ShieldCheck, User, X } from 'lucide-react';

type LoginMode = 'password' | 'pin';

export const AdminLogin: React.FC = () => {
  const { login, loginPin } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<LoginMode>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const expired = searchParams.get('expired') === '1';
  const pinDots = useMemo(() => '•'.repeat(pin.length).padEnd(4, '·').slice(0, 6), [pin]);

  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async () => {
    if (pin.length < 4 || pin.length > 6) return;
    setError('');
    setLoading(true);
    try {
      await loginPin(username.trim(), pin);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'PIN incorrect');
    } finally {
      setLoading(false);
    }
  };

  const pushPin = (digit: string) => {
    setError('');
    setPin((current) => (current.length >= 6 ? current : `${current}${digit}`));
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_48%,#e8f1ff_100%)] px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                <ShieldCheck size={28} />
              </div>
              <p className="text-sm font-semibold uppercase text-blue-200">NEWOTEG Admin</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight">Pilotage boutique et e-commerce</h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
                Connexion sécurisée pour les responsables, vendeurs et caissiers de la boutique.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="rounded-lg border border-white/10 p-3">
                <span className="block text-lg font-bold text-white">FCFA</span>
                Devise unique
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <span className="block text-lg font-bold text-white">PIN</span>
                Tablette boutique
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <span className="block text-lg font-bold text-white">Douala</span>
                Heure locale
              </div>
            </div>
          </aside>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                <ShieldCheck size={26} />
              </div>
              <h1 className="text-2xl font-bold">NEWOTEG Admin</h1>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold uppercase text-blue-700">Connexion</p>
              <h2 className="mt-2 text-3xl font-bold">Accès administrateur</h2>
            </div>

            {expired && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle size={18} />
                Session expirée. Connectez-vous à nouveau.
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('password');
                  setError('');
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === 'password' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mot de passe
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('pin');
                  setError('');
                }}
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  mode === 'pin' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                PIN boutique
              </button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">Nom d'utilisateur</label>
            <div className="relative mb-5">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="ex. admin"
                className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Mot de passe</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Votre mot de passe"
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-11 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !username.trim() || password.length < 8}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loading ? 'Connexion...' : 'Se connecter'}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">PIN</label>
                  <div className="flex h-14 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 font-mono text-2xl text-slate-900">
                    {pinDots}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => pushPin(digit)}
                      className="h-14 rounded-lg border border-slate-200 bg-white text-xl font-bold text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPin('')}
                    className="h-14 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    onClick={() => pushPin('0')}
                    className="h-14 rounded-lg border border-slate-200 bg-white text-xl font-bold text-slate-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setPin((current) => current.slice(0, -1))}
                    className="flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    aria-label="Supprimer le dernier chiffre"
                  >
                    <X size={22} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePinLogin}
                  disabled={loading || !username.trim() || pin.length < 4}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {loading ? 'Vérification...' : 'Entrer avec le PIN'}
                  {!loading && <Hash size={18} />}
                </button>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-slate-500">Accès réservé au personnel autorisé NEWOTEG.</p>
          </section>
        </section>
      </div>
    </main>
  );
};
