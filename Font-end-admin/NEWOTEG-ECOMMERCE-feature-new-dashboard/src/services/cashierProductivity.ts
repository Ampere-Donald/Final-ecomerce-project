export type SuspendedCart<TItem, TContext> = {
  id: string;
  createdAt: string;
  items: TItem[];
  context: TContext;
};

export type SaleMetricSummary = {
  completedSales: number;
  averageDurationMs: number;
  averageInteractions: number;
  lastDurationMs: number;
  lastInteractions: number;
};

const suspendedKey = (scope: string) => `newoteg_suspended_carts_${scope}`;
const metricsKey = (scope: string) => `newoteg_sale_metrics_${scope}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

export function listSuspendedCarts<TItem, TContext>(scope: string): SuspendedCart<TItem, TContext>[] {
  return readJson<SuspendedCart<TItem, TContext>[]>(suspendedKey(scope), []);
}

export function saveSuspendedCart<TItem, TContext>(
  scope: string,
  items: TItem[],
  context: TContext,
): SuspendedCart<TItem, TContext>[] {
  const entry: SuspendedCart<TItem, TContext> = {
    id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `cart-${Date.now()}`,
    createdAt: new Date().toISOString(),
    items,
    context,
  };
  const next = [entry, ...listSuspendedCarts<TItem, TContext>(scope)].slice(0, 10);
  localStorage.setItem(suspendedKey(scope), JSON.stringify(next));
  return next;
}

export function removeSuspendedCart<TItem, TContext>(
  scope: string,
  id: string,
): SuspendedCart<TItem, TContext>[] {
  const next = listSuspendedCarts<TItem, TContext>(scope).filter((entry) => entry.id !== id);
  localStorage.setItem(suspendedKey(scope), JSON.stringify(next));
  return next;
}

export function getSaleMetricSummary(scope: string): SaleMetricSummary {
  return readJson<SaleMetricSummary>(metricsKey(scope), {
    completedSales: 0,
    averageDurationMs: 0,
    averageInteractions: 0,
    lastDurationMs: 0,
    lastInteractions: 0,
  });
}

export function recordSaleMetric(scope: string, durationMs: number, interactions: number): SaleMetricSummary {
  const previous = getSaleMetricSummary(scope);
  const completedSales = previous.completedSales + 1;
  const next: SaleMetricSummary = {
    completedSales,
    averageDurationMs: Math.round(((previous.averageDurationMs * previous.completedSales) + durationMs) / completedSales),
    averageInteractions: Math.round(((previous.averageInteractions * previous.completedSales) + interactions) / completedSales),
    lastDurationMs: Math.round(durationMs),
    lastInteractions: interactions,
  };
  localStorage.setItem(metricsKey(scope), JSON.stringify(next));
  return next;
}
