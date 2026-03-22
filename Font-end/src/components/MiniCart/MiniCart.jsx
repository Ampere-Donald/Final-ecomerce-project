import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useI18n } from '../../context/I18nContext';
import { formatFCFA } from '../../utils/formatFCFA';
import { PLACEHOLDER_IMG } from '../../utils/mapProduct';
import './MiniCart.scss';

const MiniCart = () => {
  const {
    cartItems, cartCount, cartTotal,
    updateQuantity, removeFromCart,
    isCartOpen, closeCart,
  } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Body scroll lock
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <>
      <div
        className={`mini-cart__overlay ${isCartOpen ? 'mini-cart__overlay--open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside className={`mini-cart ${isCartOpen ? 'mini-cart--open' : ''}`} aria-label={t('drawer.cart')}>
        {/* Header */}
        <div className="mini-cart__header">
          <h2 className="mini-cart__title">
            <ShoppingBag size={20} />
            {t('drawer.cart')} {cartCount > 0 && <span className="mini-cart__count">({cartCount})</span>}
          </h2>
          <button className="mini-cart__close" onClick={closeCart} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="mini-cart__body">
          {cartItems.length === 0 ? (
            <div className="mini-cart__empty">
              <ShoppingBag size={48} strokeWidth={1} />
              <p>{t('checkout.emptyCartDesc')}</p>
              <Link to="/catalogue" className="mini-cart__browse-btn" onClick={closeCart}>
                {t('checkout.browseCatalogue')}
              </Link>
            </div>
          ) : (
            <ul className="mini-cart__list">
              {cartItems.map((item) => (
                <li key={item.code} className="mini-cart__item">
                  <div className="mini-cart__item-image">
                    <img
                      src={item.image || PLACEHOLDER_IMG}
                      alt={item.model}
                      onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                    />
                  </div>
                  <div className="mini-cart__item-info">
                    <p className="mini-cart__item-name">{item.model}</p>
                    <p className="mini-cart__item-price">{formatFCFA(item.retailPrice)}</p>
                    <div className="mini-cart__item-controls">
                      <button
                        className="mini-cart__qty-btn"
                        onClick={() => updateQuantity(item.code, item.quantity - 1)}
                        aria-label="Diminuer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="mini-cart__qty-value">{item.quantity}</span>
                      <button
                        className="mini-cart__qty-btn"
                        onClick={() => updateQuantity(item.code, item.quantity + 1)}
                        aria-label="Augmenter"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="mini-cart__remove-btn"
                        onClick={() => removeFromCart(item.code)}
                        aria-label="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <span className="mini-cart__item-subtotal">
                    {formatFCFA(item.retailPrice * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="mini-cart__footer">
            <div className="mini-cart__total">
              <span>Total</span>
              <span className="mini-cart__total-price">{formatFCFA(cartTotal)}</span>
            </div>
            <button className="mini-cart__checkout-btn" onClick={handleCheckout}>
              {t('checkout.stepPayment')} &rarr;
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default MiniCart;
