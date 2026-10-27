import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export const WorkspaceLoading = () => (
  <div className="space-y-4 py-4" role="status" aria-label="Chargement de la page">
    <p className="flex items-center gap-2 text-sm text-slate-600"><RefreshCw size={16} className="animate-spin" />Chargement de la page…</p>
    <div className="skeleton h-8 w-2/3 max-w-sm" />
    <div className="skeleton h-24 w-full" /><div className="skeleton h-56 w-full" />
  </div>
);

class ScreenBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Écran Newoteg indisponible', error, info.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section role="alert" className="surface mx-auto max-w-lg p-5 sm:p-8">
        <AlertTriangle className="mb-4 text-amber-600" size={28} />
        <h1 className="text-xl font-semibold">Cette page n’a pas pu se charger</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Vérifiez la connexion. Si l’application vient d’être mise à jour, rechargez-la pour ouvrir la nouvelle version.</p>
        <p className="mt-2 text-xs text-slate-500">Une saisie non enregistrée sur cet écran devra être reprise.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="admin-button-primary" onClick={() => window.location.reload()}><RefreshCw size={16} />Recharger l’application</button>
          <Link to="/" className="admin-button-secondary"><ArrowLeft size={16} />Accueil</Link>
        </div>
      </section>
    );
  }
}

// A lazy route must never unmount the menu, header or bottom navigation.
export const WorkspaceScreen = ({ children, routeKey }: { children: ReactNode; routeKey: string }) => (
  <ScreenBoundary key={routeKey}><Suspense fallback={<WorkspaceLoading />}>{children}</Suspense></ScreenBoundary>
);

export const WorkspaceNotFound = () => (
  <section className="surface mx-auto max-w-lg p-6">
    <h1 className="text-xl font-semibold">Rubrique introuvable</h1>
    <p className="mt-2 text-sm leading-6 text-slate-600">Ouvrez le menu pour retrouver les rubriques disponibles avec votre compte.</p>
    <Link to="/" className="admin-button-primary mt-5"><ArrowLeft size={16} />Revenir à l’accueil</Link>
  </section>
);
