import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import products, { formatFCFA } from '../../data/productsData';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import './FeaturedProducts.scss';

// Grab some real products for Flash Deal (Indices 1 et 30)
const flashDealProducts = [products[1], products[30]].map((p, index) => ({
    ...p,
    id: `fd${index}`,
    price: p.wholesalePrice,
    badge: index === 1 ? '-33%' : '',
}));

// Belles images premium pour palier au quota de génération
const premiumImages = [
    '/images/hero_1.png',
    '/images/hero_2.png',
    '/images/hero_3.png',
    '/images/hero_4.png',
];

// Grab some real products for Best Sellers (Indices 31, 32, 10, 40)
const bestSellers = [products[31], products[32], products[10], products[40]].map((p, index) => ({
    ...p,
    id: `bs${index}`,
    image: premiumImages[index] || p.image // Override image with premium one
}));

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

    const pad = (n) => String(n).padStart(2, '0');

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
                        {flashDealProducts.map((product) => (
                            <Link to={`/product/${product.code}`} key={product.id} className="product-card">
                                <div className="product-card__image-wrapper">
                                    <span className="product-card__stock-badge">STOCK</span>
                                    {product.badge && (
                                        <span className="product-card__promo-badge">{product.badge}</span>
                                    )}
                                    <div className="product-card__image">
                                        <img src={product.image} alt={product.model} />
                                    </div>
                                </div>
                                <div className="product-card__body">
                                    <p className="product-card__ref">REF: {product.code}</p>
                                    <div className="product-card__title-link">
                                        <h3 className="product-card__name">{product.model}</h3>
                                    </div>

                                    <div className="product-card__pricing">
                                        <div className="product-card__retail">
                                            <span className="product-card__retail-label">Retail<br />(prix_vente_d)</span>
                                            <span className="product-card__retail-price">{formatFCFA(product.retailPrice)}</span>
                                        </div>
                                        <div className="product-card__wholesale">
                                            <span className="product-card__wholesale-label">Wholesale<br />(prix_vente_g)</span>
                                            <span className="product-card__wholesale-price">{formatFCFA(product.wholesalePrice)}</span>
                                        </div>
                                    </div>

                                    <button
                                        className="product-card__add-btn"
                                        onClick={(e) => { e.preventDefault(); addToCart(product, 1); }}
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ━━ Best Sellers Grid ━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="bestsellers section-margin">
                    <div className="bestsellers__header">
                        <h2 className="bestsellers__title">Composants les Plus Demandés</h2>
                        <Link to="/catalogue" className="bestsellers__view-all">Voir tout &rarr;</Link>
                    </div>

                    <div className="bestsellers__grid">
                        {bestSellers.map((product) => (
                            <Link to={`/product/${product.code}`} key={product.id} className="product-card">
                                <div className="product-card__image-wrapper">
                                    <span className="product-card__stock-badge">STOCK</span>
                                    <div className="product-card__image">
                                        <img src={product.image} alt={product.model} />
                                    </div>
                                </div>
                                <div className="product-card__body">
                                    <p className="product-card__ref">REF: {product.code}</p>
                                    <div className="product-card__title-link">
                                        <h3 className="product-card__name">{product.model}</h3>
                                    </div>

                                    <div className="product-card__pricing">
                                        <div className="product-card__retail">
                                            <span className="product-card__retail-label">Retail<br />(prix_vente_d)</span>
                                            <span className="product-card__retail-price">{formatFCFA(product.retailPrice)}</span>
                                        </div>
                                        <div className="product-card__wholesale">
                                            <span className="product-card__wholesale-label">Wholesale<br />(prix_vente_g)</span>
                                            <span className="product-card__wholesale-price">{formatFCFA(product.wholesalePrice)}</span>
                                        </div>
                                    </div>

                                    <button
                                        className="product-card__add-btn"
                                        onClick={(e) => { e.preventDefault(); addToCart(product, 1); }}
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
};

export default FeaturedProducts;
