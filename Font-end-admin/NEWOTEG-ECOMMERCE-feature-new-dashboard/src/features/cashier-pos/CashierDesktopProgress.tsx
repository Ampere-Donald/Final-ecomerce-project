import { Check } from 'lucide-react';
import type { CheckoutStep } from './types';

const steps: { id: Exclude<CheckoutStep, 'QUEUE' | 'SUCCESS'> | 'SUCCESS'; label: string }[] = [
  { id: 'TICKET', label: 'Ticket' },
  { id: 'CUSTOMER', label: 'Client' },
  { id: 'PAYMENT', label: 'Paiement' },
  { id: 'SUCCESS', label: 'Document' },
];

const positions: Record<CheckoutStep, number> = {
  QUEUE: 0,
  TICKET: 0,
  CUSTOMER: 1,
  PAYMENT: 2,
  SUCCESS: 3,
};

export function CashierDesktopProgress({ step }: { step: CheckoutStep }) {
  const active = positions[step];

  return (
    <nav aria-label="Progression de l’encaissement" className="border-b border-slate-200 bg-white px-7 py-5">
      <ol className="relative grid grid-cols-4">
        <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-8 h-px bg-slate-200" />
        <span aria-hidden className="absolute left-[12.5%] top-8 h-px bg-emerald-500 transition-[width] duration-300" style={{ width: `${Math.max(0, active) * 25}%` }} />
        {steps.map((item, index) => {
          const complete = index < active;
          const current = index === active;
          return (
            <li key={item.id} aria-current={current ? 'step' : undefined} className="relative text-center">
              <span className={`text-sm font-semibold ${current ? 'text-primary' : complete ? 'text-slate-800' : 'text-slate-500'}`}>{item.label}</span>
              <span className={`relative mx-auto mt-3 flex h-4 w-4 items-center justify-center rounded-full border-2 ${complete ? 'border-emerald-600 bg-emerald-600 text-white' : current ? 'border-primary bg-primary' : 'border-slate-200 bg-slate-200'}`}>
                {complete && <Check size={10} strokeWidth={4} />}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
