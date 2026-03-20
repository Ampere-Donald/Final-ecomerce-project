import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Trash2, Plus, Minus, CheckCircle2, Circle, Lock, ShieldCheck, ShoppingCart, UserPlus, PackageCheck } from 'lucide-react';
import { formatFCFA } from '../../utils/formatFCFA';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Footer from '../../components/Footer/Footer';
import './Checkout.scss';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Checkout = () => {
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
        if (!fullName.trim() || fullName.trim().length < 2) errors.fullName = 'Le nom complet est requis (min. 2 caractères)';
        if (!phone.trim() || phone.trim().length < 6) errors.phone = 'Un numéro de téléphone valide est requis';
        if (shipping === 'standard' && (!address.trim() || address.trim().length < 5)) {
            errors.address = "L'adresse de livraison est requise pour la livraison standard";
        }
        if (cart.length === 0) errors.cart = 'Votre panier est vide';

        // Account creation fields (only when not authenticated)
        if (!isAuthenticated) {
            if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                errors.email = 'Une adresse email valide est requise';
            }
            if (!createAccount) {
                errors.createAccount = 'La création de compte est obligatoire pour le suivi de commande';
            }
            if (createAccount && (!password || password.length < 6)) {
                errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
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
                ? 'Retrait en agence — Yaoundé, Bastos'
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
                Array.isArray(msg) ? msg.join(', ') : msg || 'Une erreur est survenue. Veuillez réessayer.'
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
                    <title>Commande Confirmée — NEWOTEG SARL</title>
                </Helmet>
                <div className="checkout__success-overlay">
                    <div className="checkout__success-modal">
                        <div className="checkout__success-icon">
                            <PackageCheck size={48} strokeWidth={1.5} />
                        </div>
                        <h2>Commande Confirmée !</h2>
                        <p className="checkout__success-subtitle">
                            Votre commande a été enregistrée avec succès et est en cours de traitement.
                        </p>
                        <div className="checkout__success-info">
                            <div className="checkout__success-row">
                                <span>Numéro de suivi</span>
                                <strong>{orderSuccess.numeroSuivi}</strong>
                            </div>
                            <div className="checkout__success-row">
                                <span>Montant total</span>
                                <strong>{formatFCFA(orderSuccess.total)}</strong>
                            </div>
                        </div>
                        <p className="checkout__success-note">
                            Un membre de notre équipe vous contactera sous peu pour confirmer les détails de votre commande.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/profile" className="checkout__place-order-btn" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center', background: 'transparent', border: '2px solid currentColor', color: 'inherit' }}>
                                Voir mon historique
                            </Link>
                            <Link to="/catalogue" className="checkout__place-order-btn" style={{ textDecoration: 'none', display: 'inline-flex', justifyContent: 'center' }}>
                                Continuer mes achats
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
                <title>Panier &amp; Paiement — NEWOTEG SARL</title>
                <meta name="description" content="Finalisez votre commande chez NEWOTEG SARL. Paiement sécurisé et livraison rapide au Cameroun." />
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>
            {/* Steps Header */}
            <div className="checkout__steps-container">
                <div className="container">
                    <div className="checkout__steps">
                        <div className="checkout__step checkout__step--active">
                            <span className="checkout__step-num">1</span>
                            <span className="checkout__step-text">Panier</span>
                        </div>
                        <div className="checkout__step-line checkout__step-line--active" />
                        <div className="checkout__step checkout__step--active">
                            <span className="checkout__step-num">2</span>
                            <span className="checkout__step-text">Livraison</span>
                        </div>
                        <div className="checkout__step-line" />
                        <div className="checkout__step checkout__step--pending">
                            <span className="checkout__step-num">3</span>
                            <span className="checkout__step-text">Paiement</span>
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
                                <h2 className="checkout__section-title">Votre Panier</h2>
                                {cart.length === 0 ? (
                                    <div className="checkout__empty-state" style={{ textAlign: 'center', padding: '3rem 1rem', color: '#52525B' }}>
                                        <ShoppingCart size={48} strokeWidth={1} style={{ margin: '0 auto 1rem', color: '#A1A1AA' }} />
                                        <h3 style={{ marginBottom: '0.5rem', color: '#18181B' }}>Votre panier est vide</h3>
                                        <p style={{ marginBottom: '1.5rem' }}>Vous n'avez pas encore ajouté d'articles à votre panier.</p>
                                        <Link to="/catalogue" className="checkout__place-order-btn" style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none' }}>
                                            Parcourir le catalogue
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
                                <h2 className="checkout__section-title">Mode de livraison</h2>
                                <div className="checkout__shipping-options">
                                    <div
                                        className={`checkout__option-box ${shipping === 'standard' ? 'checkout__option-box--active' : ''}`}
                                        onClick={() => setShipping('standard')}
                                    >
                                        <div className="checkout__option-header">
                                            <div>
                                                <h4>Livraison standard</h4>
                                                <p>2-3 jours ouvrables</p>
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
                                                <h4>Retrait en agence</h4>
                                                <p>Yaoundé, Rue Bastos</p>
                                            </div>
                                            {shipping === 'pickup' ? <CheckCircle2 size={20} className="text-primary" /> : <Circle size={20} className="text-muted" />}
                                        </div>
                                        <div className="checkout__option-price text-primary">Gratuit</div>
                                    </div>
                                </div>

                                <div className="checkout__shipping-form">
                                    <div className="checkout__form-group">
                                        <label>Nom complet *</label>
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
                                        <label>Téléphone (Mobile Money) *</label>
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
                                        <label>Adresse email {!isAuthenticated ? '*' : ''}</label>
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
                                        <label>Adresse de livraison {shipping === 'standard' ? '*' : '(optionnel pour retrait)'}</label>
                                        <input
                                            type="text"
                                            placeholder={shipping === 'pickup' ? 'Retrait en agence — Yaoundé, Bastos' : 'Nom de rue, Quartier, Ville'}
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
                                        Créer votre compte
                                    </h2>
                                    <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                                        Un compte est nécessaire pour suivre votre commande et consulter votre historique d'achats.
                                    </p>

                                    <div className="checkout__form-group">
                                        <label>Mot de passe *</label>
                                        <input
                                            type="password"
                                            placeholder="Minimum 6 caractères"
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
                                            <strong>Créer mon compte</strong> pour le suivi de ma commande et l'accès à mon historique d'achats.
                                        </span>
                                    </label>
                                    {formErrors.createAccount && <p className="checkout__field-error">{formErrors.createAccount}</p>}

                                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                        Vous avez déjà un compte ? <Link to="/login?returnTo=/checkout" style={{ color: '#2A2FCE', fontWeight: 600 }}>Se connecter</Link>
                                    </p>
                                </section>
                            )}
                        </div>

                        {/* Right : Order Summary */}
                        <div className="checkout__right">

                            {/* Order Summary Section */}
                            <section className="checkout__section checkout__summary">
                                <h2 className="checkout__section-title">Récapitulatif</h2>
                                <div className="checkout__summary-lines">
                                    <div className="checkout__summary-line">
                                        <span>Sous-total</span>
                                        <strong>{formatFCFA(subtotal)}</strong>
                                    </div>
                                    <div className="checkout__summary-line">
                                        <span>Livraison</span>
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
                                        <span className="tax-incl">TOUTES TAXES COMPRISES</span>
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
                                    {isSubmitting ? 'Traitement en cours...' : 'Valider la commande'}
                                    {!isSubmitting && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    )}
                                </button>
                                <div className="checkout__summary-trusted">
                                    <span style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                        <Lock size={14} /> Paiement sécurisé et chiffré
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
                            Paiement 100% Sécurisé
                        </div>
                        <div className="checkout__footer-copy">
                            &copy; 2024 NEWOTEG SARL. Tous droits réservés.
                        </div>
                        <div className="checkout__footer-links">
                            <a href="#">Politique de confidentialité</a>
                            <a href="#">Conditions générales</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
