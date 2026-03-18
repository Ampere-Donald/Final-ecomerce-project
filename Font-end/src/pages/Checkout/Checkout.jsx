import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Trash2, Plus, Minus, CheckCircle2, Circle, Lock, ShieldCheck, ShoppingCart } from 'lucide-react';
import { formatFCFA } from '../../utils/formatFCFA';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer/Footer';
import './Checkout.scss';

const Checkout = () => {
    const { cartItems: cart, updateQuantity, removeFromCart: remove } = useCart();
    const [shipping, setShipping] = useState('standard');
    const [payment, setPayment] = useState('card');

    const subtotal = cart.reduce((acc, item) => acc + item.retailPrice * item.quantity, 0);
    const shippingCost = shipping === 'standard' ? 5000 : 0;
    const total = subtotal + shippingCost;

    return (
        <div className="checkout-page">
            <Helmet>
                <title>Panier & Paiement — NEWOTEG SARL</title>
                <meta name="description" content="Finalisez votre commande chez NEWOTEG SARL. Paiement sécurisé et livraison rapide au Cameroun." />
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            {/* Steps Header */}
            <div className="checkout__steps-container">
                <div className="container">
                    <div className="checkout__steps">
                        <div className="checkout__step checkout__step--active">
                            <span className="checkout__step-num">1</span>
                            <span className="checkout__step-text">Cart</span>
                        </div>
                        <div className="checkout__step-line checkout__step-line--active" />
                        <div className="checkout__step checkout__step--active">
                            <span className="checkout__step-num">2</span>
                            <span className="checkout__step-text">Shipping</span>
                        </div>
                        <div className="checkout__step-line" />
                        <div className="checkout__step checkout__step--pending">
                            <span className="checkout__step-num">3</span>
                            <span className="checkout__step-text">Payment</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="checkout__main">
                <div className="container">
                    <div className="checkout__layout">
                        {/* 左侧区域 : Cart & Shipping */}
                        <div className="checkout__left">

                            {/* Shopping Cart Section */}
                            <section className="checkout__section">
                                <h2 className="checkout__section-title">Your Shopping Cart</h2>
                                {cart.length === 0 ? (
                                    <div className="checkout__empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#52525B' }}>
                                        <ShoppingCart size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', color: '#A1A1AA' }} />
                                        <h3 style={{ marginBottom: '0.5rem', color: '#18181B' }}>Your cart is empty</h3>
                                        <p style={{ marginBottom: '1.5rem' }}>Looks like you haven't added anything to your cart yet.</p>
                                        <Link to="/catalogue" className="checkout__place-order-btn" style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none' }}>
                                            Continue Shopping
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="checkout__cart-list">
                                        {cart.map(item => (
                                            <div key={item.code} className="checkout__cart-item">
                                                <div className="checkout__cart-image">
                                                    <img src={item.image} alt={item.model} />
                                                </div>
                                                <div className="checkout__cart-details">
                                                    <h3>{item.model}</h3>
                                                    <p>{item.marque || 'NEWOTEG Standard'}</p>
                                                    <div className="checkout__cart-price">{formatFCFA(item.retailPrice)}</div>
                                                </div>
                                                <div className="checkout__cart-actions">
                                                    <div className="checkout__quantity">
                                                        <button onClick={() => updateQuantity(item.code, item.quantity - 1)} disabled={item.quantity <= 1}><Minus size={14} /></button>
                                                        <input type="text" value={item.quantity} readOnly />
                                                        <button onClick={() => updateQuantity(item.code, item.quantity + 1)}><Plus size={14} /></button>
                                                    </div>
                                                    <button className="checkout__cart-remove" onClick={() => remove(item.code)}>
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Shipping Method Section */}
                            <section className="checkout__section">
                                <h2 className="checkout__section-title">Shipping Method</h2>
                                <div className="checkout__shipping-options">
                                    <div
                                        className={`checkout__option-box ${shipping === 'standard' ? 'checkout__option-box--active' : ''}`}
                                        onClick={() => setShipping('standard')}
                                    >
                                        <div className="checkout__option-header">
                                            <div>
                                                <h4>Standard Delivery</h4>
                                                <p>2-3 Business Days</p>
                                            </div>
                                            {shipping === 'standard' ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-muted" />}
                                        </div>
                                        <div className="checkout__option-price text-primary">5,000 FCFA</div>
                                    </div>

                                    <div
                                        className={`checkout__option-box ${shipping === 'pickup' ? 'checkout__option-box--active' : ''}`}
                                        onClick={() => setShipping('pickup')}
                                    >
                                        <div className="checkout__option-header">
                                            <div>
                                                <h4>Pick up at Office</h4>
                                                <p>Yaoundé, Bastos Street</p>
                                            </div>
                                            {shipping === 'pickup' ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-muted" />}
                                        </div>
                                        <div className="checkout__option-price text-primary">Free</div>
                                    </div>
                                </div>

                                <div className="checkout__shipping-form">
                                    <div className="checkout__form-group">
                                        <label>Full Name</label>
                                        <input type="text" placeholder="John Doe" />
                                    </div>
                                    <div className="checkout__form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" placeholder="+237 6xx xxx xxx" />
                                    </div>
                                    <div className="checkout__form-group checkout__form-group--full">
                                        <label>Delivery Address</label>
                                        <input type="text" placeholder="Street name, Neighborhood, City" />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* 右侧区域 : Payment & Order Summary */}
                        <div className="checkout__right">

                            {/* Payment Method Section */}
                            <section className="checkout__section">
                                <h2 className="checkout__section-title">Payment Method</h2>
                                <div className="checkout__payment-options">
                                    <div
                                        className={`checkout__option-box ${payment === 'card' ? 'checkout__option-box--active' : ''}`}
                                        onClick={() => setPayment('card')}
                                    >
                                        <div className="checkout__payment-logo checkout__payment-logo--card">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                                        </div>
                                        <div className="checkout__payment-info">
                                            <h4>Credit / Debit Card</h4>
                                            <p>Secure online payment</p>
                                        </div>
                                        <div className="checkout__payment-radio">
                                            {payment === 'card' ? <span className="radio-inner" /> : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="checkout__form-group" style={{ marginTop: '1.5rem' }}>
                                    <label>Card Number</label>
                                    <input type="text" placeholder="0000 0000 0000 0000" />
                                </div>
                                <div className="checkout__card-details-grid">
                                    <div className="checkout__form-group">
                                        <label>Expiry Date</label>
                                        <input type="text" placeholder="MM/YY" />
                                    </div>
                                    <div className="checkout__form-group">
                                        <label>CVC</label>
                                        <input type="text" placeholder="123" />
                                    </div>
                                </div>
                                <div className="checkout__secure-note" style={{ marginTop: '1.5rem' }}>
                                    <Lock size={12} />
                                    Your transaction is secured by SSL encryption
                                </div>
                            </section>

                            {/* Order Summary Section */}
                            <section className="checkout__section checkout__summary">
                                <h2 className="checkout__section-title">Order Summary</h2>
                                <div className="checkout__summary-lines">
                                    <div className="checkout__summary-line">
                                        <span>Subtotal</span>
                                        <strong>{formatFCFA(subtotal)}</strong>
                                    </div>
                                    <div className="checkout__summary-line">
                                        <span>Shipping</span>
                                        <strong>{formatFCFA(shippingCost)}</strong>
                                    </div>
                                    <div className="checkout__summary-line">
                                        <span>Taxes</span>
                                        <strong>0 FCFA</strong>
                                    </div>
                                </div>
                                <div className="checkout__summary-total">
                                    <div className="checkout__total-label">
                                        <span className="total">Total</span>
                                    </div>
                                    <div className="checkout__total-value">
                                        <span className="amount">{formatFCFA(total)}</span>
                                        <span className="tax-incl">ALL PRICES INCLUSIVE</span>
                                    </div>
                                </div>
                                <button className="checkout__place-order-btn">
                                    Place Order
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </button>
                                <div className="checkout__summary-trusted">
                                    <span style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                        <Lock size={14} /> Secure encrypted checkout
                                    </span>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Checkout footer from mockup */}
            <div className="checkout__footer">
                <div className="container">
                    <div className="checkout__footer-inner">
                        <div className="checkout__footer-secure">
                            <ShieldCheck size={18} fill="#2A2FCE" color="white" />
                            100% Secure Checkout
                        </div>
                        <div className="checkout__footer-copy">
                            &copy; 2024 NEWOTEG SARL. All rights reserved.
                        </div>
                        <div className="checkout__footer-links">
                            <a href="#">Privacy Policy</a>
                            <a href="#">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Add ShieldCheck to lucide imports (already done above, wait I need to import ShieldCheck in the start)
export default Checkout;
