import { Link } from 'react-router-dom';
import { Phone, Mail, MessageCircle, MapPin } from 'lucide-react';
import './Footer.scss';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer__container container">
                <div className="footer__grid">
                    {/* Brand Column */}
                    <div className="footer__col footer__brand">
                        <div className="footer__logo">
                            <span className="footer__logo-icon">
                                <img src="/logo.png" alt="NEWOTEG Logo" className="footer__logo-image" />
                            </span>
                            NEWOTEG SARL
                        </div>
                        <p className="footer__description">
                            Votre partenaire de confiance pour les composants électroniques industriels et semi-conducteurs de qualité au Cameroun.
                        </p>
                    </div>

                    {/* Links Columns */}
                    <div className="footer__col">
                        <h3 className="footer__title">Produits</h3>
                        <ul className="footer__list">
                            <li><Link to="/catalogue?category=microcontrollers" className="footer__link">Microcontrôleurs</Link></li>
                            <li><Link to="/catalogue?category=transistors" className="footer__link">Transistors</Link></li>
                            <li><Link to="/catalogue?category=sensors" className="footer__link">Capteurs</Link></li>
                            <li><Link to="/catalogue?category=capacitors" className="footer__link">Condensateurs</Link></li>
                        </ul>
                    </div>

                    <div className="footer__col">
                        <h3 className="footer__title">Entreprise</h3>
                        <ul className="footer__list">
                            <li><Link to="/about" className="footer__link">À Propos</Link></li>
                            <li><Link to="/contact" className="footer__link">Contact</Link></li>
                            <li><Link to="/shipping" className="footer__link">Info Livraison</Link></li>
                            <li><Link to="/terms" className="footer__link">Conditions d'utilisation</Link></li>
                            <li><Link to="/privacy" className="footer__link">Politique de confidentialité</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter Column */}
                    <div className="footer__col footer__newsletter">
                        <h3 className="footer__title">Newsletter</h3>
                        <p className="footer__newsletter-cta">
                            Recevez nos offres B2B et promotions en avant-première !
                        </p>
                        <form className="footer__form" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder="Votre adresse email"
                                className="footer__input"
                                required
                            />
                            <button type="submit" className="footer__submit">
                                S'abonner
                            </button>
                        </form>
                    </div>

                    {/* Contact Column */}
                    <div className="footer__col footer__contact">
                        <h3 className="footer__title">Contact</h3>
                        <ul className="footer__list footer__contact-list">
                            <li className="footer__contact-item">
                                <Phone size={16} strokeWidth={1.5} />
                                <span>+237 699 966 160 / 670 478 228</span>
                            </li>
                            <li className="footer__contact-item">
                                <MessageCircle size={16} strokeWidth={1.5} />
                                <span>WhatsApp: 699 966 160</span>
                            </li>
                            <li className="footer__contact-item">
                                <Mail size={16} strokeWidth={1.5} />
                                <span>newoteg.com</span>
                            </li>
                            <li className="footer__contact-item">
                                <MapPin size={16} strokeWidth={1.5} />
                                <span>Akwa, Rue Foch, Douala</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="footer__bottom">
                    <p className="footer__copyright">
                        &copy; {new Date().getFullYear()} NEWOTEG SARL. Tous droits réservés. Composants de Grade Industriel.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
