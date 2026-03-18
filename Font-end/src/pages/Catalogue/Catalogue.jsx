import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import axios from 'axios';
import Footer from '../../components/Footer/Footer';
import Sidebar from '../../components/Sidebar/Sidebar';
import ProductCard from '../../components/ProductCard/ProductCard';
import './Catalogue.scss';

const ITEMS_PER_PAGE = 24;

const Catalogue = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // ── State ──────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [dynamicCategories, setDynamicCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // ... (rest of the state stays the same)
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
    const [selectedSubCategory, setSelectedSubCategory] = useState(searchParams.get('sub') || '');
    const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name-asc');
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [priceRange, setPriceRange] = useState([0, 1000000]);
    const [inStockOnly, setInStockOnly] = useState(searchParams.get('instock') === 'true');

    // ── Fetch Data ─────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, catRes] = await Promise.all([
                    axios.get('/api/produits'),
                    axios.get('/api/categories')
                ]);

                const formattedProducts = prodRes.data.map(p => ({
                    model: p.nomProduit,
                    code: p.id.split('-')[0].toUpperCase(),
                    brand: p.marque,
                    description: p.description,
                    categoryName: p.categorie?.nom || 'DIVERS',
                    categoryId: p.categorie?.id || '',
                    categorySlug: p.categorie?.id || 'divers', // Using ID as slug for uniqueness and matching
                    retailPrice: p.prixDetail ?? 0,
                    wholesalePrice: p.prixGros ?? 0,
                    stock: p.quantiteStock ?? 0,
                    oldPrice: null,
                    parentCategory: 'ÉQUIPEMENTS',
                    image: p.imageUrl 
                        ? `http://localhost:3000${p.imageUrl}` 
                        : 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?q=80&w=400&auto=format&fit=crop'
                }));

                setProducts(formattedProducts);

                // Build dynamic categories array for sidebar with counts
                const apiCategories = catRes.data;
                const sidebarCategories = apiCategories.map(cat => {
                    // Count how many products belong to this category
                    const count = formattedProducts.filter(p => p.categoryId === cat.id).length;
                    return {
                        name: cat.nom,
                        slug: cat.id, 
                        count: count,
                        subcategories: [] // No subcategories in backend currently, so we just use flat categories
                    };
                });
                
                // Filter out empty categories if wanted, but standard is to show all with 0 counts
                setDynamicCategories(sidebarCategories);

            } catch (err) {
                console.error("Erreur de chargement des données", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Sync URL params
    useEffect(() => {
        const params = {};
        if (searchQuery) params.search = searchQuery;
        if (selectedCategory) params.category = selectedCategory;
        if (selectedSubCategory) params.sub = selectedSubCategory;
        if (sortBy !== 'name-asc') params.sort = sortBy;
        if (currentPage > 1) params.page = currentPage;
        if (inStockOnly) params.instock = 'true';
        setSearchParams(params, { replace: true });
    }, [searchQuery, selectedCategory, selectedSubCategory, sortBy, currentPage, inStockOnly, setSearchParams]);

    // ── Filtering & Sorting ────────────────────────────────
    const filteredProducts = useMemo(() => {
        let result = [...products];

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(p =>
                p.model.toLowerCase().includes(q) ||
                p.code.includes(q) ||
                p.categoryName.toLowerCase().includes(q)
            );
        }

        // Category filter
        if (selectedCategory) {
            // we only have flat categories now
            result = result.filter(p => p.categoryId === selectedCategory || p.categorySlug === selectedCategory);
        }

        // Price filter
        result = result.filter(p =>
            p.retailPrice >= priceRange[0] && p.retailPrice <= priceRange[1]
        );

        // Stock filter
        if (inStockOnly) {
            result = result.filter(p => p.stock > 0);
        }

        // Sorting
        switch (sortBy) {
            case 'name-asc':
                result.sort((a, b) => a.model.localeCompare(b.model));
                break;
            case 'name-desc':
                result.sort((a, b) => b.model.localeCompare(a.model));
                break;
            case 'price-asc':
                result.sort((a, b) => a.retailPrice - b.retailPrice);
                break;
            case 'price-desc':
                result.sort((a, b) => b.retailPrice - a.retailPrice);
                break;
            default:
                break;
        }

        return result;
    }, [products, searchQuery, selectedCategory, selectedSubCategory, sortBy, priceRange]);

    // ── Pagination ─────────────────────────────────────────
    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, selectedSubCategory, sortBy, priceRange, inStockOnly]);

    // ── Handlers ───────────────────────────────────────────
    const toggleCategory = (slug) => {
        setExpandedCategories(prev => ({ ...prev, [slug]: !prev[slug] }));
    };

    const handleCategorySelect = (catSlug) => {
        if (selectedCategory === catSlug) {
            setSelectedCategory('');
            setSelectedSubCategory('');
        } else {
            setSelectedCategory(catSlug);
            setSelectedSubCategory('');
            setExpandedCategories(prev => ({ ...prev, [catSlug]: true }));
        }
    };

    const handleSubCategorySelect = (subSlug, parentSlug) => {
        if (selectedSubCategory === subSlug) {
            setSelectedSubCategory('');
        } else {
            setSelectedCategory(parentSlug);
            setSelectedSubCategory(subSlug);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('');
        setSelectedSubCategory('');
        setSortBy('name-asc');
        setPriceRange([0, 1000000]);
        setInStockOnly(false);
    };

    const hasActiveFilters = searchQuery || selectedCategory || selectedSubCategory || sortBy !== 'name-asc' || inStockOnly || priceRange[1] < 1000000;

    // ── Pagination Controls ────────────────────────────────
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    // ── Active Category Name ───────────────────────────────
    const activeCategoryName = useMemo(() => {
        if (selectedCategory) {
            const cat = dynamicCategories.find(c => c.slug === selectedCategory);
            if (cat) return cat.name;
        }
        return null;
    }, [selectedCategory, dynamicCategories]);

    return (
        <div className="catalogue-page">
            <Helmet>
                <title>{activeCategoryName ? `${activeCategoryName} — Catalogue NEWOTEG` : 'Catalogue — Équipements & Composants | NEWOTEG SARL'}</title>
                <meta name="description" content={activeCategoryName ? `Découvrez nos produits ${activeCategoryName} chez NEWOTEG SARL. Prix compétitifs, qualité industrielle, livraison au Cameroun.` : 'Parcourez notre catalogue complet d\'équipements électroniques et composants industriels. Plus de 10 000 références disponibles chez NEWOTEG SARL.'} />
            </Helmet>
            {/* ── Page Header ───────────────────────────────── */}
            <div className="catalogue-page__header">
                <div className="container">
                    <div className="catalogue-page__breadcrumb">
                        <Link to="/">Accueil</Link>
                        <span>/</span>
                        <span className="catalogue-page__breadcrumb-active">Catalogue</span>
                        {activeCategoryName && (
                            <>
                                <span>/</span>
                                <span className="catalogue-page__breadcrumb-active">{activeCategoryName}</span>
                            </>
                        )}
                    </div>
                    <div className="catalogue-page__title-row">
                        <div>
                            <h1 className="catalogue-page__title">
                                {activeCategoryName || 'Catalogue'}
                            </h1>
                            <p className="catalogue-page__count">
                                {filteredProducts.length.toLocaleString('fr-FR')} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
                            </p>
                        </div>
                        <button
                            className="catalogue-page__filter-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <SlidersHorizontal size={18} />
                            Filtres
                        </button>
                    </div>
                </div>
            </div>

            <div className="container">
                <div className="catalogue-page__layout">
                    {/* ── Sidebar Component ───────────────────────────────── */}
                    <Sidebar
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        categories={dynamicCategories}
                        selectedCategory={selectedCategory}
                        handleCategorySelect={handleCategorySelect}
                        selectedSubCategory={selectedSubCategory}
                        handleSubCategorySelect={handleSubCategorySelect}
                        expandedCategories={expandedCategories}
                        toggleCategory={toggleCategory}
                        clearFilters={clearFilters}
                        hasActiveFilters={hasActiveFilters}
                        priceRange={priceRange}
                        setPriceRange={setPriceRange}
                        inStockOnly={inStockOnly}
                        setInStockOnly={setInStockOnly}
                    />

                    {/* ── Main Content ──────────────────────────── */}
                    <main className="catalogue-main">
                        {/* Sort Bar */}
                        <div className="catalogue-main__toolbar">
                            {/* Active Filter Chips */}
                            <div className="catalogue-main__chips">
                                {searchQuery && (
                                    <span className="catalogue-chip">
                                        Recherche: « {searchQuery} »
                                        <button onClick={() => setSearchQuery('')}><X size={12} /></button>
                                    </span>
                                )}
                                {activeCategoryName && (
                                    <span className="catalogue-chip">
                                        {activeCategoryName}
                                        <button onClick={() => { setSelectedCategory(''); setSelectedSubCategory(''); }}><X size={12} /></button>
                                    </span>
                                )}
                            </div>
                            <div className="catalogue-main__sort">
                                <label>Trier par:</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="name-asc">Nom A → Z</option>
                                    <option value="name-desc">Nom Z → A</option>
                                    <option value="price-asc">Prix ↑ croissant</option>
                                    <option value="price-desc">Prix ↓ décroissant</option>
                                </select>
                            </div>
                        </div>

                        {/* Product Grid */}
                        {isLoading ? (
                            <div className="catalogue-empty">
                                <Search size={48} strokeWidth={1} className="animate-pulse text-slate-300" />
                                <h3>Chargement des produits...</h3>
                                <p>Connexion à la base de données en cours</p>
                            </div>
                        ) : paginatedProducts.length > 0 ? (
                            <div className="catalogue-grid">
                                {paginatedProducts.map((product) => (
                                    <ProductCard key={product.code} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="catalogue-empty">
                                <Search size={48} strokeWidth={1} />
                                <h3>Aucun produit trouvé</h3>
                                <p>Essayez de modifier vos filtres ou votre recherche</p>
                                <button onClick={clearFilters} className="catalogue-empty__btn">
                                    Effacer les filtres
                                </button>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="catalogue-pagination">
                                <button
                                    className="catalogue-pagination__btn"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft size={16} />
                                    Précédent
                                </button>

                                <div className="catalogue-pagination__pages">
                                    {getPageNumbers()[0] > 1 && (
                                        <>
                                            <button
                                                className="catalogue-pagination__page"
                                                onClick={() => setCurrentPage(1)}
                                            >1</button>
                                            {getPageNumbers()[0] > 2 && <span className="catalogue-pagination__ellipsis">...</span>}
                                        </>
                                    )}
                                    {getPageNumbers().map(page => (
                                        <button
                                            key={page}
                                            className={`catalogue-pagination__page ${currentPage === page ? 'catalogue-pagination__page--active' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    {getPageNumbers().at(-1) < totalPages && (
                                        <>
                                            {getPageNumbers().at(-1) < totalPages - 1 && <span className="catalogue-pagination__ellipsis">...</span>}
                                            <button
                                                className="catalogue-pagination__page"
                                                onClick={() => setCurrentPage(totalPages)}
                                            >{totalPages}</button>
                                        </>
                                    )}
                                </div>

                                <button
                                    className="catalogue-pagination__btn"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Suivant
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Catalogue;
