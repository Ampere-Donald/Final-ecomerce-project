import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ShoppingCart, CheckCircle2, Truck, FileText, Package, Plus, Minus, ShieldCheck, Box } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import { formatFCFA } from '../../utils/formatFCFA';
import { mapProduct, getProductCode } from '../../utils/mapProduct';
import { useCart } from '../../context/CartContext';
import { useI18n } from '../../context/I18nContext';
import Footer from '../../components/Footer/Footer';
import './ProductDetails.scss';

const ProductDetails = () => {
    const { t } = useI18n();
    const { code } = useParams();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('specs');
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const res = await apiClient.get('/produits');
                const allProducts = Array.isArray(res.data) ? res.data : res.data.data || [];

                // Match the route :code param against the short code derived from the UUID
                const upperCode = code.toUpperCase();
                const foundRaw = allProducts.find(p => getProductCode(p.id) === upperCode);

                if (foundRaw) {
                    const formattedProd = mapProduct(foundRaw);
                    setProduct(formattedProd);

                    // Related products — same category, exclude current
                    const related = allProducts
                        .filter(p => p.id !== foundRaw.id && p.categorieId === foundRaw.categorieId)
                        .slice(0, 4)
                        .map(mapProduct);
                    setRelatedProducts(related);
                } else {
                    setProduct(null);
                }
            } catch (err) {
                console.error("Erreur de chargement du produit", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [code]);

    if (loading) {
        return <div className="p-20 text-center">{t('productDetails.loading')}</div>;
    }

    if (!product) {
        return (
            <div className="product-details-page">
                <div className="product-details__not-found">
                    <Package size={64} strokeWidth={1} />
                    <h2>{t('productDetails.notFoundTitle')}</h2>
                    <p>{t('productDetails.notFoundDesc', { code })}</p>
                    <Link to="/catalogue" className="product-details__back-btn">
                        {t('productDetails.backToCatalogue')}
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    const isOutOfStock = product.stock <= 0;
    const increaseQuantity = () => setQuantity(q => q + 1);
    const decreaseQuantity = () => setQuantity(q => q > 1 ? q - 1 : 1);

    return (
        <div className="product-details-page">
            <Helmet>
                <title>{t('productDetails.metaTitle', { model: product.model, category: product.categoryName })}</title>
                <meta name="description" content={t('productDetails.metaDesc', { model: product.model, category: product.categoryName, price: formatFCFA(product.retailPrice) })} />
            </Helmet>
            {/* ── Breadcrumb ──────────────────────────────── */}
            <div className="product-details__breadcrumb-bar">
                <div className="container">
                    <nav className="product-details__breadcrumb">
                        <Link to="/">{t('catalogue.homeBreadcrumb')}</Link>
                        <ChevronRight size={14} />
                        <Link to="/catalogue">{t('catalogue.catalogueBreadcrumb')}</Link>
                        <ChevronRight size={14} />
                        <Link to={`/catalogue?category=${product.categorySlug}`}>{product.categoryName}</Link>
                        <ChevronRight size={14} />
                        <span>{product.model}</span>
                    </nav>
                </div>
            </div>

            {/* ── Main Content ────────────────────────────── */}
            <section className="product-details__main">
                <div className="container">
                    <div className="product-details__layout">
                        {/* ── Left: Image Gallery ────────────────── */}
                        <div className="product-details__image-col">
                            <div className="product-details__image-main">
                                <img src={product.images[activeImageIndex] || product.image} alt={product.model} />
                            </div>
                            <div className="product-details__thumbnails">
                                {product.images.map((img, index) => (
                                    <div 
                                        key={index} 
                                        className={`product-details__thumb ${activeImageIndex === index ? 'product-details__thumb--active' : ''}`}
                                        onClick={() => setActiveImageIndex(index)}
                                    >
                                        <img src={img} alt={`${product.model} ${index + 1}`} />
                                    </div>
                                ))}
                                {/* Fill remaining slots up to 3 visually if needed, though not strictly required */}
                            </div>
                        </div>

                        {/* ── Right: Product Info ────────────────── */}
                        <div className="product-details__info-col">

                            <div className={`product-details__badge-stock ${isOutOfStock ? 'product-details__badge-stock--out' : ''}`}>
                                {isOutOfStock ? t('productDetails.outOfStockBadge') : t('productDetails.inStockBadge')}

                            </div>

                            <h1 className="product-details__name">{product.model}</h1>

                            <div className="product-details__reference">
                                {t('productDetails.reference')} <strong>NTG-{product.code}-TR</strong>
                            </div>

                            <div className="product-details__logistics">
                                <div className={`product-details__logistics-item ${isOutOfStock ? '' : 'product-details__logistics-item--success'}`}>
                                    <CheckCircle2 size={16} />

                                    <span>{isOutOfStock ? t('product.outOfStockLong') : t('productDetails.unitsAvailable', { count: product.stock.toLocaleString() })}</span>

                                </div>
                                <div className="product-details__logistics-item">
                                    <Truck size={16} />
                                    <span>{t('productDetails.warehouseHq')}</span>
                                </div>
                            </div>

                            {/* ── Pricing Block (Oraimo Style) ──────── */}
                            <div className="product-details__pricing-box">
                                <div className="product-details__price-retail">
                                    <span className="product-details__price-label">{t('productDetails.retailPriceLabel')}</span>
                                    <div className="product-details__price-value">
                                        <span className="amount">{formatFCFA(product.retailPrice)}</span>
                                        <span className="unit">{t('productDetails.perUnit')}</span>
                                    </div>
                                </div>
                                <div className="product-details__price-divider" />
                                <div className="product-details__price-wholesale">
                                    <span className="product-details__price-label">{t('productDetails.wholesalePriceLabel')}</span>
                                    <div className="product-details__price-value product-details__price-value--primary">
                                        <span className="amount">{formatFCFA(product.wholesalePrice)}</span>
                                        <span className="unit">{t('productDetails.perUnit')}</span>
                                    </div>
                                    <span className="product-details__price-min">{t('productDetails.minOrder')}</span>
                                </div>
                            </div>

                            {/* ── Actions Add to Cart ───────────────── */}
                            <div className="product-details__actions">
                                <div className="product-details__quantity">
                                    <button onClick={decreaseQuantity} aria-label="Decrease quantity"><Minus size={16} /></button>
                                    <input type="number" value={quantity} readOnly />
                                    <button onClick={increaseQuantity} aria-label="Increase quantity"><Plus size={16} /></button>
                                </div>
                                <button
                                    className={`product-details__add-btn ${isOutOfStock ? 'product-details__add-btn--disabled' : ''}`}
                                    onClick={() => { if (!isOutOfStock) addToCart(product, quantity); }}
                                    disabled={isOutOfStock}
                                >
                                    <ShoppingCart size={18} fill="currentColor" />

                                    {isOutOfStock ? t('product.unavailable') : t('product.addToCart')}

                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Tabs & Details Section ────────────────────── */}
            <section className="product-details__tabs-section">
                <div className="container">
                    <div className="product-details__tabs-header">
                        <button
                            className={`product-details__tab ${activeTab === 'specs' ? 'product-details__tab--active' : ''}`}
                            onClick={() => setActiveTab('specs')}
                        >
                            <FileText size={16} />
                            {t('productDetails.tabSpecs')}
                        </button>
                        <button
                            className={`product-details__tab ${activeTab === 'sales' ? 'product-details__tab--active' : ''}`}
                            onClick={() => setActiveTab('sales')}
                        >
                            <Box size={16} />
                            {t('productDetails.tabSales')}
                        </button>
                        <button
                            className={`product-details__tab ${activeTab === 'return' ? 'product-details__tab--active' : ''}`}
                            onClick={() => setActiveTab('return')}
                        >
                            <ShieldCheck size={16} />
                            {t('productDetails.tabReturn')}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="product-details__tab-content">
                        {activeTab === 'specs' && (
                            <div className="product-details__specs-grid">
                                <div className="product-details__specs-group">
                                    <h4>{t('productDetails.generalParams')}</h4>
                                    <div className="product-details__spec-row">
                                        <span>{t('productDetails.category')}</span>
                                        <strong>{product.categoryName}</strong>
                                    </div>
                                    <div className="product-details__spec-row">

                                        <span>{t('productDetails.familyCode')}</span>
                                        <strong>{product.familleId}</strong>
                                    </div>
                                    <div className="product-details__spec-row">
                                        <span>{t('productDetails.reference')}</span>

                                        <strong>{product.code}</strong>
                                    </div >
                                </div >
                                <div className="product-details__specs-group">
                                    <h4>{t('productDetails.properties')}</h4>
                                    <div className="product-details__spec-row">
                                        <span>{t('productDetails.brand')}</span>
                                        <strong>{product.marque || product.brand || 'NEWOTEG Standard'}</strong>
                                    </div>
                                    <div className="product-details__spec-row">
                                        <span>{t('productDetails.qualityGrade')}</span>
                                        <strong>{t('productDetails.industrial')}</strong>
                                    </div>
                                </div>
                                <div className="product-details__specs-group">
                                    <h4>{t('productDetails.packaging')}</h4>
                                    <div className="product-details__spec-row">
                                        <span>{t('productDetails.packagingType')}</span>
                                        <strong>{t('productDetails.standardBox')}</strong>
                                    </div>
                                    <div className="product-details__spec-row">
                                        <span>{t('productDetails.mountingType')}</span>
                                        <strong>N/A</strong>
                                    </div>
                                </div>
                            </div >
                        )}
                        {
                            activeTab === 'sales' && (
                                <div className="product-details__tab-pane">
                                    <p>{t('productDetails.salesText')}</p>
                                </div>
                            )
                        }
                        {
                            activeTab === 'return' && (
                                <div className="product-details__tab-pane">
                                    <p>{t('productDetails.returnText')}</p>
                                </div>
                            )
                        }
                    </div >
                </div >
            </section >

            {/* ── Related Products (Frequently Bought) ──────── */}
            {
                relatedProducts.length > 0 && (
                    <section className="product-details__related">
                        <div className="container">
                            <h2 className="product-details__related-title">{t('productDetails.frequentlyBought')}</h2>
                            <div className="product-details__related-grid">
                                {relatedProducts.map(p => (
                                    <Link to={`/product/${p.code}`} key={p.code} className="product-card-light">
                                        <div className="product-card-light__image">
                                            <img src={p.image} alt={p.model} loading="lazy" />
                                        </div>
                                        <div className="product-card-light__body">
                                            <h3 className="product-card-light__name">{p.model}</h3>
                                            <p className="product-card-light__desc">{p.categoryName}</p>
                                            <div className="product-card-light__bottom">
                                                <span className="product-card-light__price">{formatFCFA(p.retailPrice)}</span>
                                                <button className="product-card-light__add" onClick={(e) => { e.preventDefault(); addToCart(p, 1); }}>+</button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )
            }

            <Footer />
        </div >
    );
};

export default ProductDetails;
