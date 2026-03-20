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
    return `http://localhost:3000${product.image}`;
  };

  return (
    <>
      <Helmet><title>{t('favorites.metaTitle')}</title></Helmet>
      <div className="favorites container">
        <div className="favorites__header">
          <h1>{t('favorites.title')}</h1>
          <p>{favorites.length === 1 ? t('favorites.productCount_one', { count: favorites.length }) : t('favorites.productCount_other', { count: favorites.length })}</p>
        </div>

        {favorites.length === 0 ? (
          <div className="favorites__empty">
            <Heart size={48} />
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
