import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Box, ChevronDown } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { resolveImageUrl } from '../../utils/mapProduct';
import { useI18n } from '../../context/I18nContext';
import './CategoryGrid.scss';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop';

const CategoryGrid = ({ mode = 'home' }) => {
    const { t } = useI18n();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const getInitialCount = (width) => {
        if (width < 768) return 4;
        if (width < 992) return 6;
        if (width < 1200) return 8;
        return 6;
    };

    const getStepCount = (width) => {
        if (width < 768) return 4;
        if (width < 992) return 3;
        if (width < 1200) return 4;
        return 6;
    };

    const [visibleCount, setVisibleCount] = useState(6);

    useEffect(() => {
        const handleResize = () => {
            const currentInitial = getInitialCount(window.innerWidth);
            setVisibleCount(prev => Math.max(prev, currentInitial));
        };
        
        // Initial setup
        setVisibleCount(getInitialCount(window.innerWidth));
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await apiClient.get('/categories');
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setCategories(data);
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
            <section className={mode === 'home' ? "category-section" : "category-section category-section--catalogue"}>
                <div className="container">
                    {mode === 'home' && (
                        <div className="category-section__header">
                            <h2 className="category-section__title">{t('home.categoriesTitle')}</h2>
                        </div>
                    )}
                    <div className="category-grid">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="category-card-premium category-card-premium--skeleton">
                                <div className="category-card-premium__image-container">
                                    <div className="category-card-premium__skeleton-img" />
                                </div>
                                <div className="category-card-premium__content">
                                    <div className="category-card-premium__skeleton-title" />
                                    <div className="category-card-premium__skeleton-sub" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (categories.length === 0) return null;

    const displayedCategories = mode === 'catalogue' ? categories : categories.slice(0, visibleCount);

    const handleShowMore = () => {
        const step = getStepCount(window.innerWidth);
        setVisibleCount(prev => prev + step);
    };

    return (
        <section className={mode === 'home' ? "category-section" : "category-section category-section--catalogue"}>
            <div className={`container ${mode === 'catalogue' ? 'container--fluid' : ''}`}>
                
                {mode === 'home' && (
                    <div className="category-section__header">
                        <h2 className="category-section__title">{t('home.categoriesTitle')}</h2>
                        <Link to="/catalogue" className="category-section__view-all">{t('home.exploreCatalogue')}</Link>
                    </div>
                )}

                <div className="category-grid">
                    {displayedCategories.map((cat, index) => {
                        const hasImage = cat.imageUrl && cat.imageUrl.length > 5;
                        const defaultImage = hasImage ? (resolveImageUrl(cat.imageUrl) || PLACEHOLDER_IMG) : PLACEHOLDER_IMG;
                        
                        return (
                            <Link 
                                to={`/catalogue?category=${cat.id}`} 
                                key={cat.id} 
                                className={`category-card-premium anim-slide-up anim-delay-${(index % 8) + 1}`}
                            >
                                <div className="category-card-premium__image-container">
                                    <img
                                        src={defaultImage}
                                        alt={cat.nom}
                                        className="category-card-premium__image"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = PLACEHOLDER_IMG;
                                            e.target.style.opacity = '0.5';
                                        }}
                                    />
                                    <div className="category-card-premium__overlay"></div>
                                </div>
                                <div className="category-card-premium__content">
                                    <h3 className="category-card-premium__title">{cat.nom}</h3>
                                    <p className="category-card-premium__subtitle">{cat.description || t('home.viewProducts')}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {mode === 'home' && visibleCount < categories.length && (
                    <div className="category-section__show-more">
                        <button className="category-section__show-more-btn" onClick={handleShowMore}>
                            {t('home.showMore')} <ChevronDown size={18} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default CategoryGrid;
