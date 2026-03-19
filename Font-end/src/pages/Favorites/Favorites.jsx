import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { formatFCFA } from '../../utils/formatFCFA';
import Footer from '../../components/Footer/Footer';
import './Favorites.scss';

const Favorites = () => {
  const { favorites, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();

  const getImageUrl = (product) => {
    if (!product.image) return '/placeholder.png';
    if (product.image.startsWith('http')) return product.image;
    return `http://localhost:3000${product.image}`;
  };

  return (
    <>
      <Helmet><title>Mes Favoris — NEWOTEG</title></Helmet>
      <div className="favorites container">
        <div className="favorites__header">
          <h1>Mes Favoris</h1>
          <p>{favorites.length} produit{favorites.length !== 1 ? 's' : ''}</p>
        </div>

        {favorites.length === 0 ? (
          <div className="favorites__empty">
            <Heart size={48} />
            <h3>Aucun favori</h3>
            <p>Explorez notre catalogue et ajoutez vos produits préférés.</p>
            <Link to="/catalogue">Voir le catalogue</Link>
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
                      <ShoppingCart size={14} /> Ajouter
                    </button>
                    <button
                      className="favorites__btn favorites__btn--remove"
                      onClick={() => toggleFavorite(product)}
                    >
                      <Trash2 size={14} /> Retirer
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
