import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ShoppingCart, CheckCircle2, Truck, FileText, Package, Plus, Minus, ShieldCheck, Box } from 'lucide-react';
import axios from 'axios';
import { formatFCFA } from '../../utils/formatFCFA';
import { useCart } from '../../context/CartContext';
import Footer from '../../components/Footer/Footer';
import './ProductDetails.scss';

const ProductDetails = () => {
    const { code } = useParams();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('specs');
    
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const res = await axios.get('/api/produits');
                const allProducts = res.data;
                const foundProduct = allProducts.find(p => p.variantes && p.variantes.some(v => String(v.codeVariante) === String(code)));
                
                if (foundProduct) {
                    const variant = foundProduct.variantes.find(v => String(v.codeVariante) === String(code));
                    const formattedProd = {
                        model: foundProduct.nomProduit,
                        code: code,
                        brand: foundProduct.marque,
                        description: foundProduct.description,
                        categoryName: foundProduct.categorie?.nom || 'DIVERS',
                        categorySlug: foundProduct.categorie?.nom.toLowerCase().replace(/ \/ | /g, '-') || 'divers',
                        retailPrice: parseFloat(variant.prixVente || 0),
                        wholesalePrice: parseFloat(variant.prixAchat || 0),
                        image: foundProduct.imageUrl 
                            ? `http://localhost:3000${foundProduct.imageUrl}` 
                            : 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?q=80&w=400&auto=format&fit=crop'
                    };
                    setProduct(formattedProd);

                    // Related
                    const related = allProducts
                        .filter(p => p.id !== foundProduct.id && p.categorieId === foundProduct.categorieId)
                        .slice(0, 4)
                        .map(p => ({
                            model: p.nomProduit,
                            code: p.variantes && p.variantes.length > 0 ? p.variantes[0].codeVariante : p.id.split('-')[0].toUpperCase(),
                            categoryName: p.categorie?.nom || 'DIVERS',
                            retailPrice: p.variantes && p.variantes.length > 0 ? parseFloat(p.variantes[0].prixVente) : 0,
                            image: p.imageUrl 
                                ? `http://localhost:3000${p.imageUrl}` 
                                : 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?q=80&w=400&auto=format&fit=crop'
                        }));
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
        return <div className="p-20 text-center">Chargement du produit...</div>;
    }

    if (!product) {
        return (
            <div className="product-details-page">
                <div className="product-details__not-found">
                    <Package size={64} strokeWidth={1} />
                    <h2>Produit introuvable</h2>
                    <p>Le produit avec le code « {code} » n'existe pas dans notre catalogue.</p>
                    <Link to="/catalogue" className="product-details__back-btn">
                        Retour au catalogue
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    const increaseQuantity = () => setQuantity(q => q + 1);
    const decreaseQuantity = () => setQuantity(q => q > 1 ? q - 1 : 1);

    return (
        <div className="product-details-page">
            <Helmet>
                <title>{`${product.model} — ${product.categoryName} | NEWOTEG SARL`}</title>
                <meta name="description" content={`Achetez ${product.model} (${product.categoryName}) chez NEWOTEG SARL. Prix détail: ${formatFCFA(product.retailPrice)}. Qualité industrielle, livraison au Cameroun.`} />
            </Helmet>
            {/* ── Breadcrumb ──────────────────────────────── */}
            <div className="product-details__breadcrumb-bar">
                <div className="container">
                    <nav className="product-details__breadcrumb">
                        <Link to="/">Accueil</Link>
                        <ChevronRight size={14} />
                        <Link to="/catalogue">Catalogue</Link>
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
                                <img src={product.image} alt={product.model} />
                            </div>
                            {/* Mock thumbnails based on Oraimo design */}
                            <div className="product-details__thumbnails">
                                <div className="product-details__thumb product-details__thumb--active">
                                    <img src={product.image} alt="Thumbnail 1" />
                                </div>
                                <div className="product-details__thumb">
                                    <div className="product-details__thumb-placeholder" />
                                </div>
                                <div className="product-details__thumb">
                                    <div className="product-details__thumb-placeholder" />
                                </div>
                            </div>
                        </div>

                        {/* ── Right: Product Info ────────────────── */}
                        <div className="product-details__info-col">
                            <div className="product-details__badge-stock">
                                EN STOCK
                            </div>

                            <h1 className="product-details__name">{product.model}</h1>

                            <div className="product-details__reference">
                                Référence : <strong>NTG-{product.code}-TR</strong>
                            </div>

                            <div className="product-details__logistics">
                                <div className="product-details__logistics-item product-details__logistics-item--success">
                                    <CheckCircle2 size={16} />
                                    <span>5 420 unités disponibles en expédition immédiate</span>
                                </div>
                                <div className="product-details__logistics-item">
                                    <Truck size={16} />
                                    <span>Entrepôt : Hub Logistique Afrique</span>
                                </div>
                            </div>

                            {/* ── Pricing Block (Oraimo Style) ──────── */}
                            <div className="product-details__pricing-box">
                                <div className="product-details__price-retail">
                                    <span className="product-details__price-label">PRIX DÉTAIL</span>
                                    <div className="product-details__price-value">
                                        <span className="amount">{formatFCFA(product.retailPrice)}</span>
                                        <span className="unit">/ unité</span>
                                    </div>
                                </div>
                                <div className="product-details__price-divider" />
                                <div className="product-details__price-wholesale">
                                    <span className="product-details__price-label">PRIX DE GROS</span>
                                    <div className="product-details__price-value product-details__price-value--primary">
                                        <span className="amount">{formatFCFA(product.wholesalePrice)}</span>
                                        <span className="unit">/ unité</span>
                                    </div>
                                    <span className="product-details__price-min">Commande minimum : 100 unités</span>
                                </div>
                            </div>

                            {/* ── Actions Add to Cart ───────────────── */}
                            <div className="product-details__actions">
                                <div className="product-details__quantity">
                                    <button onClick={decreaseQuantity} aria-label="Decrease quantity"><Minus size={16} /></button>
                                    <input type="number" value={quantity} readOnly />
                                    <button onClick={increaseQuantity} aria-label="Increase quantity"><Plus size={16} /></button>
                                </div>
                                <button className="product-details__add-btn" onClick={() => addToCart(product, quantity)}>
                                    <ShoppingCart size={18} fill="currentColor" />
                                    Ajouter au panier
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
                            Spécifications Techniques
                        </button>
                        <button
                            className={`product-details__tab ${activeTab === 'sales' ? 'product-details__tab--active' : ''}`}
                            onClick={() => setActiveTab('sales')}
                        >
                            <Box size={16} />
                            Unité de Vente
                        </button>
                        <button
                            className={`product-details__tab ${activeTab === 'return' ? 'product-details__tab--active' : ''}`}
                            onClick={() => setActiveTab('return')}
                        >
                            <ShieldCheck size={16} />
                            Politique de Retour
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="product-details__tab-content">
                        {activeTab === 'specs' && (
                            <div className="product-details__specs-grid">
                                <div className="product-details__specs-group">
                                    <h4>Paramètres Généraux</h4>
                                    <div className="product-details__spec-row">
                                        <span>Catégorie</span>
                                        <strong>{product.categoryName}</strong>
                                    </div>
                                    <div className="product-details__spec-row">
                                        <span>Code Famille</span>
                                        <strong>{product.familleId}</strong>
                                    </div>
                                    <div className="product-details__spec-row">
                                        <span>Référence</span>
                                        <strong>{product.code}</strong>
                                    </div>
                                </div>
                                <div className="product-details__specs-group">
                                    <h4>Propriétés</h4>
                                    <div className="product-details__spec-row">
                                        <span>Marque</span>
                                        <strong>{product.marque || 'NEWOTEG Standard'}</strong>
                                    </div>
                                    <div className="product-details__spec-row">
                                        <span>Grade Qualité</span>
                                        <strong>Industriel</strong>
                                    </div>
                                </div>
                                <div className="product-details__specs-group">
                                    <h4>Emballage & Forme</h4>
                                    <div className="product-details__spec-row">
                                        <span>Type d'emballage</span>
                                        <strong>Boîte Standard</strong>
                                    </div>
                                    <div className="product-details__spec-row">
                                        <span>Type de Montage</span>
                                        <strong>N/A</strong>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'sales' && (
                            <div className="product-details__tab-pane">
                                <p>Cet article est actuellement vendu à l'unité et en cartons. Les prix de gros s'appliquent à partir de 100 unités. Contactez notre service commercial pour des configurations palette.</p>
                            </div>
                        )}
                        {activeTab === 'return' && (
                            <div className="product-details__tab-pane">
                                <p>Nous offrons une garantie d'1 an sur les composants de grade industriel. Remplacement uniquement, pas de réparation. Consultez notre politique de retour complète pour les conditions d'éligibilité.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Related Products (Frequently Bought) ──────── */}
            {relatedProducts.length > 0 && (
                <section className="product-details__related">
                    <div className="container">
                        <h2 className="product-details__related-title">Fréquemment achetés ensemble</h2>
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
            )}

            <Footer />
        </div>
    );
};

export default ProductDetails;
