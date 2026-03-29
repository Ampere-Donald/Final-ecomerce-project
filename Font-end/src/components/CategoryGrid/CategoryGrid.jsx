import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { resolveImageUrl } from '../../utils/mapProduct';
import { useI18n } from '../../context/I18nContext';
import PlaceholderImage from '../PlaceholderImage/PlaceholderImage';
import './CategoryGrid.scss';

const STEP = 6; // reveal 6 categories at a time

const CategoryGrid = ({ mode = 'home' }) => {
    const { t } = useI18n();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(STEP);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiClient.get('/categories');
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
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

    const isHome = mode === 'home';
    // Desktop: progressive reveal on homepage, all on catalogue
    const desktopCategories = isHome ? categories.slice(0, visibleCount) : categories;
    const hasMore = isHome && visibleCount < categories.length;

    return (
        <section className={`category-section ${mode === 'catalogue' ? 'category-section--catalogue' : ''}`}>
            <div className={`container ${mode === 'catalogue' ? 'container--fluid' : ''}`}>

                {isHome && (
                    <div className="category-section__header">
                        <h2 className="category-section__title">{t('home.categoriesTitle')}</h2>
                        <Link to="/catalogue" className="category-section__view-all">{t('home.exploreCatalogue')}</Link>
                    </div>
                )}

                {/* Mobile homepage: mini-card scroll */}
                {isHome && (
                    <div className="category-scroll-mobile">
                        <div className="category-scroll-mobile__track">
                            {categories.map((cat) => {
                                const hasImage = cat.imageUrl && cat.imageUrl.length > 5;
                                const imageUrl = hasImage ? resolveImageUrl(cat.imageUrl) : null;
                                const count = cat._count?.produits || cat.produits?.length || 0;

                                return (
                                    <Link
                                        to={`/catalogue?category=${cat.id}`}
                                        key={cat.id}
                                        className="cat-mini"
                                    >
                                        <div className="cat-mini__visual">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={cat.nom}
                                                    className="cat-mini__img"
                                                    loading="lazy"
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                                                />
                                            ) : null}
                                            <PlaceholderImage className={imageUrl ? 'placeholder-img--hidden' : ''} />
                                        </div>
                                        <span className="cat-mini__name">{cat.nom}</span>
                                        {count > 0 && (
                                            <span className="cat-mini__count">{count}</span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                        {/* Fade hint for scroll */}
                        <div className="category-scroll-mobile__fade" />
                    </div>
                )}

                {/* Desktop grid (classic layout, progressive reveal on home) */}
                <div className={`category-grid ${isHome ? 'category-grid--desktop-only' : ''}`}>
                    {desktopCategories.map((cat) => {
                        const hasImage = cat.imageUrl && cat.imageUrl.length > 5;
                        const imageUrl = hasImage ? resolveImageUrl(cat.imageUrl) : null;
                        const count = cat._count?.produits || cat.produits?.length || 0;

                        return (
                            <Link
                                to={`/catalogue?category=${cat.id}`}
                                key={cat.id}
                                className="cat-card"
                            >
                                <div className="cat-card__visual">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={cat.nom}
                                            className="cat-card__image"
                                            loading="lazy"
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
                                        />
                                    ) : null}
                                    <PlaceholderImage className={imageUrl ? 'placeholder-img--hidden' : ''} />
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

                {/* Show more button (desktop, homepage only) */}
                {hasMore && (
                    <div className="category-section__show-more">
                        <button
                            className="category-section__show-more-btn"
                            onClick={() => setVisibleCount(prev => prev + STEP)}
                        >
                            {t('common.showMore')}
                            <ChevronDown size={18} />
                        </button>
                    </div>
                )}

            </div>
        </section>
    );
};

export default CategoryGrid;
