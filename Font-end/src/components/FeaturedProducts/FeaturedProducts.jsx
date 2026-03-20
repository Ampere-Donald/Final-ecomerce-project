import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { formatFCFA } from '../../utils/formatFCFA';
import { mapProduct, PLACEHOLDER_IMG } from '../../utils/mapProduct';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import './FeaturedProducts.scss';




// ── Countdown Hook (calcule depuis une date de fin réelle) ──────────────
const useCountdown = (targetDate) => {
    const [time, setTime] = useState({ h: 0, m: 0, s: 0 });


    useEffect(() => {
        if (!targetDate) return;

        const calcRemaining = () => {
            const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
            const totalSeconds = Math.floor(diff / 1000);
            return {
                h: Math.floor(totalSeconds / 3600),
                m: Math.floor((totalSeconds % 3600) / 60),
                s: totalSeconds % 60,
            };
        };

        setTime(calcRemaining());
        const timer = setInterval(() => setTime(calcRemaining()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return time;
};

// ── Product Slider Hook ─────────────────────────────────────────────────
const useSlider = (itemCount, visibleCount = 2, autoPlayInterval = 4000) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const maxIndex = Math.max(0, itemCount - visibleCount);

    const goNext = useCallback(() => {
        setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
    }, [maxIndex]);

    const goPrev = useCallback(() => {
        setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
    }, [maxIndex]);

    useEffect(() => {
        if (itemCount <= visibleCount || isHovered) return;
        const timer = setInterval(goNext, autoPlayInterval);
        return () => clearInterval(timer);
    }, [itemCount, visibleCount, isHovered, goNext, autoPlayInterval]);

    return {
        currentIndex,
        canGoPrev: true, // Infinite loop
        canGoNext: true, // Infinite loop
        goNext,
        goPrev,
        needsSlider: itemCount > visibleCount,
        hoverHandlers: {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
        }
    };
};

// ── Product Card (Flash) ────────────────────────────────────────────────
const FlashProductCard = ({ product, addToCart }) => {
    const outOfStock = (product.stock ?? 0) <= 0;
    return (
        <Link to={`/product/${product.id}`} className={`product-card ${outOfStock ? 'product-card--out-of-stock' : ''}`}>
            <div className="product-card__image-wrapper">
                <span className={`product-card__stock-badge ${outOfStock ? 'product-card__stock-badge--rupture' : ''}`}>
                    {outOfStock ? 'RUPTURE' : 'EN STOCK'}
                </span>
                {product.badge && (
                    <span className="product-card__promo-badge">{product.badge}</span>
                )}
                <div className="product-card__image">
                    <img
                        src={product.image}
                        alt={product.model}
                        onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                    />
                </div>
            </div>
            <div className="product-card__body">
                <p className="product-card__ref">REF: {product.code}</p>
                <div className="product-card__title-link">
                    <h3 className="product-card__name">{product.model}</h3>
                </div>

                <div className="product-card__pricing">
                    <div className="product-card__retail">
                        <span className="product-card__retail-label">Prix</span>
                        <span className="product-card__retail-price" style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.85em' }}>
                            {formatFCFA(product.retailPrice)}
                        </span>
                    </div>
                    <div className="product-card__wholesale">
                        <span className="product-card__wholesale-label" style={{ color: '#ef4444', fontWeight: 700 }}>Promo</span>
                        <span className="product-card__wholesale-price" style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.1em' }}>
                            {formatFCFA(product.promoPrice)}
                        </span>
                    </div>
                </div>

                <p className={`product-card__stock-info ${outOfStock ? 'product-card__stock-info--danger' : ''}`}>
                    {outOfStock ? 'Rupture de stock' : `En stock : ${product.stock} unités`}
                </p>

                <button
                    className={`product-card__add-btn ${outOfStock ? 'product-card__add-btn--disabled' : ''}`}
                    onClick={(e) => { e.preventDefault(); if (!outOfStock) addToCart({ ...product, retailPrice: product.promoPrice }, 1); }}
                    disabled={outOfStock}
                >
                    {outOfStock ? 'Indisponible' : 'Ajouter au panier'}
                </button>
            </div>
        </Link>
    );
};

// ── Product Card (Populaire) ────────────────────────────────────────────
const PopularProductCard = ({ product, addToCart }) => {
    const outOfStock = (product.stock ?? 0) <= 0;
    return (
        <Link to={`/product/${product.id}`} className={`product-card ${outOfStock ? 'product-card--out-of-stock' : ''}`}>
            <div className="product-card__image-wrapper">
                <span className={`product-card__stock-badge ${outOfStock ? 'product-card__stock-badge--rupture' : ''}`}>
                    {outOfStock ? 'RUPTURE' : 'EN STOCK'}
                </span>
                <div className="product-card__image">
                    <img
                        src={product.image}
                        alt={product.model}
                        onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                    />
                </div>
            </div>
            <div className="product-card__body">
                <p className="product-card__ref">REF: {product.code}</p>
                <div className="product-card__title-link">
                    <h3 className="product-card__name">{product.model}</h3>
                </div>

                <div className="product-card__pricing">
                    <div className="product-card__retail">
                        <span className="product-card__retail-label">Détail</span>
                        <span className="product-card__retail-price">{formatFCFA(product.retailPrice)}</span>
                    </div>
                    <div className="product-card__wholesale">
                        <span className="product-card__wholesale-label">Gros</span>
                        <span className="product-card__wholesale-price">{formatFCFA(product.wholesalePrice)}</span>
                    </div>
                </div>

                <p className={`product-card__stock-info ${outOfStock ? 'product-card__stock-info--danger' : ''}`}>
                    {outOfStock ? 'Rupture de stock' : `En stock : ${product.stock} unités`}
                </p>

                <button
                    className={`product-card__add-btn ${outOfStock ? 'product-card__add-btn--disabled' : ''}`}
                    onClick={(e) => { e.preventDefault(); if (!outOfStock) addToCart(product, 1); }}
                    disabled={outOfStock}
                >
                    {outOfStock ? 'Indisponible' : 'Ajouter au panier'}
                </button>
            </div>
        </Link>
    );
};

// ── Main Component ─────────────────────────────────────────────
const FeaturedProducts = () => {
    const { addToCart } = useCart();
    const [flashProducts, setFlashProducts] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [latestFinPromo, setLatestFinPromo] = useState(null);

    const flashSlider = useSlider(flashProducts.length, 2);
    const popSlider = useSlider(bestSellers.length, 4);

    const flashTrackRef = useRef(null);
    const popTrackRef = useRef(null);

    // ── Fetch flash deals & populaires from dedicated API routes ──
    useEffect(() => {
        const fetchProducts = async () => {
            try {

                const [flashRes, popRes] = await Promise.all([
                    axios.get('/api/produits/flash'),
                    axios.get('/api/produits/populaires'),
                ]);

                // ── Flash deals ──
                const flashData = (flashRes.data || []).map((p) => {
                    const retailPrice = parseFloat(p.prixDetail) || 0;
                    const promoPrice = parseFloat(p.prixPromo) || 0;
                    const discount = retailPrice > 0 ? Math.round(((retailPrice - promoPrice) / retailPrice) * 100) : 0;
                    return {
                        id: p.id,
                        model: p.nomProduit,
                        code: p.id.split('-')[0].toUpperCase(),
                        brand: p.marque,
                        categoryName: p.categorie?.nom || 'COMPOSANT',
                        retailPrice,
                        promoPrice,
                        wholesalePrice: parseFloat(p.prixGros) || 0,
                        stock: p.quantiteStock ?? 0,
                        finPromo: p.finPromo,
                        badge: discount > 0 ? `-${discount}%` : '',
                        image: p.imageUrl
                            ? `http://localhost:3000${p.imageUrl}`
                            : PLACEHOLDER_IMG,
                    };
                });
                setFlashProducts(flashData);

                // Utiliser la date de fin la plus lointaine pour le timer
                if (flashData.length > 0) {
                    const maxDate = flashData.reduce((max, p) =>
                        p.finPromo && new Date(p.finPromo) > new Date(max) ? p.finPromo : max,
                        flashData[0].finPromo
                    );
                    setLatestFinPromo(maxDate);
                }

                // ── Populaires ──
                const popData = (popRes.data || []).map(p => ({
                    id: p.id,
                    model: p.nomProduit,
                    code: p.id.split('-')[0].toUpperCase(),
                    brand: p.marque,
                    categoryName: p.categorie?.nom || 'COMPOSANT',
                    retailPrice: parseFloat(p.prixDetail) || 0,
                    wholesalePrice: parseFloat(p.prixGros) || 0,
                    stock: p.quantiteStock ?? 0,
                    image: p.imageUrl
                        ? `http://localhost:3000${p.imageUrl}`
                        : PLACEHOLDER_IMG,
                }));
                setBestSellers(popData);


            } catch (err) {
                console.error("Erreur de chargement des produits vedettes", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const countdown = useCountdown(latestFinPromo);
    const pad = (n) => String(n).padStart(2, '0');

    if (loading) {
        return (
            <section className="promo-catalogue">
                <div className="container" style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
                    Chargement des produits vedettes...
                </div>
            </section>
        );
    }

    // Si aucun flash et aucun populaire, ne rien afficher
    if (flashProducts.length === 0 && bestSellers.length === 0) return null;

    return (
        <section className="promo-catalogue">
            <div className="container">

                {/* ━━ Flash Deal Banner B2B ━━━━━━━━━━━━━━━━━━━━ */}
                {flashProducts.length > 0 && (
                <div className="flash-deal-b2b">
                    <div className="flash-deal-b2b__left">
                        <span className="flash-deal-b2b__badge">
                            <Zap size={14} fill="currentColor" />
                            FLASH DEAL
                        </span>
                        <h2 className="flash-deal-b2b__title">Ventes Flash</h2>
                        <p className="flash-deal-b2b__desc">
                            Profitez des prix promotionnels exceptionnels sur nos composants électroniques. Offre limitée dans le temps !
                        </p>

                        <div className="flash-deal-b2b__timer">
                            <div className="flash-deal-b2b__timer-block">
                                <span className="flash-deal-b2b__timer-value">{pad(countdown.h)}</span>
                                <span className="flash-deal-b2b__timer-label">HRS</span>
                            </div>
                            <span className="flash-deal-b2b__timer-sep">:</span>
                            <div className="flash-deal-b2b__timer-block">
                                <span className="flash-deal-b2b__timer-value">{pad(countdown.m)}</span>
                                <span className="flash-deal-b2b__timer-label">MIN</span>
                            </div>
                            <span className="flash-deal-b2b__timer-sep">:</span>
                            <div className="flash-deal-b2b__timer-block">
                                <span className="flash-deal-b2b__timer-value">{pad(countdown.s)}</span>
                                <span className="flash-deal-b2b__timer-label">SEC</span>
                            </div>
                        </div>

                        {/* Slider arrows for flash (below timer) */}
                        {flashSlider.needsSlider && (
                            <div className="slider-nav slider-nav--flash">
                                <button
                                    className={`slider-nav__btn ${!flashSlider.canGoPrev ? 'slider-nav__btn--disabled' : ''}`}
                                    onClick={flashSlider.goPrev}
                                    disabled={!flashSlider.canGoPrev}
                                    aria-label="Précédent"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="slider-nav__counter">
                                    {flashSlider.currentIndex + 1}–{Math.min(flashSlider.currentIndex + 2, flashProducts.length)} / {flashProducts.length}
                                </span>
                                <button
                                    className={`slider-nav__btn ${!flashSlider.canGoNext ? 'slider-nav__btn--disabled' : ''}`}
                                    onClick={flashSlider.goNext}
                                    disabled={!flashSlider.canGoNext}
                                    aria-label="Suivant"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flash-deal-b2b__products-wrapper" {...flashSlider.hoverHandlers}>
                        <div
                            ref={flashTrackRef}
                            className="flash-deal-b2b__products flash-deal-b2b__products--slider"
                            style={{
                                transform: `translateX(-${flashSlider.currentIndex * (100 / 2)}%)`,
                            }}
                        >
                            {flashProducts.map((product) => (
                                <div className="slider-card-wrapper slider-card-wrapper--flash" key={product.id}>
                                    <FlashProductCard product={product} addToCart={addToCart} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                )}

                {/* ━━ Best Sellers Grid / Slider ━━━━━━━━━━━━━━━━━━━━━━━ */}
                {bestSellers.length > 0 && (
                <div className="bestsellers section-margin">
                    <div className="bestsellers__header">
                        <h2 className="bestsellers__title">Composants les Plus Demandés</h2>
                        <div className="bestsellers__header-right">
                            {popSlider.needsSlider && (
                                <div className="slider-nav">
                                    <button
                                        className={`slider-nav__btn ${!popSlider.canGoPrev ? 'slider-nav__btn--disabled' : ''}`}
                                        onClick={popSlider.goPrev}
                                        disabled={!popSlider.canGoPrev}
                                        aria-label="Précédent"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="slider-nav__counter">
                                        {popSlider.currentIndex + 1}–{Math.min(popSlider.currentIndex + 4, bestSellers.length)} / {bestSellers.length}
                                    </span>
                                    <button
                                        className={`slider-nav__btn ${!popSlider.canGoNext ? 'slider-nav__btn--disabled' : ''}`}
                                        onClick={popSlider.goNext}
                                        disabled={!popSlider.canGoNext}
                                        aria-label="Suivant"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}
                            <Link to="/catalogue" className="bestsellers__view-all">Voir tout &rarr;</Link>
                        </div>
                    </div>

                    <div className="bestsellers__slider-wrapper" {...popSlider.hoverHandlers}>
                        <div
                            ref={popTrackRef}
                            className="bestsellers__grid bestsellers__grid--slider"
                            style={{
                                transform: `translateX(-${popSlider.currentIndex * (100 / 4)}%)`,
                            }}
                        >
                            {bestSellers.map((product) => (
                                <div className="slider-card-wrapper slider-card-wrapper--pop" key={product.id}>
                                    <PopularProductCard product={product} addToCart={addToCart} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                )}

            </div>
        </section>
    );
};

export default FeaturedProducts;
