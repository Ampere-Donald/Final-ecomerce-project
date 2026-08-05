import { Banknote, CreditCard, HandCoins, Smartphone } from 'lucide-react';
import { CHECKOUT_PAYMENT_METHODS } from '../pos-shared/paymentMethods';
import type { PaymentMethod } from './types';

const icons = {
  ESPECES: Banknote,
  MTN_MOBILE_MONEY: Smartphone,
  ORANGE_MOBILE_MONEY: Smartphone,
  CARTE: CreditCard,
  CREDIT: HandCoins,
};

const operatorStyle = {
  MTN: 'bg-[#ffcb05] text-slate-950',
  ORANGE: 'bg-[#ff7900] text-white',
};

export function CashierPaymentMethodSelector({
  value,
  onChange,
  desktop = false,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  desktop?: boolean;
}) {
  return (
    <div className={desktop ? 'mt-3 grid grid-cols-5 border-b border-slate-200' : 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3'}>
      {CHECKOUT_PAYMENT_METHODS.map(item => {
        const Icon = icons[item.id];
        const active = value === item.id;
        const icon = item.operator ? (
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${operatorStyle[item.operator]}`} aria-hidden="true">
            <Icon size={desktop ? 23 : 18} />
          </span>
        ) : <Icon size={desktop ? 28 : 18} aria-hidden="true" />;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-pressed={active}
            className={desktop
              ? `flex min-h-20 flex-col items-center justify-center gap-2 border-b-4 text-sm font-medium ${active ? 'border-primary bg-indigo-50 text-slate-950' : 'border-transparent text-slate-600'}`
              : `flex min-h-14 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold ${active ? 'border border-primary bg-indigo-50 text-primary' : 'border border-slate-200 bg-white text-slate-600'}`}
          >
            {icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
