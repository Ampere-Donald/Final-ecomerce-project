import { ShoppingBag, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import useSwipe from '../../hooks/useSwipe';
import './Toast.scss';

const ICONS = {
  success: <CheckCircle2 size={18} />,
  error: <AlertTriangle size={18} />,
  info: <Info size={18} />,
  cart: <ShoppingBag size={18} />,
};

const ToastItem = ({ toast, onDismiss }) => {
  const swipeHandlers = useSwipe(
    () => onDismiss(toast.id),
    () => onDismiss(toast.id),
    40
  );

  return (
    <div
      className={`toast toast--${toast.type || 'success'}`}
      role="alert"
      aria-live="polite"
      {...swipeHandlers}
    >
      <div className="toast__icon">
        {ICONS[toast.type] || ICONS.success}
      </div>
      <span className="toast__message">{toast.message}</span>
      <button className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Fermer">
        <X size={14} />
      </button>
      <div className="toast__progress" />
    </div>
  );
};

const Toast = () => {
  const { toasts, dismissToast } = useCart();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
      ))}
    </div>
  );
};

export default Toast;
