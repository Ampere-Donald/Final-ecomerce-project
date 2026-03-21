import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Trash2, Plus, Minus, CheckCircle2, Circle, Lock, ShieldCheck, ShoppingCart, UserPlus, PackageCheck } from 'lucide-react';
import { formatFCFA } from '../../utils/formatFCFA';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Footer from '../../components/Footer/Footer';
import './Checkout.scss';

const _rawApi = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API = _rawApi.endsWith('/api') ? _rawApi : `${_rawApi}/api`;

const Checkout = () => {
    const { t } = useI18n();
    const { cartItems: cart, updateQuantity, removeFromCart: remove, clearCart } = useCart();
    const { user, isAuthenticated, loginFromToken } = useAuth();
    const [shipping, setShipping] = useState('standard');

    // ── Form state ──────────────────────────────────────────
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [password, setPassword] = useState('');
    const [createAccount, setCreateAccount] = useState(true);
    const [formErrors, setFormErrors] = useState({});

    // Pre-fill from authenticated user
    useEffect(() => {
        if (isAuthenticated && user) {
            if (!fullName && user.nom) setFullName(user.nom);
            if (!phone && user.telephone) setPhone(user.telephone);
            if (!email && user.email) setEmail(user.email);
        }
    }, [isAuthenticated, user]);

    // ── Submission state ────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(null);
    const [submitError, setSubmitError] = useState('');

    const subtotal = cart.reduce((acc, item) => acc + item.retailPrice * item.quantity, 0);
    const shippingCost = shipping === 'standard' ? 5000 : 0;
    const total = subtotal + shippingCost;

    // ── Validation ──────────────────────────────────────────
    const validate = () => {
        const errors = {};
        if (!fullName.trim() || fullName.trim().length < 2) errors.fullName = t('checkout.errFullName');
        if (!phone.trim() || phone.trim().length < 6) errors.phone = t('checkout.errPhone');
        if (shipping === 'standard' && (!address.trim() || address.trim().length < 5)) {
            errors.address = t('checkout.errAddress');
        }
        if (cart.length === 0) errors.cart = t('checkout.errCartEmpty');

        // Account creation fields (only when not authenticated)
        if (!isAuthenticated) {
            if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                errors.email = t('checkout.errEmail');
            }
            if (!createAccount) {
                errors.createAccount = t('checkout.errCreateAccount');
            }
            if (createAccount && (!password || password.length < 6)) {
                errors.password = t('checkout.errPassword');
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ── Place Order ─────────────────────────────────────────
    const handlePlaceOrder = async () => {
        if (!validate()) return;

        setIsSubmitting(true);
        setSubmitError('');

        try {
            const deliveryAddress = shipping === 'pickup'
                ? t('checkout.pickupAddress')
                : address.trim();

            const payload = {
                nomClient: fullName.trim(),
                telephone: phone.trim(),
                adresseLivraison: deliveryAddress,
                montantTotal: total,
                modeReception: shipping === 'pickup' ? 'RETRAIT_MAGASIN' : 'LIVRAISON',
                clientId: isAuthenticated && user ? user.id : undefined,
                lignes: cart.map(item => ({
                    produitId: item.id,
                    nomProduit: item.model,
                    quantite: item.quantity,
                    prixUnitaire: item.retailPrice,
                })),
            };

            let res;

            if (!isAuthenticated && email && password && createAccount) {
                // Checkout with inline account creation
                res = await axios.post(`${API}/commandes/checkout`, {
                    ...payload,
                    email: email.trim(),
                    motDePasse: password,
                });

                // Auto-login the user
                if (res.data.access_token && res.data.user) {
                    loginFromToken(res.data.access_token, res.data.user);
                }

                setOrderSuccess({
                    numeroSuivi: res.data.commande.numeroSuivi,
                    total: total,
                });
            } else {
                // Authenticated user → standard order
                res = await axios.post(`${API}/commandes`, payload);
                setOrderSuccess({
                    numeroSuivi: res.data.numeroSuivi,
                    total: total,
                });
            }

            clearCart();
        } catch (err) {
            console.error('Erreur lors de la commande', err);
            const msg = err.response?.data?.message;
            setSubmitError(
                Array.isArray(msg) ? msg.join(', ') : msg || t('checkout.errGeneral')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Success Modal ───────────────────────────────────────
    if (orderSuccess) {
        return (
            <div className="checkout-page">
                <Helmet>
                    <title>{t('checkout.successMetaTitle')}</title>
                </Helmet>
                <div className="checkout__success-overlay">
                    <div className="checkout__success-modal">
                        <div className="checkout__success-icon">
                            <PackageCheck size={48} strokeWidth={1.5} />
                        </div>
                        <h2>{t('checkout.successTitle')}</h2>
                        <p className="checkout__success-subtitle">
                            {t('checkout.successSubtitle')}
                        </p>
                        <div className="checkout__success-info">
                            <div className="checkout__success-row">
                                <span>{t('checkout.trackingSub')}</span>
                                <strong>{orderSuccess.numeroSuivi}</strong>
                            </div>
                            <div className="checkout__success-row">
                                <span>{t('checkout.totalAmount')}</span>
                                <strong>{formatFCFA(orderSuccess.total)}</strong>
                            </div>
                        </div>
                        <p className="checkout__success-note">
                            {t('checkout.successNote')}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/profile" className="checkout__place-order-btn" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', background: 'transparent', border: '2px solid currentColor', color: 'inherit' }}>
                                {t('checkout.viewHistory')}
                            </Link>
                            <Link to="/catalogue" className="checkout__place-order-btn" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}>
                                {t('checkout.continueShopping')}
                            </Link>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <Helmet>
                <title>{t('checkout.metaTitle')}</title>
                <meta name="description" content={t('checkout.metaDesc')} />
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            {/* Steps Header */}
            <div className="checkout__steps-container">
                <div className="container">
                    <div className="checkout__steps">
                        <div className="checkout__step checkout__step--active">
                            <span className="checkout__step-num">1</span>
                            <span className="checkout__step-text">{t('checkout.stepCart')}</span>
                        </div>
                        <div className="checkout__step-line checkout__step-line--active" />
                        <div className="checkout__step checkout__step--active">
                            <span className="checkout__step-num">2</span>
                            <span className="checkout__step-text">{t('checkout.stepShipping')}</span>
                        </div>
                        <div className="checkout__step-line" />
                        <div className="checkout__step checkout__step--pending">
                            <span className="checkout__step-num">3</span>
                            <span className="checkout__step-text">{t('checkout.stepPayment')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="checkout__main">
                <div className="container">
                    <div className="checkout__layout">
                        {/* Left : Cart & Shipping */}
                        <div className="checkout__left">

                            {/* Shopping Cart Section */}
                            <section className="checkout__section">
                                <h2 className="checkout__section-title">{t('checkout.yourCart')}</h2>
                                {cart.length === 0 ? (
                                    <div className="checkout__empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#52525B' }}>
                                        <ShoppingCart size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', color: '#A1A1AA' }} />
                                        <h3 style={{ marginBottom: '0.5rem', color: '#18181B' }}>{t('checkout.errCartEmpty')}</h3>
                                        <p style={{ marginBottom: '1.5rem' }}>{t('checkout.emptyCartDesc')}</p>
                                        <Link to="/catalogue" className="checkout__place-order-btn" style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none' }}>
                                            {t('checkout.browseCatalogue')}
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
                                                    <p>{item.brand || item.marque || 'NEWOTEG Standard'}</p>
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
                                {formErrors.cart && <p className="checkout__field-error">{formErrors.cart}</p>}
                            </section>

                            {/* Shipping Method Section */}
                            <section className="checkout__section">
                                <h2 className="checkout__section-title">{t('checkout.shippingMethod')}</h2>
                                <div className="checkout__shipping-options">
                                    <div
                                        className={`checkout__option-box ${shipping === 'standard' ? 'checkout__option-box--active' : ''}`}
                                        onClick={() => setShipping('standard')}
                                    >
                                        <div className="checkout__option-header">
                                            <div>
                                                <h4>{t('checkout.standardShipping')}</h4>
                                                <p>{t('checkout.standardDays')}</p>
                                            </div>
                                            {shipping === 'standard' ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-muted" />}
                                        </div>
                                        <div className="checkout__option-price text-primary">5 000 FCFA</div>
                                    </div>

                                    <div
                                        className={`checkout__option-box ${shipping === 'pickup' ? 'checkout__option-box--active' : ''}`}
                                        onClick={() => setShipping('pickup')}
                                    >
                                        <div className="checkout__option-header">
                                            <div>
                                                <h4>{t('checkout.pickup')}</h4>
                                                <p>{t('checkout.pickupLocation')}</p>
                                            </div>
                                            {shipping === 'pickup' ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-muted" />}
                                        </div>
                                        <div className="checkout__option-price text-primary">{t('checkout.free')}</div>
                                    </div>
                                </div>

                                <div className="checkout__shipping-form">
                                    <div className="checkout__form-group">
                                        <label>{t('checkout.fullName')}</label>
                                        <input
                                            type="text"
                                            placeholder="Jean Dupont"
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            className={formErrors.fullName ? 'input--error' : ''}
                                        />
                                        {formErrors.fullName && <p className="checkout__field-error">{formErrors.fullName}</p>}
                                    </div>
                                    <div className="checkout__form-group">
                                        <label>{t('checkout.phone')}</label>
                                        <input
                                            type="tel"
                                            placeholder="+237 6xx xxx xxx"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className={formErrors.phone ? 'input--error' : ''}
                                        />
                                        {formErrors.phone && <p className="checkout__field-error">{formErrors.phone}</p>}
                                    </div>

                                    {/* Email field — always shown for contact, but required for non-auth users */}
                                    <div className="checkout__form-group">
                                        <label>{t('checkout.email')} {!isAuthenticated ? '*' : ''}</label>
                                        <input
                                            type="email"
                                            placeholder="votre@email.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            disabled={isAuthenticated}
                                            className={formErrors.email ? 'input--error' : ''}
                                        />
                                        {formErrors.email && <p className="checkout__field-error">{formErrors.email}</p>}
                                    </div>

                                    <div className="checkout__form-group checkout__form-group--full">
                                        <label>{t('checkout.deliveryAddress')} {shipping === 'standard' ? '*' : t('checkout.optionalPickup')}</label>
                                        <input
                                            type="text"
                                            placeholder={shipping === 'pickup' ? t('checkout.pickupAddress') : t('checkout.addressPlaceholder')}
                                            value={address}
                                            onChange={e => setAddress(e.target.value)}
                                            disabled={shipping === 'pickup'}
                                            className={formErrors.address ? 'input--error' : ''}
                                        />
                                        {formErrors.address && <p className="checkout__field-error">{formErrors.address}</p>}
                                    </div>
                                </div>
                            </section>

                            {/* ── Account Creation Section (only for non-auth users) ── */}
                            {!isAuthenticated && (
                                <section className="checkout__section checkout__account-section">
                                    <h2 className="checkout__section-title">
                                        <UserPlus size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                        {t('checkout.createAccountTitle')}
                                    </h2>
                                    <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                                        {t('checkout.createAccountDesc')}
                                    </p>

                                    <div className="checkout__form-group">
                                        <label>{t('checkout.password')}</label>
                                        <input
                                            type="password"
                                            placeholder={t('checkout.passwordPlaceholder')}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={formErrors.password ? 'input--error' : ''}
                                        />
                                        {formErrors.password && <p className="checkout__field-error">{formErrors.password}</p>}
                                    </div>

                                    <label className="checkout__checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginTop: '1rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={createAccount}
                                            onChange={e => setCreateAccount(e.target.checked)}
                                            style={{ marginTop: '3px', accentColor: '#2A2FCE', width: '18px', height: '18px', flexShrink: 0 }}
                                        />
                                        <span style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>
                                            <strong>{t('checkout.createAccountCheck')}</strong> {t('checkout.createAccountExplain')}
                                        </span>
                                    </label>
                                    {formErrors.createAccount && <p className="checkout__field-error">{formErrors.createAccount}</p>}

                                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                        {t('checkout.haveAccount')} <Link to="/login?returnTo=/checkout" style={{ color: '#2A2FCE', fontWeight: 600 }}>{t('checkout.login')}</Link>
                                    </p>
                                </section>
                            )}
                        </div>

                        {/* Right : Order Summary */}
                        <div className="checkout__right">

                            {/* Order Summary Section */}
                            <section className="checkout__section checkout__summary">
                                <h2 className="checkout__section-title">{t('checkout.summaryTitle')}</h2>
                                <div className="checkout__summary-lines">
                                    <div className="checkout__summary-line">
                                        <span>{t('checkout.subtotal')}</span>
                                        <strong>{formatFCFA(subtotal)}</strong>
                                    </div>
                                    <div className="checkout__summary-line">
                                        <span>{t('checkout.stepShipping')}</span>
                                        <strong>{formatFCFA(shippingCost)}</strong>
                                    </div>
                                    <div className="checkout__summary-line">
                                        <span>{t('checkout.taxes')}</span>
                                        <strong>0 FCFA</strong>
                                    </div>
                                </div>
                                <div className="checkout__summary-total">
                                    <div className="checkout__total-label">
                                        <span className="total">{t('checkout.total')}</span>
                                    </div>
                                    <div className="checkout__total-value">
                                        <span className="amount">{formatFCFA(total)}</span>
                                        <span className="tax-incl">{t('checkout.taxIncluded')}</span>
                                    </div>
                                </div>

                                {submitError && (
                                    <div className="checkout__submit-error">
                                        {submitError}
                                    </div>
                                )}

                                <button
                                    className="checkout__place-order-btn"
                                    onClick={handlePlaceOrder}
                                    disabled={isSubmitting || cart.length === 0}
                                    style={isSubmitting ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                                >
                                    {isSubmitting ? t('checkout.processing') : t('checkout.validateOrder')}
                                    {!isSubmitting && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    )}
                                </button>
                                <div className="checkout__summary-trusted">
                                    <span style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                        <Lock size={14} /> {t('checkout.securePayment')}
                                    </span>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* Checkout footer */}
            <div className="checkout__footer">
                <div className="container">
                    <div className="checkout__footer-inner">
                        <div className="checkout__footer-secure">
                            <ShieldCheck size={18} fill="#2A2FCE" color="white" />
                            {t('checkout.payment100')}
                        </div>
                        <div className="checkout__footer-copy">
                            &copy; {new Date().getFullYear()} NEWOTEG SARL. {t('checkout.allRightsReserved')}
                        </div>
                        <div className="checkout__footer-links">
                            <a href="#">{t('checkout.privacyPolicy')}</a>
                            <a href="#">{t('checkout.termsConditions')}</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
