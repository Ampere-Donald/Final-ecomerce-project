import { Link } from 'react-router-dom';
import './CategoryGrid.scss';

const categories = [
    {
        id: 'circuits-integres',
        name: 'Circuits Intégrés',
        subtitle: '1340+ Articles',
        image: '/images/cat-micro.png',
        path: '/catalogue?category=circuits-integres'
    },
    {
        id: 'outils',
        name: 'Outils & Soudure',
        subtitle: '55+ Articles',
        image: '/images/cat-tools.png',
        path: '/catalogue?category=outils'
    },
    {
        id: 'transistors',
        name: 'Transistors & MOSFET',
        subtitle: '1260+ Articles',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop',
        path: '/catalogue?category=transistors'
    },
    {
        id: 'resistances',
        name: 'Passifs (Résistances)',
        subtitle: '900+ Articles',
        image: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?q=80&w=600&auto=format&fit=crop',
        path: '/catalogue?category=resistances'
    },
    {
        id: 'cables',
        name: 'Câbles & Connecteurs',
        subtitle: '250+ Articles',
        image: '/images/cat-cables.png',
        path: '/catalogue?category=cables'
    },
    {
        id: 'led-diodes',
        name: 'Optoélectronique',
        subtitle: '140+ Articles',
        image: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=600&auto=format&fit=crop',
        path: '/catalogue?category=led-diodes'
    },
];

const CategoryGrid = () => {
    return (
        <section className="category-section">
            <div className="container">
                <div className="category-section__header">
                    <h2 className="category-section__title">Composants par Catégorie</h2>
                    <Link to="/catalogue" className="category-section__view-all">Explorer le Catalogue &rarr;</Link>
                </div>

                <div className="category-grid">
                    {categories.map((category) => (
                        <Link to={category.path} key={category.id} className="category-card-premium">
                            <div className="category-card-premium__image-container">
                                <img
                                    src={category.image}
                                    alt={category.name}
                                    className="category-card-premium__image"
                                />
                                <div className="category-card-premium__overlay"></div>
                            </div>
                            <div className="category-card-premium__content">
                                <h3 className="category-card-premium__title">{category.name}</h3>
                                <p className="category-card-premium__subtitle">{category.subtitle}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoryGrid;
