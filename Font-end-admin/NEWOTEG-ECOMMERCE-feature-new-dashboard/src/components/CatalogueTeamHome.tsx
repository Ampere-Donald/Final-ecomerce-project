import { BookOpen, ChevronRight, PackageSearch, ScanBarcode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { PricingProgressCard } from './PricingProgressCard';

export function CatalogueTeamHome() {
  const { admin } = useAdminAuth();
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header><p className="admin-eyebrow">Espace responsable</p><h1 className="admin-page-title">Bonjour {admin?.nom || admin?.username}</h1><p className="mt-2 text-sm leading-6 text-slate-600">Retrouvez un article et partagez les prix que vous connaissez avec toute la boutique.</p></header>
      <PricingProgressCard />
      <section aria-label="Votre espace de travail" className="grid gap-3 sm:grid-cols-2">
        {[
          { to: '/produits', icon: PackageSearch, title: 'Consulter le catalogue', detail: 'Articles, références, prix et disponibilité' },
          { to: '/scan-code', icon: ScanBarcode, title: 'Scanner un article', detail: 'Retrouver un produit par son code' },
          { to: '/guide', icon: BookOpen, title: 'Guide de la boutique', detail: 'Retrouver les étapes et les bonnes pratiques' },
        ].map(({ to, icon: Icon, title, detail }) => <Link key={to} to={to} className="surface flex min-h-24 items-center gap-3 p-4 hover:border-indigo-200"><span className="rounded-xl bg-indigo-50 p-3 text-primary"><Icon size={22} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span><ChevronRight size={18} className="shrink-0 text-slate-400" /></Link>)}
      </section>
    </div>
  );
}
