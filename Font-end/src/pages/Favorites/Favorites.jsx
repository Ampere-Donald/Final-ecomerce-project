import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { useI18n } from '../../context/I18nContext';
import { formatFCFA } from '../../utils/formatFCFA';
import Footer from '../../components/Footer/Footer';
import './Favorites.scss';

const Favorites = () => {
  const { favorites, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const { t } = useI18n();

  const getImageUrl = (product) => {
    if (!product.image) return '/placeholder.png';
    if (product.image.startsWith('http')) return product.image;
    return `${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}${product.image}`;
  };

  return (
    <>
      <Helmet>
        <title>{t('favorites.metaTitle')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="favorites container">
        <div className="favorites__header">
          <h1>{t('favorites.title')}</h1>
          <p>{favorites.length === 1 ? t('favorites.productCount_one', { count: favorites.length }) : t('favorites.productCount_other', { count: favorites.length })}</p>
        </div>

        {favorites.length === 0 ? (
          <div className="favorites__empty">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={{ margin: '0 auto 1rem', opacity: 0.7 }}>
              <circle cx="60" cy="60" r="56" stroke="#E5E7EB" strokeWidth="2" strokeDasharray="6 4" />
              <path d="M60 85L38 63C32 57 32 47 38 41C44 35 54 35 60 43C66 35 76 35 82 41C88 47 88 57 82 63L60 85Z" stroke="#2A2FCE" strokeWidth="2" fill="rgba(42,47,206,0.06)" strokeLinejoin="round" />
            </svg>
            <h3>{t('favorites.emptyTitle')}</h3>
            <p>{t('favorites.emptyDesc')}</p>
            <Link to="/catalogue">{t('favorites.browseCatalogue')}</Link>
          </div>
        ) : (
          <div className="favorites__grid">
            {favorites.map(product => (
              <div key={product.code} className="favorites__card">
                <Link to={`/product/${product.code}`}>
                  <img
                    src={getImageUrl(product)}
                    alt={product.model}
                    className="favorites__image"
                    onError={e => { e.target.src = '/placeholder.png'; }}
                  />
                </Link>
                <div className="favorites__body">
                  <p className="favorites__category">{product.categoryName}</p>
                  <Link to={`/product/${product.code}`}>
                    <p className="favorites__name">{product.model}</p>
                  </Link>
                  <p className="favorites__price">{formatFCFA(product.retailPrice)}</p>
                  <div className="favorites__actions">
                    <button
                      className="favorites__btn favorites__btn--primary"
                      onClick={() => addToCart(product, 1)}
                    >
                      <ShoppingCart size={14} /> {t('favorites.addBtn')}
                    </button>
                    <button
                      className="favorites__btn favorites__btn--remove"
                      onClick={() => toggleFavorite(product)}
                    >
                      <Trash2 size={14} /> {t('favorites.removeBtn')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
};

export default Favorites;
