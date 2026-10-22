import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  cataloguePricingApi,
  type PricingSummary,
} from '../services/cataloguePricing';

const PricingContext = createContext<{
  summary: PricingSummary | null;
  refresh: () => void;
}>({ summary: null, refresh: () => {} });
export const CataloguePricingProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [summary, setSummary] = useState<PricingSummary | null>(null);
  const refresh = useCallback(() => {
    window.dispatchEvent(new Event('catalogue-pricing-updated'));
  }, []);
  useEffect(() => {
    let current = true;
    let controller: AbortController | undefined;
    const load = () => {
      controller?.abort();
      controller = new AbortController();
      cataloguePricingApi
        .list({ limit: 1 }, controller.signal)
        .then((result) => {
          if (current) setSummary(result.summary);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    window.addEventListener('catalogue-pricing-updated', load);
    window.addEventListener('online', load);
    return () => {
      current = false;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener('catalogue-pricing-updated', load);
      window.removeEventListener('online', load);
    };
  }, []);
  return (
    <PricingContext.Provider value={{ summary, refresh }}>
      {children}
    </PricingContext.Provider>
  );
};
export const useCataloguePricing = () => useContext(PricingContext);
