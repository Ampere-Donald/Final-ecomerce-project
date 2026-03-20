import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './CategoryGrid.scss';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop';

const CategoryGrid = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/categories');
                setCategories(res.data || []);
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
            <section className="category-section">
                <div className="container">
                    <div className="category-section__header">
                        <h2 className="category-section__title">Composants par Catégorie</h2>
                    </div>
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

    return (
        <section className="category-section">
            <div className="container">
                <div className="category-section__header">
                    <h2 className="category-section__title">Composants par Catégorie</h2>
                    <Link to="/catalogue" className="category-section__view-all">Explorer le Catalogue &rarr;</Link>
                </div>

                <div className="category-grid">
                    {categories.map((cat) => (
                        <Link to={`/catalogue?categorie=${cat.id}`} key={cat.id} className="category-card-premium">
                            <div className="category-card-premium__image-container">
                                <img
                                    src={cat.imageUrl ? `http://localhost:3000${cat.imageUrl}` : PLACEHOLDER_IMG}
                                    alt={cat.nom}
                                    className="category-card-premium__image"
                                    onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
                                />
                                <div className="category-card-premium__overlay"></div>
                            </div>
                            <div className="category-card-premium__content">
                                <h3 className="category-card-premium__title">{cat.nom}</h3>
                                <p className="category-card-premium__subtitle">{cat.description || 'Voir les produits'}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoryGrid;
