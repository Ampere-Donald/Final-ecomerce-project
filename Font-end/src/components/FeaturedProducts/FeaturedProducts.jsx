import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { formatFCFA } from '../../utils/formatFCFA';
import { resolveImageUrl, PLACEHOLDER_IMG } from '../../utils/mapProduct';
import PlaceholderImage from '../PlaceholderImage/PlaceholderImage';
import { useCart } from '../../context/CartContext';
import { useI18n } from '../../context/I18nContext';
import { Link } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';
import ProductCardSkeleton from '../ProductCard/ProductCardSkeleton';
import './FeaturedProducts.scss';

// ── Countdown Hook ──────────────────────────────────────────────
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

// ── Scroll-Snap Carousel Hook ───────────────────────────────────
const useSnapCarousel = (itemCount, autoPlayMs = 0) => {
    const trackRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [dotCount, setDotCount] = useState(0);
    const isHovered = useRef(false);

    // Observe which card is in view to update dots
    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const cards = track.children;
        if (!cards.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const idx = Array.from(cards).indexOf(entry.target);
                        if (idx >= 0) setActiveIndex(idx);
                    }
                }
            },
            { root: track, threshold: 0.6 }
        );

        Array.from(cards).forEach((card) => observer.observe(card));
        return () => observer.disconnect();
    }, [itemCount]);

    // Compute dot count based on visible cards
    useEffect(() => {
        setDotCount(itemCount);
    }, [itemCount]);

    const scrollTo = useCallback((index) => {
        const track = trackRef.current;
        if (!track || !track.children[index]) return;
        const child = track.children[index];
        track.scrollTo({
            left: child.offsetLeft - track.offsetLeft,
            behavior: 'smooth',
        });
    }, []);

    const goNext = useCallback(() => {
        const next = activeIndex < itemCount - 1 ? activeIndex + 1 : 0;
        scrollTo(next);
    }, [activeIndex, itemCount, scrollTo]);

    const goPrev = useCallback(() => {
        const prev = activeIndex > 0 ? activeIndex - 1 : itemCount - 1;
        scrollTo(prev);
    }, [activeIndex, itemCount, scrollTo]);

    // Auto-play (desktop only)
    useEffect(() => {
        if (!autoPlayMs || itemCount <= 1) return;
        const timer = setInterval(() => {
            if (!isHovered.current) goNext();
        }, autoPlayMs);
        return () => clearInterval(timer);
    }, [autoPlayMs, itemCount, goNext]);

    return {
        trackRef,
        activeIndex,
        dotCount,
        goNext,
        goPrev,
        scrollTo,
        hoverHandlers: {
            onMouseEnter: () => { isHovered.current = true; },
            onMouseLeave: () => { isHovered.current = false; },
        },
    };
};

// ── Dot Indicators ──────────────────────────────────────────────
const Dots = ({ count, active, onDotClick, maxVisible = 7 }) => {
    if (count <= 1) return null;

    // If many items, show a subset of dots
    let dots = [];
    if (count <= maxVisible) {
        dots = Array.from({ length: count }, (_, i) => i);
    } else {
        // Show first, last, active, and neighbors
        const s = new Set([0, count - 1, active]);
        if (active > 0) s.add(active - 1);
        if (active < count - 1) s.add(active + 1);
        dots = [...s].sort((a, b) => a - b);
    }

    return (
        <div className="snap-dots">
            {dots.map((idx, i) => {
                const isGap = i > 0 && idx - dots[i - 1] > 1;
                return (
                    <span key={idx}>
                        {isGap && <span className="snap-dots__gap" />}
                        <button
                            className={`snap-dots__dot ${idx === active ? 'snap-dots__dot--active' : ''}`}
                            onClick={() => onDotClick(idx)}
                            aria-label={`Slide ${idx + 1}`}
                        />
                    </span>
                );
            })}
        </div>
    );
};

