import { ArrowUpRight, ClipboardCheck, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCataloguePricing } from '../context/CataloguePricingContext';

export const PricingProgressCard = () => {
  const { summary } = useCataloguePricing();
  const progress = summary?.totalCount
    ? Math.round((summary.pricedCount / summary.totalCount) * 100)
    : 0;
  return (
    <section className="space-y-3" aria-label="Contrôle du catalogue">
      <Link to="/revision-catalogue" className="flex min-h-28 flex-col gap-4 rounded-2xl border border-primary/20 bg-white p-5 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardCheck size={24} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Révision générale du catalogue</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-slate-950">Vérifier les prix et le classement</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Contrôlez les articles déjà tarifés, proposez des corrections et retrouvez les contributions de l’équipe.</p>
        </div>
        <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white">Vérifier le catalogue <ArrowUpRight size={18} aria-hidden="true" /></span>
      </Link>
      {summary && summary.missingCount > 0 && (
    <Link to="/prix-a-renseigner" className="pricing-invitation group">
      <span className="pricing-invitation-icon">
        <Tags size={23} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
          Le catalogue se construit en équipe
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold text-slate-950">
          {summary.missingCount.toLocaleString('fr-FR')} articles attendent leur
          prix
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Vous connaissez un prix ? Renseignez-le pour faire avancer le catalogue
          de la boutique.
        </p>
      </div>
      <div className="w-full sm:w-40">
        <div className="mb-2 flex justify-between text-xs font-medium text-slate-600">
          <span>Catalogue tarifé</span>
          <span>{progress} %</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-indigo-100">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <ArrowUpRight
        className="hidden shrink-0 text-primary sm:block"
        size={22}
      />
    </Link>
      )}
    </section>
  );
};
