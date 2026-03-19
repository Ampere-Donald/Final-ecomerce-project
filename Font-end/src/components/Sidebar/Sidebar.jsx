import { Search, SlidersHorizontal, X, ChevronRight, ChevronDown } from 'lucide-react';
import './Sidebar.scss';

const Sidebar = ({
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    categories,
    selectedCategory,
    handleCategorySelect,
    selectedSubCategory,
    handleSubCategorySelect,
    expandedCategories,
    toggleCategory,
    clearFilters,
    hasActiveFilters,
    priceRange,
    setPriceRange,
    inStockOnly,
    setInStockOnly,
    globalMinPrice,
    globalMaxPrice
}) => {
    return (
        <aside className={`catalogue-sidebar ${sidebarOpen ? 'catalogue-sidebar--open' : ''}`}>
            <div className="catalogue-sidebar__header">
                <h3 className="catalogue-sidebar__title">
                    <SlidersHorizontal size={16} />
                    Filtres
                </h3>
                <button
                    className="catalogue-sidebar__close"
                    onClick={() => setSidebarOpen(false)}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Search */}
            <div className="catalogue-sidebar__section">
                <div className="catalogue-sidebar__search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="catalogue-sidebar__search-clear">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Famille (Categories) */}
            <div className="catalogue-sidebar__section">
                <h4 className="catalogue-sidebar__section-title">FAMILLE</h4>
                <ul className="catalogue-sidebar__categories">
                    <li className="catalogue-sidebar__cat-item catalogue-sidebar__cat-item--all">
                        <button
                            className={`catalogue-sidebar__cat-name ${!selectedCategory ? 'catalogue-sidebar__cat-name--active' : ''}`}
                            onClick={() => { handleCategorySelect(''); }}
                        >
                            All Categories
                            {!selectedCategory && <ChevronRight size={14} />}
                        </button>
                    </li>
                    {categories.map(cat => (
                        <li key={cat.slug} className="catalogue-sidebar__cat-item">
                            <div
                                className={`catalogue-sidebar__cat-header ${selectedCategory === cat.slug ? 'catalogue-sidebar__cat-header--active' : ''}`}
                            >
                                <button
                                    className="catalogue-sidebar__cat-name"
                                    onClick={() => handleCategorySelect(cat.slug)}
                                >
                                    {cat.name}
                                    <span className="catalogue-sidebar__cat-count">{cat.count}</span>
                                </button>
                                {cat.subcategories.length > 1 && (
                                    <button
                                        className={`catalogue-sidebar__cat-toggle ${expandedCategories[cat.slug] ? 'catalogue-sidebar__cat-toggle--open' : ''}`}
                                        onClick={() => toggleCategory(cat.slug)}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                )}
                            </div>
                            {expandedCategories[cat.slug] && cat.subcategories.length > 1 && (
                                <ul className="catalogue-sidebar__subcats">
                                    {cat.subcategories.map(sub => (
                                        <li key={sub.slug}>
                                            <button
                                                className={`catalogue-sidebar__subcat-btn ${selectedSubCategory === sub.slug ? 'catalogue-sidebar__subcat-btn--active' : ''}`}
                                                onClick={() => handleSubCategorySelect(sub.slug, cat.slug)}
                                            >
                                                {sub.name}
                                                <span className="catalogue-sidebar__cat-count">{sub.count}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Price Range */}
            <div className="catalogue-sidebar__section">
                <h4 className="catalogue-sidebar__section-title">PRIX MAXIMUM (FCFA)</h4>
                <div className="catalogue-sidebar__price-range">
                    <input 
                        type="range" 
                        min={globalMinPrice || 0} 
                        max={globalMaxPrice || 1000000} 
                        step="1000"
                        value={priceRange[1]} 
                        onChange={(e) => setPriceRange([globalMinPrice, parseInt(e.target.value)])} 
                        style={{ width: '100%' }}
                    />
                    <div className="price-labels">
                        <span>{(globalMinPrice || 0).toLocaleString('fr-FR')} FCFA</span>
                        <span>{priceRange[1].toLocaleString('fr-FR')} FCFA</span>
                    </div>
                </div>
            </div>

            {/* Stock Availability */}
            <div className="catalogue-sidebar__section">
                <h4 className="catalogue-sidebar__section-title">DISPONIBILITÉ</h4>
                <div className="catalogue-sidebar__stock">
                    <label className="stock-radio">
                        <input 
                           type="radio" 
                           name="stock" 
                           checked={inStockOnly} 
                           onChange={() => setInStockOnly(true)} 
                        />
                        <span className="radio-custom"></span>
                        En stock uniquement
                    </label>
                    <label className="stock-radio">
                        <input 
                           type="radio" 
                           name="stock" 
                           checked={!inStockOnly} 
                           onChange={() => setInStockOnly(false)} 
                        />
                        <span className="radio-custom"></span>
                        Tous les articles
                    </label>
                </div>
            </div>

            {/* Bulk Orders */}
            <div className="catalogue-sidebar__bulk">
                <h5>Need bulk orders?</h5>
                <p>Contact our sales team for personalized wholesale quotes.</p>
                <button className="bulk-btn">Contact Support</button>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button className="catalogue-sidebar__clear" onClick={clearFilters}>
                    <X size={14} />
                    Effacer les filtres
                </button>
            )}
        </aside>
    );
};

export default Sidebar;