// ── Flash Product Card ──────────────────────────────────────────
const FlashProductCard = ({ product, addToCart }) => {
    const { t } = useI18n();
    const outOfStock = (product.stock ?? 0) <= 0;
    return (
        <Link to={`/product/${product.id}`} className={`fp-card ${outOfStock ? 'fp-card--oos' : ''}`}>
            <div className="fp-card__img-wrap">
                <span className={`fp-card__stock-tag ${outOfStock ? 'fp-card__stock-tag--oos' : ''}`}>
                    {outOfStock ? t('product.outOfStock') : t('product.inStock')}
                </span>
                {product.badge && (
                    <span className="fp-card__promo-tag">{product.badge}</span>
                )}
                {product.image ? (
                    <img src={product.image} alt={product.model} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                    <PlaceholderImage />
                )}
            </div>
            <div className="fp-card__body">
                <h3 className="fp-card__name">{product.model}</h3>
                <div className="fp-card__prices">
                    <span className="fp-card__old-price">{formatFCFA(product.retailPrice)}</span>
                    <span className="fp-card__promo-price">{formatFCFA(product.promoPrice)}</span>
                </div>
                <button
                    className={`fp-card__btn ${outOfStock ? 'fp-card__btn--disabled' : ''}`}
                    onClick={(e) => { e.preventDefault(); if (!outOfStock) addToCart({ ...product, retailPrice: product.promoPrice }, 1); }}
                    disabled={outOfStock}
                >
                    {outOfStock ? t('product.unavailable') : t('product.addToCart')}
                </button>
            </div>
        </Link>
    );
};

// ── Popular Product Card ────────────────────────────────────────
const PopularProductCard = ({ product, addToCart }) => {
    const { t } = useI18n();
    const outOfStock = (product.stock ?? 0) <= 0;
    return (
        <Link to={`/product/${product.id}`} className={`fp-card ${outOfStock ? 'fp-card--oos' : ''}`}>
            <div className="fp-card__img-wrap">
                <span className={`fp-card__stock-tag ${outOfStock ? 'fp-card__stock-tag--oos' : ''}`}>
                    {outOfStock ? t('product.outOfStock') : t('product.inStock')}
                </span>
                {product.image ? (
                    <img src={product.image} alt={product.model} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                    <PlaceholderImage />
                )}
            </div>
            <div className="fp-card__body">
                <h3 className="fp-card__name">{product.model}</h3>
                <div className="fp-card__prices">
                    <span className="fp-card__retail">{formatFCFA(product.retailPrice)}</span>
                    {product.wholesalePrice > 0 && product.wholesalePrice < product.retailPrice && (
                        <span className="fp-card__wholesale">{t('product.wholesalePrice')}: {formatFCFA(product.wholesalePrice)}</span>
                    )}
                </div>
                <button
                    className={`fp-card__btn ${outOfStock ? 'fp-card__btn--disabled' : ''}`}
                    onClick={(e) => { e.preventDefault(); if (!outOfStock) addToCart(product, 1); }}
                    disabled={outOfStock}
                >
                    {outOfStock ? t('product.unavailable') : t('product.addToCart')}
                </button>
            </div>
        </Link>
    );
};

