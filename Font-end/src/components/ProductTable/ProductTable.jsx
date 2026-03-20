import { Link } from 'react-router-dom';
import { ShoppingCart, FileText } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatFCFA } from '../../utils/formatFCFA';
import './ProductTable.scss';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?q=80&w=400&auto=format&fit=crop';

const ProductTable = ({ products }) => {
    const { addToCart } = useCart();

    return (
        <div className="product-table-container">
            <table className="product-table">
                <thead>
                    <tr>
                        <th className="product-table__th-img">Image</th>
                        <th className="product-table__th-ref">Référence & Marque</th>
                        <th className="product-table__th-desc">Description courte</th>
                        <th className="product-table__th-stock">Stock</th>
                        <th className="product-table__th-price">Prix (Détail)</th>
                        <th className="product-table__th-price">Prix (Gros)</th>
                        <th className="product-table__th-action">Achat</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(product => {
                        const isBackorder = (product.stock ?? 0) <= 0;
                        
                        const handleAddToCart = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addToCart(product, 1);
                        };

                        return (
                            <tr key={product.code} className={`product-table__row ${isBackorder ? 'product-table__row--backorder' : ''}`}>
                                <td className="product-table__cell product-table__cell-img">
                                    <Link to={`/product/${product.code}`}>
                                        <img 
                                            src={product.image || PLACEHOLDER_IMG} 
                                            alt={product.model} 
                                            loading="lazy" 
                                            onError={(e) => e.target.src = PLACEHOLDER_IMG}
                                        />
                                    </Link>
                                </td>
                                <td className="product-table__cell">
                                    <Link to={`/product/${product.code}`} className="product-table__ref-link">
                                        <strong>{product.model}</strong>
                                    </Link>
                                    <span className="product-table__brand">{product.brand || 'Générique'}</span>
                                    <span className="product-table__category">{product.categoryName}</span>
                                </td>
                                <td className="product-table__cell product-table__desc">
                                    {product.description?.substring(0, 50) || 'Aucune description'}...
                                </td>
                                <td className="product-table__cell">
                                    {isBackorder ? (
                                        <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Sur commande (14j)</span>
                                    ) : (
                                        <span className="badge badge-stock">{product.stock} en stock</span>
                                    )}
                                </td>
                                <td className="product-table__cell product-table__price product-table__price--retail">
                                    {formatFCFA(product.retailPrice)}
                                </td>
                                <td className="product-table__cell product-table__price product-table__price--wholesale">
                                    {formatFCFA(product.wholesalePrice)}
                                </td>
                                <td className="product-table__cell product-table__action">
                                    <div className="product-table__action-group">
                                        {product.urlDatasheet && (
                                            <a 
                                                href={product.urlDatasheet} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="btn-datasheet-table"
                                                title="Fiche Technique"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <FileText size={18} />
                                            </a>
                                        )}
                                        <button 
                                            className="btn-add-table" 
                                            onClick={handleAddToCart}
                                            aria-label="Ajouter au panier / Précommander"
                                            title={isBackorder ? "Précommander avec délai (14j)" : "Ajouter au panier"}
                                        >
                                            <ShoppingCart size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ProductTable;
