import { MessageSquareText } from 'lucide-react';

const QUICK_REQUESTS = [
  'Facture demandée',
  'Bon de vente demandé',
  'Emballage séparé',
  'Appeler avant validation',
];

interface CustomerRequestFieldProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function CustomerRequestField({
  value,
  onChange,
  maxLength = 500,
}: CustomerRequestFieldProps) {
  const addQuickRequest = (request: string) => {
    const parts = value
      .split(' · ')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.includes(request)) return;
    onChange([...parts, request].join(' · ').slice(0, maxLength));
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
      <label htmlFor="customer-request" className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <MessageSquareText size={17} className="text-amber-700" />
        Demande du client
      </label>
      <p id="customer-request-help" className="mt-1 text-xs text-slate-600">
        Elle sera mise en évidence pour le caissier avant le paiement.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_REQUESTS.map((request) => (
          <button
            key={request}
            type="button"
            onClick={() => addQuickRequest(request)}
            className="min-h-8 rounded-full border border-amber-200 bg-white px-2.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
          >
            + {request}
          </button>
        ))}
      </div>
      <textarea
        id="customer-request"
        aria-describedby="customer-request-help customer-request-count"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        rows={2}
        placeholder="Ex. Le client souhaite une facture et un emballage séparé."
        className="mt-2 w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15"
      />
      <p id="customer-request-count" className="mt-1 text-right text-[10px] text-slate-500">
        {value.length}/{maxLength}
      </p>
    </section>
  );
}
