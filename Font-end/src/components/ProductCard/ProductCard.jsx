import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { formatFCFA } from '../../utils/formatFCFA';
import './ProductCard.scss';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop';

const ProductCard = ({ product, badge }) => {
    const { toggleFavorite, isFavorite } = useFavorites();
    const isLiked = isFavorite(product.code);
    const [imgSrc, setImgSrc] = useState(product.image || PLACEHOLDER_IMG);

    const handleFavorite = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
    };

    const handleImageError = () => {
        setImgSrc(PLACEHOLDER_IMG);
    };

    return (
        <div className="product-card">
            {/* Image area */}
            <Link to={`/product/${product.code}`} className="product-card__image-area">
                <img
                    src={imgSrc}
                    alt={product.model}
                    className="product-card__img"
                    loading="lazy"
                    onError={handleImageError}
                />
                {/* Badges */}
                <span className="product-card__badge product-card__badge--stock">IN STOCK</span>
                {badge && (
                    <span className="product-card__badge product-card__badge--promo">{badge}</span>
                )}

                {/* Heart button (Favorite) */}
                <button
                    className={`product-card__heart ${isLiked ? 'product-card__heart--active' : ''}`}
                    onClick={handleFavorite}
                    aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    title={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
            </Link>

            {/* Content */}
            <Link to={`/product/${product.code}`} className="product-card__content">
                <p className="product-card__category">
                    {product.categoryName || product.parentCategory || 'COMPOSANT'}
                </p>

                <h3 className="product-card__name">{product.model}</h3>

                <div className="product-card__price-row product-card__price-row--retail">
                    <span className="product-card__price-label">Détail</span>
                    <span className="product-card__price product-card__price--retail">
                        {formatFCFA(product.retailPrice)}
                    </span>
                </div>

                <div className="product-card__price-row product-card__price-row--wholesale">
                    <span className="product-card__price-label">Gros</span>
                    <span className="product-card__price product-card__price--wholesale">
                        {formatFCFA(product.wholesalePrice)}
                    </span>
                </div>
            </Link>
        </div>
    );
};

export default ProductCard;