// ── Main Component ──────────────────────────────────────────────
const FeaturedProducts = () => {
    const { t } = useI18n();
    const { addToCart } = useCart();
    const [flashProducts, setFlashProducts] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [latestFinPromo, setLatestFinPromo] = useState(null);

    const flashCarousel = useSnapCarousel(flashProducts.length, 5000);
    const popCarousel = useSnapCarousel(bestSellers.length, 6000);

    const revealOptions = { threshold: 0.15, rootMargin: '0px 0px -50px 0px' };
    const flashRevealRef = useScrollReveal(revealOptions);
    const popRevealRef = useScrollReveal(revealOptions);

    // ── Fetch data ──
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const [flashRes, popRes] = await Promise.all([
                    apiClient.get('/produits/flash'),
                    apiClient.get('/produits/populaires'),
                ]);

                const flashRaw = Array.isArray(flashRes.data) ? flashRes.data : flashRes.data?.data || [];
                const flashData = flashRaw.map((p) => {
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
                        image: p.imageUrl ? resolveImageUrl(p.imageUrl) : PLACEHOLDER_IMG,
                    };
                });
                setFlashProducts(flashData);

                if (flashData.length > 0) {
                    const maxDate = flashData.reduce((max, p) =>
                        p.finPromo && new Date(p.finPromo) > new Date(max) ? p.finPromo : max,
                        flashData[0].finPromo
                    );
                    setLatestFinPromo(maxDate);
                }

                const popRaw = Array.isArray(popRes.data) ? popRes.data : popRes.data?.data || [];
                const popData = popRaw.map(p => ({
                    id: p.id,
                    model: p.nomProduit,
                    code: p.id.split('-')[0].toUpperCase(),
                    brand: p.marque,
                    categoryName: p.categorie?.nom || 'COMPOSANT',
                    retailPrice: parseFloat(p.prixDetail) || 0,
                    wholesalePrice: parseFloat(p.prixGros) || 0,
                    stock: p.quantiteStock ?? 0,
                    image: p.imageUrl ? resolveImageUrl(p.imageUrl) : PLACEHOLDER_IMG,
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
                <div className="container" style={{ padding: '3rem 0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
                        {Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                </div>
            </section>
        );
    }

    if (flashProducts.length === 0 && bestSellers.length === 0) return null;

    return (
        <section className="promo-catalogue">
            <div className="container">

                {/* ━━ Flash Deals ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {flashProducts.length > 0 && (
                    <div className="flash-section reveal-up" ref={flashRevealRef}>
                        {/* Header row: badge + timer + arrows */}
                        <div className="flash-section__header">
                            <div className="flash-section__title-group">
                                <span className="flash-section__badge">
                                    <Zap size={14} fill="currentColor" />
                                    {t('home.flashDeal')}
                                </span>
                                <h2 className="flash-section__title">{t('home.flashSales')}</h2>
                            </div>

                            <div className="flash-section__timer">
                                <div className="flash-section__timer-block">
                                    <span>{pad(countdown.h)}</span>
                                    <small>{t('home.hrs')}</small>
                                </div>
                                <span className="flash-section__timer-sep">:</span>
                                <div className="flash-section__timer-block">
                                    <span>{pad(countdown.m)}</span>
                                    <small>{t('home.min')}</small>
                                </div>
                                <span className="flash-section__timer-sep">:</span>
                                <div className="flash-section__timer-block">
                                    <span>{pad(countdown.s)}</span>
                                    <small>{t('home.sec')}</small>
                                </div>
                            </div>

                            <div className="flash-section__nav">
                                <button className="snap-arrow" onClick={flashCarousel.goPrev} aria-label={t('common.prev')}>
                                    <ChevronLeft size={20} />
                                </button>
                                <button className="snap-arrow" onClick={flashCarousel.goNext} aria-label={t('common.next')}>
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable track */}
                        <div
                            className="snap-track snap-track--flash"
                            ref={flashCarousel.trackRef}
                            {...flashCarousel.hoverHandlers}
                        >
                            {flashProducts.map((product) => (
                                <div className="snap-card snap-card--flash" key={product.id}>
                                    <FlashProductCard product={product} addToCart={addToCart} />
                                </div>
                            ))}
                        </div>

                        <Dots
                            count={flashProducts.length}
                            active={flashCarousel.activeIndex}
                            onDotClick={flashCarousel.scrollTo}
                        />
                    </div>
                )}

                {/* ━━ Best Sellers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {bestSellers.length > 0 && (
                    <div className="bestsellers-section section-margin reveal-up" ref={popRevealRef}>
                        <div className="bestsellers-section__header">
                            <h2 className="bestsellers-section__title">{t('home.bestSellers')}</h2>
                            <div className="bestsellers-section__right">
                                <div className="bestsellers-section__nav">
                                    <button className="snap-arrow snap-arrow--light" onClick={popCarousel.goPrev} aria-label={t('common.prev')}>
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button className="snap-arrow snap-arrow--light" onClick={popCarousel.goNext} aria-label={t('common.next')}>
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                                <Link to="/catalogue" className="bestsellers-section__view-all">{t('common.viewAll')} &rarr;</Link>
                            </div>
                        </div>

                        <div
                            className="snap-track snap-track--pop"
                            ref={popCarousel.trackRef}
                            {...popCarousel.hoverHandlers}
                        >
                            {bestSellers.map((product) => (
                                <div className="snap-card snap-card--pop" key={product.id}>
                                    <PopularProductCard product={product} addToCart={addToCart} />
                                </div>
                            ))}
                        </div>

                        <Dots
                            count={bestSellers.length}
                            active={popCarousel.activeIndex}
                            onDotClick={popCarousel.scrollTo}
                        />
                    </div>
                )}

            </div>
        </section>
    );
};

export default FeaturedProducts;
