import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, FileText, Info, Eye, X } from 'lucide-react';
import { useFavorites } from '../../context/FavoritesContext';
import { useCart } from '../../context/CartContext';
import { useI18n } from '../../context/I18nContext';
import { formatFCFA } from '../../utils/formatFCFA';
import './ProductCard.scss';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop';

const ProductCard = ({ product, badge }) => {
    const { t } = useI18n();
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
                {/* Badges container */}
                <div className="product-card__badges-container">
                    {isBackorder ? (
                        <span className="product-card__badge product-card__badge--preorder">{t('product.preorder')}</span>
                    ) : (
                        <span className="product-card__badge product-card__badge--stock">{t('product.inStock')}</span>
                    )}
                    {badge && (
                        <span className="product-card__badge product-card__badge--promo">{badge}</span>
                    )}
                    {(product.wholesalePrice > 0 && product.wholesalePrice < product.retailPrice) && (
                        <span className="product-card__badge product-card__badge--wholesale">
                            <Info size={10} /> {t('product.wholesaleAvailable')}
                        </span>
                    )}
                </div>

                {/* Heart button (Favorite) */}
                <button
                    className={`product-card__heart ${isLiked ? 'product-card__heart--active' : ''}`}
                    onClick={handleFavorite}
                    aria-label={isLiked ? t('product.removeFavorite') : t('product.addFavorite')}
                    title={isLiked ? t('product.removeFavorite') : t('product.addFavorite')}
                >
                    <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
            </Link>

            <div className="product-card__body">
                <Link to={`/product/${product.code}`} className="product-card__info-link">
                    <p className="product-card__category">
                        {product.categoryName || product.parentCategory || t('product.defaultCategory')}
                    </p>
                    <h3 className="product-card__name">{product.model}</h3>

                    <p className={`product-card__stock-info ${isBackorder ? 'product-card__stock-info--warning' : ''}`}>
                        {isBackorder
                            ? t('product.preorderDelay')
                            : t('product.inStockCount', { count: product.stock })
                        }
                    </p>
                </Link>

                <div className="product-card__bottom-row">
                    <Link to={`/product/${product.code}`} className="product-card__price-block">
                        <span className="product-card__price-primary">
                            {formatFCFA(product.wholesalePrice || product.retailPrice)}
                        </span>
                        {(product.wholesalePrice > 0 && product.wholesalePrice < product.retailPrice) && (
                            <span className="product-card__price-secondary">
                                {formatFCFA(product.retailPrice)}
                            </span>
                        )}
                    </Link>

                    <button
                        className={`product-card__action-btn ${isBackorder ? 'product-card__action-btn--preorder' : ''}`}
                        onClick={handleAddToCart}
                        aria-label={isBackorder ? t('product.preorderBtnTitle') : t('product.addToCart')}
                        title={isBackorder ? t('product.preorderBtnTitle') : t('product.addToCart')}
                    >
                        <ShoppingCart size={18} />
                    </button>
                </div>

                {/* Fiche Technique (Datasheet B2B) */}
                {product.urlDatasheet && (
                    <a 
                        href={product.urlDatasheet} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="product-card__datasheet" 
                        onClick={e => e.stopPropagation()}
                        title={t('product.downloadDatasheet')}
                    >
                        <FileText size={12} />
                        {t('product.datasheet')}
                    </a>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
