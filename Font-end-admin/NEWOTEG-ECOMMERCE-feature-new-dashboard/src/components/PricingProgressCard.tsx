import { ArrowUpRight, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCataloguePricing } from '../context/CataloguePricingContext';

export const PricingProgressCard = () => {
  const { summary } = useCataloguePricing();
  if (!summary || summary.missingCount === 0) return null;
  const progress = summary.totalCount
    ? Math.round((summary.pricedCount / summary.totalCount) * 100)
    : 0;
  return (
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
  );
};
