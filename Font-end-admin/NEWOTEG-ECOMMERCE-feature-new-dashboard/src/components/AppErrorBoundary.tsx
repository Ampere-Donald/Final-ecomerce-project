import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erreur interface Newoteg', { error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background-light p-4">
        <section className="surface w-full max-w-md p-6 text-center" role="alert">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-700">
            <AlertTriangle size={24} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">L’écran n’a pas pu s’afficher</h1>
          <p className="mt-2 text-sm text-slate-600">
            Votre opération enregistrée n’est pas supprimée. Rechargez l’application pour reprendre.
          </p>
          <button type="button" onClick={() => window.location.reload()}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white">
            <RefreshCw size={16} /> Recharger
          </button>
        </section>
      </main>
    );
  }
}
