import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import axios from 'axios';
import { formatFCFA } from '../../utils/formatFCFA';
import { mapProduct, PLACEHOLDER_IMG } from '../../utils/mapProduct';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import './FeaturedProducts.scss';

// ── Countdown Hook ─────────────────────────────────────────
const useCountdown = (hours = 2, minutes = 14, seconds = 56) => {
    const [time, setTime] = useState({ h: hours, m: minutes, s: seconds });

    useEffect(() => {
        const timer = setInterval(() => {
            setTime((prev) => {
                let { h, m, s } = prev;
                if (s > 0) { s--; }
                else if (m > 0) { m--; s = 59; }
                else if (h > 0) { h--; m = 59; s = 59; }
                return { h, m, s };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return time;
};

// ── Component ──────────────────────────────────────────────
const FeaturedProducts = () => {
    const countdown = useCountdown(47, 59, 56);
    const { addToCart } = useCart();
    const [flashProducts, setFlashProducts] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch products from API
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await axios.get('/api/produits');
                const allProducts = res.data.map(mapProduct);

                // Flash deals : les 2 premiers produits avec image
                const withImage = allProducts.filter(p => p.image !== PLACEHOLDER_IMG);
                setFlashProducts(withImage.slice(0, 2).map((p, i) => ({
                    ...p,
                    id: `fd${i}`,
                    badge: i === 1 ? '-33%' : '',
                })));

                // Best sellers : 4 produits (prioriser ceux avec images)
                const remaining = [...withImage.slice(2), ...allProducts.filter(p => p.image === PLACEHOLDER_IMG)];
                setBestSellers(remaining.slice(0, 4).map((p, i) => ({
                    ...p,
                    id: `bs${i}`,
                })));
            } catch (err) {
                console.error("Erreur de chargement des produits vedettes", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

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

    return (
        <section className="promo-catalogue">
            <div className="container">

                {/* ━━ Flash Deal Banner B2B ━━━━━━━━━━━━━━━━━━━━ */}
                <div className="flash-deal-b2b">
                    <div className="flash-deal-b2b__left">
                        <span className="flash-deal-b2b__badge">
                            <Zap size={14} fill="currentColor" />
                            FLASH DEAL
                        </span>
                        <h2 className="flash-deal-b2b__title">Offres Grossistes 48H</h2>
                        <p className="flash-deal-b2b__desc">
                            Profitez des prix grossistes exceptionnels sur nos composants électroniques professionnels à fort roulement.
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
                    </div>

                    <div className="flash-deal-b2b__products">
                        {flashProducts.map((product) => {
                            const outOfStock = (product.stock ?? 0) <= 0;
                            return (
                            <Link to={`/product/${product.code}`} key={product.id} className={`product-card ${outOfStock ? 'product-card--out-of-stock' : ''}`}>
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
                        })}
                    </div>
                </div>

                {/* ━━ Best Sellers Grid ━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="bestsellers section-margin">
                    <div className="bestsellers__header">
                        <h2 className="bestsellers__title">Composants les Plus Demandés</h2>
                        <Link to="/catalogue" className="bestsellers__view-all">Voir tout &rarr;</Link>
                    </div>

                    <div className="bestsellers__grid">
                        {bestSellers.map((product) => {
                            const outOfStock = (product.stock ?? 0) <= 0;
                            return (
                            <Link to={`/product/${product.code}`} key={product.id} className={`product-card ${outOfStock ? 'product-card--out-of-stock' : ''}`}>
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
                        })}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default FeaturedProducts;
