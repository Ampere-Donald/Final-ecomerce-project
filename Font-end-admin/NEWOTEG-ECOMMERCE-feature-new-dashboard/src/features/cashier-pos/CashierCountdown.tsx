import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';

export function CashierCountdown({ date }: { date: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, new Date(date).getTime() - now);
  const urgent = remaining < 180_000;
  const label = remaining === 0
    ? 'Expiré'
    : `${String(Math.floor(remaining / 60_000)).padStart(2, '0')}:${String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0')}`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${urgent ? 'text-red-600' : 'text-amber-700'}`}>
      <Clock3 size={13} />
      {label}
    </span>
  );
}
