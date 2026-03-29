import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Cpu, Cable, Speaker, Battery, Wrench, Monitor,
    Zap, ShoppingBag, Search, Tv, Radio, Fan, Package, Box
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { resolveImageUrl } from '../../utils/mapProduct';
import { useI18n } from '../../context/I18nContext';
import PlaceholderImage from '../PlaceholderImage/PlaceholderImage';
import './CategoryGrid.scss';

// ── Category icon mapping (fallback when no image) ──────────────
const CATEGORY_ICONS = {
    'composants': Cpu,
    'electronique': Cpu,
    'câbles': Cable,
    'cable': Cable,
    'connectique': Cable,
    'audio': Speaker,
    'son': Speaker,
    'piles': Battery,
    'batteries': Battery,
    'chargeur': Zap,
    'power': Zap,
    'alimentation': Zap,
    'energie': Zap,
    'outillage': Wrench,
    'informatique': Monitor,
    'reseaux': Monitor,
    'réseau': Monitor,
    'satellite': Tv,
    'tv': Tv,
    'telecommande': Radio,
    'télécommande': Radio,
    'ventilateur': Fan,
    'mesure': Search,
    'test': Search,
    'optique': Search,
    'loupe': Search,
    'accessoire': ShoppingBag,
    'divers': Package,
};

function getCategoryIcon(name) {
    const lower = (name || '').toLowerCase();
    for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
        if (lower.includes(key)) return Icon;
    }
    return Box;
}

// ── Unique pastel color per category ────────────────────────────
const PASTEL_COLORS = [
    '#eef2ff', '#fef3c7', '#ecfdf5', '#fce7f3', '#f0f9ff',
    '#fef9c3', '#f5f3ff', '#fff7ed', '#f0fdf4', '#fdf2f8',
    '#e0f2fe', '#fefce8', '#ede9fe', '#ffedd5', '#dcfce7', '#fce4ec',
];

const CategoryGrid = ({ mode = 'home' }) => {
    const { t } = useI18n();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiClient.get('/categories');
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                // Sort by product count descending for bento priority
                const sorted = [...data].sort((a, b) =>
                    (b._count?.produits || b.produits?.length || 0) - (a._count?.produits || a.produits?.length || 0)
                );
                setCategories(sorted);
            } catch (err) {
                console.error('Erreur chargement catégories', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <section className={`category-section ${mode === 'catalogue' ? 'category-section--catalogue' : ''}`}>
                <div className="container">
                    {mode === 'home' && (
                        <div className="category-section__header">
                            <h2 className="category-section__title">{t('home.categoriesTitle')}</h2>
                        </div>
                    )}
                    <div className="category-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="cat-card cat-card--skeleton">
                                <div className="cat-card__skeleton-img" />
                                <div className="cat-card__skeleton-text" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (categories.length === 0) return null;

    // On homepage: show top categories in bento layout
    // On catalogue: show all in flat grid
    const isMobileHome = mode === 'home';

    return (
        <section className={`category-section ${mode === 'catalogue' ? 'category-section--catalogue' : ''}`}>
            <div className={`container ${mode === 'catalogue' ? 'container--fluid' : ''}`}>

                {mode === 'home' && (
                    <div className="category-section__header">
                        <h2 className="category-section__title">{t('home.categoriesTitle')}</h2>
                        <Link to="/catalogue" className="category-section__view-all">{t('home.exploreCatalogue')}</Link>
                    </div>
                )}

                {/* Mobile homepage: horizontal scroll-snap */}
                {isMobileHome && (
                    <div className="category-scroll-mobile">
                        <div className="category-scroll-mobile__track">
                            {categories.map((cat, index) => {
                                const Icon = getCategoryIcon(cat.nom);
                                const count = cat._count?.produits || cat.produits?.length || 0;
                                const bgColor = PASTEL_COLORS[index % PASTEL_COLORS.length];

                                return (
                                    <Link
                                        to={`/catalogue?category=${cat.id}`}
                                        key={cat.id}
                                        className="cat-chip"
                                    >
                                        <div className="cat-chip__icon" style={{ backgroundColor: bgColor }}>
                                            <Icon size={20} />
                                        </div>
                                        <span className="cat-chip__name">{cat.nom}</span>
                                        {count > 0 && <span className="cat-chip__count">{count}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Desktop homepage + catalogue: bento grid */}
                <div className={`category-grid ${isMobileHome ? 'category-grid--desktop-only' : ''}`}>
                    {categories.map((cat, index) => {
                        const hasImage = cat.imageUrl && cat.imageUrl.length > 5;
                        const imageUrl = hasImage ? resolveImageUrl(cat.imageUrl) : null;
                        const Icon = getCategoryIcon(cat.nom);
                        const count = cat._count?.produits || cat.produits?.length || 0;
                        const bgColor = PASTEL_COLORS[index % PASTEL_COLORS.length];
                        // Top 3 categories get "featured" large card on homepage
                        const isFeatured = mode === 'home' && index < 3;

                        return (
                            <Link
                                to={`/catalogue?category=${cat.id}`}
                                key={cat.id}
                                className={`cat-card ${isFeatured ? 'cat-card--featured' : ''}`}
                            >
                                <div className="cat-card__visual" style={{ backgroundColor: bgColor }}>
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={cat.nom}
                                            className="cat-card__image"
                                            loading="lazy"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <Icon size={isFeatured ? 48 : 36} className="cat-card__icon" />
                                    )}
                                </div>
                                <div className="cat-card__info">
                                    <h3 className="cat-card__name">{cat.nom}</h3>
                                    {count > 0 && (
                                        <span className="cat-card__count">
                                            {count.toLocaleString()} {count > 1 ? 'articles' : 'article'}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>

            </div>
        </section>
    );
};

export default CategoryGrid;
