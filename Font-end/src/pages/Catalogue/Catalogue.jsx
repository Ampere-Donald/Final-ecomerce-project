import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SlidersHorizontal, X, ChevronLeft, ChevronRight, Search, LayoutGrid, List } from 'lucide-react';
import axios from 'axios';
import { useDebounce } from '../../hooks/useDebounce';
import { useI18n } from '../../context/I18nContext';
import Footer from '../../components/Footer/Footer';
import Sidebar from '../../components/Sidebar/Sidebar';
import ProductCard from '../../components/ProductCard/ProductCard';

import ProductTable from '../../components/ProductTable/ProductTable';

import './Catalogue.scss';

const ITEMS_PER_PAGE = 24;

const Catalogue = () => {
    const { t } = useI18n();
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
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [viewMode, setViewMode] = useState(localStorage.getItem('catalogueViewMode') || 'grid');
    const [globalMinPrice, setGlobalMinPrice] = useState(0);
    const [globalMaxPrice, setGlobalMaxPrice] = useState(1000000);

    const debouncedSearch = useDebounce(searchQuery, 500);
    const debouncedPrice = useDebounce(priceRange, 500);

    // ── Initial Fetch (Categories, Global Price limits) ──
    useEffect(() => {
        const fetchInitialMeta = async () => {
            try {
                const [catRes, metaRes] = await Promise.all([
                    axios.get('/api/categories'),
                    axios.get('/api/produits/metadata')
                ]);
                const apiCategories = catRes.data;
                const sidebarCategories = apiCategories.map(cat => ({
                    name: cat.nom,
                    slug: cat.id, 
                    count: cat._count?.produits || cat.produits?.length || 0,
                    subcategories: []
                }));
                setDynamicCategories(sidebarCategories);

                const minP = metaRes.data.minPrice || 0;
                // Arrondir au millier supérieur pour un joli curseur
                const maxP = Math.ceil((metaRes.data.maxPrice || 1000000) / 1000) * 1000;
                
                setGlobalMinPrice(minP);
                setGlobalMaxPrice(maxP);
                
                // Set default price range if untouched
                setPriceRange([minP, maxP]);

            } catch (err) {
                console.error("Erreur chargement metadata:", err);
            }
        };
        fetchInitialMeta();
    }, []);

    // ── Fetch Dynamic Data (Products) ──
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const params = new URLSearchParams();
                params.append('page', currentPage);
                params.append('limit', 24);
                if (debouncedSearch) params.append('search', debouncedSearch);
                if (selectedCategory) params.append('categoryId', selectedCategory);
                if (debouncedPrice[0] > globalMinPrice) params.append('minPrice', debouncedPrice[0]);
                if (debouncedPrice[1] && debouncedPrice[1] < globalMaxPrice) params.append('maxPrice', debouncedPrice[1]);
                if (inStockOnly) params.append('inStock', 'true');
                if (sortBy && sortBy !== 'name-asc') params.append('sort', sortBy);


                const prodRes = await axios.get(`/api/produits?${params.toString()}`);

                const backendProducts = prodRes.data.data || [];
                const meta = prodRes.data.meta || { lastPage: 1, total: 0 };
                
                setTotalPages(meta.lastPage);
                setTotalProducts(meta.total);

                const formattedProducts = backendProducts.map(p => ({
                    model: p.nomProduit,
                    code: p.id.split('-')[0].toUpperCase(),
                    brand: p.marque,
                    description: p.description,
                    categoryName: p.categorie?.nom || 'DIVERS',
                    categoryId: p.categorie?.id || '',
                    categorySlug: p.categorie?.id || 'divers',
                    retailPrice: p.prixDetail ?? 0,
                    wholesalePrice: p.prixGros ?? 0,
                    stock: p.quantiteStock ?? 0,
                    oldPrice: null,
                    parentCategory: 'ÉQUIPEMENTS',
                    urlDatasheet: p.urlDatasheet || null,
                    image: p.imageUrl 
                        ? `http://localhost:3000${p.imageUrl}` 
                        : 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?q=80&w=400&auto=format&fit=crop'
                }));


                setProducts(formattedProducts);

            } catch (err) {
                console.error("Erreur de chargement des données", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentPage, debouncedSearch, selectedCategory, debouncedPrice, inStockOnly, sortBy, globalMinPrice, globalMaxPrice]);

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

    // ── Sorting (Now handled completely by the server) ──
    const sortedProducts = products;

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, selectedCategory, selectedSubCategory, sortBy, debouncedPrice, inStockOnly]);

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
        if (window.innerWidth < 992) setSidebarOpen(false);
    };

    const handleSubCategorySelect = (subSlug, parentSlug) => {
        if (selectedSubCategory === subSlug) {
            setSelectedSubCategory('');
        } else {
            setSelectedCategory(parentSlug);
            setSelectedSubCategory(subSlug);
        }
        if (window.innerWidth < 992) setSidebarOpen(false);
    };

    const handleViewModeToggle = (mode) => {
        setViewMode(mode);
        localStorage.setItem('catalogueViewMode', mode);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedCategory('');
        setSelectedSubCategory('');
        setSortBy('name-asc');
        setPriceRange([0, 1000000]);
        setInStockOnly(false);
        if (window.innerWidth < 992) setSidebarOpen(false);
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
                <title>{activeCategoryName ? t('catalogue.metaTitleCat', { category: activeCategoryName }) : t('catalogue.metaTitle')}</title>
                <meta name="description" content={activeCategoryName ? t('catalogue.metaDescCat', { category: activeCategoryName }) : t('catalogue.metaDesc')} />
            </Helmet>
            {/* ── Page Header ───────────────────────────────── */}
            <div className="catalogue-page__header">
                <div className="container">
                    <div className="catalogue-page__breadcrumb">
                        <Link to="/">{t('catalogue.homeBreadcrumb')}</Link>
                        <span>/</span>
                        {activeCategoryName ? (
                            <Link to="/catalogue">{t('catalogue.catalogueBreadcrumb')}</Link>
                        ) : (
                            <span className="catalogue-page__breadcrumb-active">{t('catalogue.catalogueBreadcrumb')}</span>
                        )}
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
                                {activeCategoryName || t('catalogue.catalogueBreadcrumb')}
                            </h1>
                            <p className="catalogue-page__count">
                                {t('catalogue.productsFound', { count: totalProducts.toLocaleString() })}
                            </p>
                        </div>
                        <button
                            className="catalogue-page__filter-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <SlidersHorizontal size={18} />
                            {t('catalogue.filters')}
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
                        globalMinPrice={globalMinPrice}
                        globalMaxPrice={globalMaxPrice}
                    />

                    {/* ── Main Content ──────────────────────────── */}
                    <main className="catalogue-main">
                        {/* Sort Bar */}
                        <div className="catalogue-main__toolbar">
                            {/* Active Filter Chips */}
                            <div className="catalogue-main__chips">
                                {searchQuery && (
                                    <span className="catalogue-chip">
                                        {t('catalogue.searchActive', { query: searchQuery })}
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
                                <div className="catalogue-main__view-toggle">
                                    <button 
                                        className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => handleViewModeToggle('grid')}
                                        title={t('catalogue.gridView')}
                                    >
                                        <LayoutGrid size={18} />
                                    </button>
                                    <button 
                                        className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                                        onClick={() => handleViewModeToggle('table')}
                                        title={t('catalogue.listView')}
                                    >
                                        <List size={18} />
                                    </button>
                                </div>
                                <label>{t('catalogue.sortBy')}</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="name-asc">{t('catalogue.sortNameAsc')}</option>
                                    <option value="name-desc">{t('catalogue.sortNameDesc')}</option>
                                    <option value="price-asc">{t('catalogue.sortPriceAsc')}</option>
                                    <option value="price-desc">{t('catalogue.sortPriceDesc')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Product Grid */}
                        {isLoading ? (
                            <div className="catalogue-empty">
                                <Search size={48} strokeWidth={1} className="animate-pulse text-slate-300" />
                                <h3>{t('catalogue.loadingTitle')}</h3>
                                <p>{t('catalogue.loadingDesc')}</p>
                            </div>
                        ) : sortedProducts.length > 0 ? (
                            <>
                                {viewMode === 'grid' ? (
                                    <div className="catalogue-grid">
                                        {sortedProducts.map((product) => (
                                            <ProductCard key={product.code} product={product} />
                                        ))}
                                    </div>
                                ) : (
                                    <ProductTable products={sortedProducts} />
                                )}
                            </>
                        ) : (
                            <div className="catalogue-empty">
                                <Search size={48} strokeWidth={1} />
                                <h3>{t('catalogue.emptyTitle')}</h3>
                                <p>{t('catalogue.emptyDesc')}</p>
                                <button onClick={clearFilters} className="catalogue-empty__btn">
                                    {t('catalogue.clearFilters')}
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
                                    {t('common.prev')}
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
                                    {t('common.next')}
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
