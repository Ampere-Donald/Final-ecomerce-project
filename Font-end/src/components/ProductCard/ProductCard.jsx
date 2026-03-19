import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, FileText, Info } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { formatFCFA } from '../../utils/formatFCFA';
import './ProductCard.scss';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop';

const ProductCard = ({ product, badge }) => {
    const { toggleFavorite, isFavorite } = useFavorites();
    const { addToCart } = useCart();
    const isLiked = isFavorite(product.code);
    const [imgSrc, setImgSrc] = useState(product.image || PLACEHOLDER_IMG);

    const isBackorder = (product.stock ?? 0) <= 0;

    const handleFavorite = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
    };

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, 1);
    };

    const handleImageError = () => {
        setImgSrc(PLACEHOLDER_IMG);
    };

    return (
        <div className={`product-card ${isBackorder ? 'product-card--backorder' : ''}`}>
            {/* Image area */}
            <Link to={`/product/${product.code}`} className="product-card__image-area">
                <img
                    src={imgSrc}
                    alt={product.model}
                    className="product-card__img"
                    loading="lazy"
                    onError={handleImageError}
                />
                {/* Stock Badge */}
                {isBackorder ? (
                    <span className="product-card__badge product-card__badge--preorder">SUR COMMANDE</span>
                ) : (
                    <span className="product-card__badge product-card__badge--stock">EN STOCK</span>
                )}
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

                {/* Prix */}
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

                {/* Stock info */}
                <p className={`product-card__stock-info ${isBackorder ? 'product-card__stock-info--warning' : ''}`}>
                    {isBackorder
                        ? 'Sur commande (Délai : ~14 jours)'
                        : `En stock : ${product.stock} unités`
                    }
                </p>
            </Link>

            {/* Fiche Technique (Datasheet B2B) */}
            {product.urlDatasheet && (
                <a 
                    href={product.urlDatasheet} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="product-card__datasheet" 
                    onClick={e => e.stopPropagation()}
                    title="Télécharger la fiche technique (PDF)"
                >
                    <FileText size={14} />
                    Fiche Technique
                </a>
            )}

            {/* Info Prix Dégressif si applicable */}
            {(product.wholesalePrice > 0 && product.wholesalePrice < product.retailPrice) && (
                <div className="product-card__discount-banner">
                    <Info size={12} /> Prix de gros disponible
                </div>
            )}

            {/* Add to Cart Button */}
            <button
                className={`product-card__add-btn ${isBackorder ? 'product-card__add-btn--preorder' : ''}`}
                onClick={handleAddToCart}
                title={isBackorder ? 'Commander avec délai (14j)' : 'Ajouter au panier'}
            >
                <ShoppingCart size={14} />
                {isBackorder ? 'Commander' : 'Ajouter au panier'}
            </button>
        </div>
    );
};

export default ProductCard;
