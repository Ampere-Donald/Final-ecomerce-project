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
    const [justAdded, setJustAdded] = useState(false);

    const handleFavorite = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(product);
    };

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product, 1);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 800);
    };

    const handleImageError = () => {
        setImgSrc(PLACEHOLDER_IMG);
    };

    const [showQuickView, setShowQuickView] = useState(false);

    const handleQuickView = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowQuickView(true);
    };

    return (
        <>
            <div className={`product-card ${isBackorder ? 'product-card--backorder' : ''}`}>
                {/* Image area */}
                <Link to={`/product/${product.id}`} className="product-card__image-area">
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

                    {/* Quick View Button */}
                    <button
                        className="product-card__quick-view"
                        onClick={handleQuickView}
                        title={t('product.quickView')}
                    >
                        <Eye size={14} />
                        {t('product.quickView')}
                    </button>
                </Link>

                <div className="product-card__body">
                    <Link to={`/product/${product.id}`} className="product-card__info-link">
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
                        <Link to={`/product/${product.id}`} className="product-card__price-block">
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
                            className={`product-card__action-btn ${isBackorder ? 'product-card__action-btn--preorder' : ''} ${justAdded ? 'product-card__action-btn--added' : ''}`}
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

            {/* ── Quick View Modal ───────────────────────────── */}
            {showQuickView && (
                <div className="quick-view-overlay" onClick={() => setShowQuickView(false)}>
                    <div className="quick-view-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="quick-view-modal__close" onClick={() => setShowQuickView(false)}>
                            <X size={20} />
                        </button>
                        <div className="quick-view-modal__layout">
                            <div className="quick-view-modal__image">
                                <img src={imgSrc} alt={product.model} onError={handleImageError} />
                            </div>
                            <div className="quick-view-modal__info">
                                <p className="quick-view-modal__category">
                                    {product.categoryName || product.parentCategory || t('product.defaultCategory')}
                                </p>
                                <h2 className="quick-view-modal__name">{product.model}</h2>
                                {product.brand && <p className="quick-view-modal__brand">{t('product.brandLabel', { brand: product.brand })}</p>}

                                <div className="quick-view-modal__prices">
                                    <div className="quick-view-modal__price-row">
                                        <span>{t('product.retailPrice')}</span>
                                        <strong>{formatFCFA(product.retailPrice)}</strong>
                                    </div>
                                    <div className="quick-view-modal__price-row quick-view-modal__price-row--wholesale">
                                        <span>{t('product.wholesalePrice')}</span>
                                        <strong>{formatFCFA(product.wholesalePrice)}</strong>
                                    </div>
                                </div>

                                <p className={`quick-view-modal__stock ${isBackorder ? 'quick-view-modal__stock--warning' : ''}`}>
                                    {isBackorder ? t('product.preorderDelay') : t('product.inStockCount', { count: product.stock })}
                                </p>

                                <div className="quick-view-modal__actions">
                                    <button className="quick-view-modal__add-btn" onClick={handleAddToCart}>
                                        <ShoppingCart size={16} />
                                        {t('product.addToCart')}
                                    </button>
                                    <Link to={`/product/${product.id}`} className="quick-view-modal__detail-link">
                                        {t('product.viewFullDetails')}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductCard;
