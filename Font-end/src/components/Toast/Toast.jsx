import { useCart } from '../../context/CartContext';
import './Toast.scss';

const Toast = () => {
    const { toast } = useCart();

    if (!toast) return null;

    return (
        <div className="toast" role="alert" aria-live="polite">
            <div className="toast__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
            </div>
            <span className="toast__message">{toast.message}</span>
        </div>
    );
};

export default Toast;
