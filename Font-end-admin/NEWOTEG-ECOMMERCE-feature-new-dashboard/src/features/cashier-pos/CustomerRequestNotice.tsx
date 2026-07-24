import { CheckCircle2, MessageSquareText } from 'lucide-react';

interface CustomerRequestNoticeProps {
  request?: string | null;
  compact?: boolean;
  acknowledged?: boolean;
  onAcknowledgedChange?: (acknowledged: boolean) => void;
}

export function CustomerRequestNotice({
  request,
  compact = false,
  acknowledged = false,
  onAcknowledgedChange,
}: CustomerRequestNoticeProps) {
  const value = request?.trim();
  if (!value) return null;

  if (compact) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
        <MessageSquareText size={15} className="mt-0.5 shrink-0 text-amber-700" />
        <span className="line-clamp-2">
          <strong>Demande client :</strong> {value}
        </span>
      </div>
    );
  }

  return (
    <section
      aria-label="Demande du client"
      className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm">
          <MessageSquareText size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-amber-700">
            Demande du client
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium">{value}</p>
        </div>
      </div>

      {onAcknowledgedChange && (
        <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg bg-white px-3 text-sm font-bold text-slate-800">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => onAcknowledgedChange(event.target.checked)}
            className="h-5 w-5 accent-emerald-600"
          />
          <CheckCircle2 size={18} className={acknowledged ? 'text-emerald-600' : 'text-slate-400'} />
          Demande prise en compte
        </label>
      )}
    </section>
  );
}
