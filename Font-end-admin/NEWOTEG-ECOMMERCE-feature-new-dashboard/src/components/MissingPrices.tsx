import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Tags,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  cataloguePricingApi,
  formatFcfa,
  parseFcfaInput,
  type PricingProduct,
  type PricingResult,
} from '../services/cataloguePricing';
import { getApiErrorMessage } from '../services/api';
import { useCataloguePricing } from '../context/CataloguePricingContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useToast } from './ui/Toast';

type PriceDraft = { detail: string; demi: string; gros: string };
const EMPTY_DRAFT: PriceDraft = { detail: '', demi: '', gros: '' };

const PriceRow = ({
  product,
  onSave,
  online,
  draft,
  onDraft,
}: {
  product: PricingProduct;
  draft: PriceDraft;
  onDraft: (draft: PriceDraft) => void;
  onSave: (
    product: PricingProduct,
    values: { prixDetail: number; prixDemiGros?: number; prixGros?: number },
  ) => Promise<void>;
  online: boolean;
}) => {
  const { detail, demi, gros } = draft;
  const setDetail = (value: string) => onDraft({ ...draft, detail: value });
  const setDemi = (value: string) => onDraft({ ...draft, demi: value });
  const setGros = (value: string) => onDraft({ ...draft, gros: value });
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || !online) return;
    const prixDetail = parseFcfaInput(detail),
      prixDemiGros = demi.trim() ? parseFcfaInput(demi) : undefined,
      prixGros = gros.trim() ? parseFcfaInput(gros) : undefined;
    if (!prixDetail || prixDemiGros === null || prixGros === null) {
      setError('Saisissez un montant positif en FCFA, sans décimales.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(product, {
        prixDetail,
        ...(prixDemiGros ? { prixDemiGros } : {}),
        ...(prixGros ? { prixGros } : {}),
      });
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Le prix n’a pas été enregistré. Réessayez.'),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className="pricing-product" aria-label={product.nomProduit}>
      <div className="pricing-product-identity">
        <div className="pricing-product-image">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Package size={26} className="text-slate-300" />
          )}
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-slate-500">{product.categorie.nom}</p>
          <h2 className="font-semibold leading-snug text-slate-900">
            {product.nomProduit}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="break-all font-mono">
              {product.code || 'Sans référence'}
              {product.marque ? ` · ${product.marque}` : ''}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {product.estActif ? 'Article publié' : 'Brouillon · non publié'}
            </span>
            <span
              className={
                product.quantiteStock > 0
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }
            >
              {product.quantiteStock > 0
                ? `${product.quantiteStock} en stock`
                : 'Sans stock'}
            </span>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="pricing-product-form">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1" htmlFor={`price-${product.id}`}>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Prix détail <span className="font-normal">/ unité</span>
            </span>
            <span className="relative block">
              <input
                id={`price-${product.id}`}
                className="field pr-14 font-mono font-medium"
                value={detail}
                onChange={(event) => {
                  setDetail(event.target.value);
                  setError('');
                }}
                placeholder="Ex. 1 500"
                inputMode="numeric"
                maxLength={14}
                required
                disabled={saving}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `error-${product.id}` : undefined}
                autoComplete="off"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                FCFA
              </span>
            </span>
          </label>
          <button
            type="submit"
            className="admin-button-primary shrink-0"
            disabled={saving || !online}
            aria-label={`Enregistrer le prix de ${product.nomProduit}`}
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Check size={17} />
            )}
            <span>Valider</span>
          </button>
        </div>
        <button
          type="button"
          className="mt-2 flex min-h-11 items-center gap-1 text-xs font-medium text-slate-500 hover:text-primary"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={`tiers-${product.id}`}
        >
          <ChevronDown size={14} className={expanded ? 'rotate-180' : ''} />
          Tarifs demi-gros et gros{' '}
          <span className="font-normal">(facultatif)</span>
        </button>
        {expanded && (
          <div
            id={`tiers-${product.id}`}
            className="mt-2 grid grid-cols-2 gap-3"
          >
            {[
              {
                name: 'Demi-gros',
                key: 'demi',
                existing: product.prixDemiGros,
                value: demi,
                set: setDemi,
              },
              {
                name: 'Gros',
                key: 'gros',
                existing: product.prixGros,
                value: gros,
                set: setGros,
              },
            ].map((tier) => (
              <label
                key={tier.key}
                className="text-xs font-medium text-slate-600"
              >
                {tier.name} · FCFA
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  value={
                    tier.existing && tier.existing > 0
                      ? tier.existing
                      : tier.value
                  }
                  onChange={(event) => tier.set(event.target.value)}
                  disabled={saving || (tier.existing ?? 0) > 0}
                  placeholder="Non renseigné"
                  maxLength={14}
                />
                {(tier.existing ?? 0) > 0 && (
                  <span className="mt-1 block text-[11px] font-normal">
                    Tarif existant conservé
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
        {error && (
          <p
            id={`error-${product.id}`}
            role="alert"
            className="mt-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </form>
    </article>
  );
};

export const MissingPrices = () => {
  const [result, setResult] = useState<PricingResult | null>(null);
  const [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [inStock, setInStock] = useState(false),
    [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [conflict, setConflict] = useState('');
  const online = useOnlineStatus(),
    { refresh } = useCataloguePricing(),
    toast = useToast();
  const request = useRef<AbortController | null>(null);
  const categoryNames = useRef(new Map<string, string>());
  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>({});
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const data = await cataloguePricingApi.list(
        {
          page,
          limit: 18,
          search: search || undefined,
          categoryId: category || undefined,
          inStock: inStock ? 'true' : undefined,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        data.categories.forEach(item => categoryNames.current.set(item.id, item.nom));
        setResult(data);
        if (page > 1 && !data.data.length) setPage((value) => value - 1);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        setError(
          status === 404 || (status !== undefined && status >= 500)
            ? 'La rubrique des prix est temporairement indisponible. Réessayez dans quelques instants.'
            : getApiErrorMessage(
                err,
                'La liste n’a pas pu être chargée. Vérifiez votre connexion.',
              ),
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [page, search, category, inStock]);
  const latestLoad = useRef(load);
  latestLoad.current = load;
  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);
  useEffect(() => {
    const onFocus = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);
  const save = async (
    product: PricingProduct,
    prices: { prixDetail: number; prixDemiGros?: number; prixGros?: number },
  ) => {
    try {
      await cataloguePricingApi.complete(product.id, {
        version: product.version,
        ...prices,
      });
      toast.success(
        `${product.nomProduit} : ${formatFcfa(prices.prixDetail)} enregistré.`,
      );
      setResult((previous) =>
        previous
          ? {
              ...previous,
              data: previous.data.filter((row) => row.id !== product.id),
            }
          : previous,
      );
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[product.id];
        return next;
      });
      refresh();
      await latestLoad.current();
      window.requestAnimationFrame?.(() => {
        const next = document.querySelector<HTMLElement>('.pricing-product input[id^="price-"]') || document.getElementById('missing-prices-title');
        next?.focus({ preventScroll: false });
      });
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.status === 404) {
        setConflict(
          getApiErrorMessage(
            err,
            'Cet article a été modifié par un autre membre.',
          ),
        );
        refresh();
        await latestLoad.current();
      }
      throw err;
    }
  };
  const summary = result?.summary,
    percentage = summary?.totalCount
      ? Math.round((summary.pricedCount / summary.totalCount) * 100)
      : 0;
  const filtered = Boolean(search || category || inStock);
  const displayCategories = [...(result?.categories || [])];
  // Keep the active filter visible when its last missing price has just been saved.
  if (category && !displayCategories.some(item => item.id === category)) {
    displayCategories.push({ id: category, nom: categoryNames.current.get(category) || 'Catégorie sélectionnée', count: 0 });
  }
  return (
    <div className="pricing-workspace space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="admin-eyebrow">
            <Tags size={14} /> Chantier catalogue
          </p>
          <h1 id="missing-prices-title" tabIndex={-1} className="admin-page-title">Prix à renseigner</h1>
          <p className="mt-2 hidden max-w-2xl text-sm leading-relaxed text-slate-600 sm:block">
            Le savoir de la boutique, dans le catalogue. Retrouvez un article,
            indiquez son prix et passez au suivant.
          </p>
        </div>
        <button
          className="admin-button-secondary"
          aria-label="Actualiser les prix manquants"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </header>
      <section
        className="pricing-overview"
        aria-label="Avancement du catalogue"
      >
        <div>
          <p className="text-xs font-medium text-slate-500">
            Articles à compléter
          </p>
          <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-slate-950">
            {summary ? summary.missingCount.toLocaleString('fr-FR') : '—'}
            <span className="ml-3 text-sm font-normal tracking-normal text-slate-500">
              prix manquants
            </span>
          </p>
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-700">Catalogue tarifé</span>
            <span className="font-semibold text-primary">
              {summary ? `${percentage} %` : '—'}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Articles avec un prix"
            aria-valuenow={summary ? percentage : undefined}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {summary
              ? `${summary.pricedCount.toLocaleString('fr-FR')} sur ${summary.totalCount.toLocaleString('fr-FR')} articles ont un prix détail`
              : loading ? 'Chargement de la progression…' : 'Progression indisponible'}
          </p>
        </div>
        <div className="hidden items-start gap-3 text-sm text-slate-600 sm:flex">
          <Users size={20} className="mt-0.5 shrink-0 text-primary" />
          <p>
            Accessible à toute l’équipe.
            <br />
            <span className="text-xs text-slate-500">
              Chaque saisie est enregistrée avec son auteur.
            </span>
          </p>
        </div>
      </section>
      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs leading-relaxed text-indigo-950 sm:p-4 sm:text-sm">
        <CircleHelp size={18} className="mt-0.5 shrink-0 text-primary" />
        <p>
          Renseignez le <strong>prix de vente détail d’une unité</strong>, en
          FCFA. L’article quittera cette liste. Pour un article déjà publié, le
          prix sera visible sur le site. Les brouillons restent non publiés.{' '}
          <span className="hidden sm:inline">
            Les prix existants sont conservés.
          </span>
        </p>
      </div>
      {!online && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          <WifiOff size={18} />
          Connexion nécessaire pour enregistrer les prix. Vos champs restent
          affichés.
        </p>
      )}
      {conflict && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p>{conflict}</p>
          <button
            aria-label="Fermer le message"
            onClick={() => setConflict('')}
          >
            <X size={18} />
          </button>
        </div>
      )}
      <div className="pricing-columns">
        <aside
          className="pricing-categories hidden xl:block"
          aria-label="Catégories à compléter"
        >
          <p className="admin-eyebrow mb-3">Par catégorie</p>
          <div className="pricing-category-list">
            <button
              onClick={() => {
                setCategory('');
                setPage(1);
              }}
              aria-pressed={!category}
              className={`pricing-category ${!category ? 'is-selected' : ''}`}
            >
              <span>Toutes les catégories</span>
              <span>{summary?.missingCount ?? '—'}</span>
            </button>
            {displayCategories.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCategory(item.id);
                  setPage(1);
                }}
                aria-pressed={category === item.id}
                className={`pricing-category ${category === item.id ? 'is-selected' : ''}`}
              >
                <span>{item.nom}</span>
                <span>{item.count}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="min-w-0" aria-label="Articles sans prix">
          <div className="pricing-toolbar">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Rechercher un article sans prix</span>
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="field pl-10"
                placeholder="Nom, référence ou marque…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
              />
            </label>
            <label className="min-w-0 flex-1 xl:hidden">
              <span className="sr-only">Filtrer par catégorie</span>
              <select
                className="field"
                aria-label="Filtrer par catégorie"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Toutes les catégories</option>
                {displayCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nom} ({item.count})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) => {
                  setInStock(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 accent-primary"
              />
              En stock
            </label>
          </div>
          <div className="mb-3 mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              {result
                ? `${result.total.toLocaleString('fr-FR')} article${result.total === 1 ? '' : 's'}${filtered ? ' correspondant aux filtres' : ' à compléter'}`
                : loading ? 'Chargement des articles…' : 'Liste indisponible'}
            </p>
            {loading && result && (
              <span className="flex items-center gap-1">
                <Loader2 className="animate-spin" size={13} />
                Mise à jour
              </span>
            )}
          </div>
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <p>{error}</p>
              <button
                className="mt-2 font-semibold underline"
                onClick={() => void load()}
              >
                Réessayer
              </button>
            </div>
          )}
          {loading && !result ? (
            <div
              role="status"
              className="surface flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"
            >
              <Loader2 className="animate-spin" size={20} />
              Chargement des articles sans prix…
            </div>
          ) : result?.data.length ? (
            <div className="pricing-products">
              {result.data.map((product) => (
                <PriceRow
                  key={product.id}
                  product={product}
                  onSave={save}
                  online={online}
                  draft={drafts[product.id] || EMPTY_DRAFT}
                  onDraft={(draft) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [product.id]: draft,
                    }))
                  }
                />
              ))}
            </div>
          ) : (
            !error && (
              <div className="surface px-5 py-14 text-center">
                <CheckCheck
                  size={36}
                  className="mx-auto mb-4 text-emerald-600"
                />
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  {filtered
                    ? 'Aucun article pour ces filtres'
                    : 'Tous les prix sont renseignés'}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  {filtered
                    ? 'Essayez une autre recherche ou revenez à l’ensemble du catalogue.'
                    : 'Merci à toute l’équipe. Les prochains articles sans prix apparaîtront automatiquement ici.'}
                </p>
                {filtered && (
                  <button
                    className="admin-button-secondary mx-auto mt-5"
                    onClick={() => {
                      setQuery('');
                      setSearch('');
                      setCategory('');
                      setInStock(false);
                      setPage(1);
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )
          )}
          {(result?.totalPages ?? 0) > 1 && (
            <nav
              className="mt-5 flex flex-wrap items-center justify-between gap-2"
              aria-label="Pagination des articles"
            >
              <button
                className="admin-button-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft size={16} />
                Précédent
              </button>
              <span className="text-xs text-slate-500">
                Page {page} sur {result?.totalPages}
              </span>
              <button
                className="admin-button-secondary"
                disabled={page >= (result?.totalPages || 1) || loading}
                onClick={() => setPage((value) => value + 1)}
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </section>
      </div>
      {Boolean(result?.recentActivity.length) && (
        <section
          className="surface p-5 sm:p-6"
          aria-labelledby="pricing-history-title"
        >
          <div className="mb-4 flex items-center gap-2">
            <CheckCheck size={18} className="text-emerald-600" />
            <h2
              id="pricing-history-title"
              className="font-semibold text-slate-900"
            >
              Derniers prix renseignés par l’équipe
            </h2>
          </div>
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {result!.recentActivity.map((item) => (
              <div
                key={item.id}
                className="min-w-0 border-t border-slate-100 pt-3"
              >
                <p
                  className="truncate text-sm font-medium text-slate-800"
                  title={item.productName}
                >
                  {item.productName}
                </p>
                <div className="mt-1 flex flex-wrap justify-between gap-1 text-xs text-slate-500">
                  <span>
                    {item.author} ·{' '}
                    {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Africa/Douala',
                    })}
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {formatFcfa(item.prixDetail)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
