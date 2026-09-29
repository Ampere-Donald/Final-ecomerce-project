import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { formatFCFA } from "../utils/formatFCFA";
import { Copy, Crumbs, Photo, Price } from "./Elements";
import Footer from "./Footer";
export default function Cart() {
  const { cartItems, cartTotal, removeFromCart, updateQuantity } = useCart();
  const { lang } = useI18n();
  return (
    <>
      <div className="e-wrap e-cart-page">
        <Crumbs title={lang === "fr" ? "Panier" : "Cart"} />
        <div className="e-page-lead">
          <h1>
            <Copy fr="Votre panier" en="Your cart" />
          </h1>
          <p>
            <Copy
              fr="Vérifiez les références et les quantités avant de continuer."
              en="Check references and quantities before continuing."
            />
          </p>
        </div>
        {cartItems.length ? (
          <div className="e-cart-layout">
            <section>
              {cartItems.map((item) => (
                <article key={item.code} className="e-cart-line">
                  <Link to={`/product/${item.id}`} className="e-cart-photo">
                    <Photo product={item} />
                  </Link>
                  <div>
                    <h2>
                      <Link to={`/product/${item.id}`}>{item.model}</Link>
                    </h2>
                    <p className="e-reference">
                      {item.reference || item.brand || item.categoryName}
                    </p>
                    <p>
                      {formatFCFA(item.retailPrice)} /{" "}
                      <Copy fr="unité" en="unit" />
                    </p>
                    <div className="e-cart-controls">
                      <div className="e-quantity">
                        <button
                          aria-label={
                            lang === "fr"
                              ? "Diminuer la quantité"
                              : "Decrease quantity"
                          }
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            updateQuantity(item.code, item.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <output>{item.quantity}</output>
                        <button
                          aria-label={
                            lang === "fr"
                              ? "Augmenter la quantité"
                              : "Increase quantity"
                          }
                          disabled={
                            Number.isFinite(item.stock) &&
                            item.quantity >= item.stock
                          }
                          onClick={() =>
                            updateQuantity(item.code, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="e-text-button"
                        onClick={() => removeFromCart(item.code)}
                      >
                        <Copy fr="Retirer" en="Remove" />
                      </button>
                    </div>
                  </div>
                  <Price value={item.retailPrice * item.quantity} />
                </article>
              ))}
              <div className="e-note e-gold-note">
                <Copy
                  fr="Un doute sur le connecteur ? Vérifiez la fiche ou demandez conseil avant de commander."
                  en="Unsure about a connector? Check the product page or ask for advice before ordering."
                />
              </div>
              <Link to="/catalogue">
                <Copy fr="Continuer mes achats" en="Continue shopping" />
              </Link>
            </section>
            <aside className="e-summary">
              <h2>
                <Copy fr="Votre récapitulatif" en="Order summary" />
              </h2>
              <div>
                <span>
                  <Copy fr="Articles" en="Items" />
                </span>
                <strong>{formatFCFA(cartTotal)}</strong>
              </div>
              <div>
                <span>
                  <Copy fr="Livraison" en="Delivery" />
                </span>
                <span>
                  <Copy fr="À confirmer" en="To confirm" />
                </span>
              </div>
              <div className="e-total">
                <span>
                  <Copy fr="Sous-total" en="Subtotal" />
                </span>
                <strong>{formatFCFA(cartTotal)}</strong>
              </div>
              <p>
                <Copy
                  fr="Le stock, les tarifs et les frais éventuels doivent être vérifiés avant l’enregistrement."
                  en="Stock, prices and any fees need confirmation before ordering."
                />
              </p>
              <Link className="e-btn" to="/checkout">
                <Copy
                  fr="Choisir la réception"
                  en="Choose delivery or pickup"
                />
              </Link>
            </aside>
          </div>
        ) : (
          <div className="e-state">
            <ShoppingCart size={40} />
            <h2>
              <Copy
                fr="Votre panier attend vos projets"
                en="Your cart is ready for your projects"
              />
            </h2>
            <p>
              <Copy
                fr="Retrouvez une référence ou explorez nos familles de produits."
                en="Find a reference or explore our product categories."
              />
            </p>
            <Link className="e-btn" to="/catalogue">
              <Copy fr="Découvrir le catalogue" en="Explore the catalogue" />
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
