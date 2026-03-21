import { Link } from 'react-router-dom';
import { Phone, Mail, MessageCircle, MapPin } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import './Footer.scss';

const Footer = () => {
    const { t } = useI18n();
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
                            {t('footer.desc')}
                        </p>
                    </div>

                    {/* Links Columns */}
                    <div className="footer__col">
                        <h3 className="footer__title">{t('footer.col1Title')}</h3>
                        <ul className="footer__list">
                            <li><Link to="/catalogue?category=microcontrollers" className="footer__link">{t('footer.col1L1')}</Link></li>
                            <li><Link to="/catalogue?category=transistors" className="footer__link">{t('footer.col1L2')}</Link></li>
                            <li><Link to="/catalogue?category=sensors" className="footer__link">{t('footer.col1L3')}</Link></li>
                            <li><Link to="/catalogue?category=capacitors" className="footer__link">{t('footer.col1L4')}</Link></li>
                        </ul>
                    </div>

                    <div className="footer__col">
                        <h3 className="footer__title">{t('footer.col2Title')}</h3>
                        <ul className="footer__list">
                            <li><Link to="/about" className="footer__link">{t('footer.col2L1')}</Link></li>
                            <li><Link to="/contact" className="footer__link">{t('footer.col2L2')}</Link></li>
                            <li><Link to="/shipping" className="footer__link">{t('footer.col2L3')}</Link></li>
                            <li><Link to="/terms" className="footer__link">{t('footer.terms')}</Link></li>
                            <li><Link to="/privacy" className="footer__link">{t('footer.privacy')}</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter Column */}
                    <div className="footer__col footer__newsletter">
                        <h3 className="footer__title">{t('footer.col3Title')}</h3>
                        <p className="footer__newsletter-cta">
                            {t('footer.col3Desc')}
                        </p>
                        <form className="footer__form" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder={t('footer.col3Place')}
                                className="footer__input"
                                required
                            />
                            <button type="submit" className="footer__submit">
                                {t('footer.col3Btn')}
                            </button>
                        </form>
                    </div>

                    {/* Contact Column */}
                    <div className="footer__col footer__contact">
                        <h3 className="footer__title">{t('footer.col4Title')}</h3>
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
                        &copy; {new Date().getFullYear()} NEWOTEG SARL. {t('footer.copyright')}
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
