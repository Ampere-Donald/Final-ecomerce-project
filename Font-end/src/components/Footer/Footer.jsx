import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MessageCircle, MapPin, ChevronDown } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useCart } from '../../context/CartContext';
import './Footer.scss';

const _rawApi = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API = _rawApi.endsWith('/api') ? _rawApi : `${_rawApi}/api`;

const Footer = () => {
    const { t } = useI18n();
    const { showToast } = useCart();
    const [openSection, setOpenSection] = useState(null);
    const [nlEmail, setNlEmail] = useState('');
    const [nlLoading, setNlLoading] = useState(false);

    const toggleSection = (index) => {
        setOpenSection(prev => prev === index ? null : index);
    };

    const handleNewsletter = async (e) => {
        e.preventDefault();
        const email = nlEmail.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showToast(t('checkout.errEmail'), 'error');
            return;
        }
        setNlLoading(true);
        try {
            const res = await fetch(`${API}/newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                showToast(t('common.success'), 'success');
                setNlEmail('');
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.message || t('common.error'), 'error');
            }
        } catch {
            showToast(t('common.error'), 'error');
        } finally {
            setNlLoading(false);
        }
    };

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

                    {/* Products Column — accordion on mobile */}
                    <div className={`footer__col footer__col--accordion ${openSection === 0 ? 'footer__col--open' : ''}`}>
                        <h3 className="footer__title" onClick={() => toggleSection(0)}>
                            {t('footer.col1Title')}
                            <ChevronDown size={16} className="footer__chevron" />
                        </h3>
                        <ul className="footer__list footer__collapsible">
                            <li><Link to="/catalogue?category=microcontrollers" className="footer__link">{t('footer.col1L1')}</Link></li>
                            <li><Link to="/catalogue?category=transistors" className="footer__link">{t('footer.col1L2')}</Link></li>
                            <li><Link to="/catalogue?category=sensors" className="footer__link">{t('footer.col1L3')}</Link></li>
                            <li><Link to="/catalogue?category=capacitors" className="footer__link">{t('footer.col1L4')}</Link></li>
                        </ul>
                    </div>

                    {/* Company Column — accordion on mobile */}
                    <div className={`footer__col footer__col--accordion ${openSection === 1 ? 'footer__col--open' : ''}`}>
                        <h3 className="footer__title" onClick={() => toggleSection(1)}>
                            {t('footer.col2Title')}
                            <ChevronDown size={16} className="footer__chevron" />
                        </h3>
                        <ul className="footer__list footer__collapsible">
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
                        <form className="footer__form" onSubmit={handleNewsletter}>
                            <input
                                type="email"
                                placeholder={t('footer.col3Place')}
                                className="footer__input"
                                value={nlEmail}
                                onChange={(e) => setNlEmail(e.target.value)}
                                required
                            />
                            <button type="submit" className="footer__submit" disabled={nlLoading}>
                                {nlLoading ? '...' : t('footer.col3Btn')}
                            </button>
                        </form>
                    </div>

                    {/* Contact Column — accordion on mobile */}
                    <div className={`footer__col footer__col--accordion ${openSection === 2 ? 'footer__col--open' : ''}`}>
                        <h3 className="footer__title" onClick={() => toggleSection(2)}>
                            {t('footer.col4Title')}
                            <ChevronDown size={16} className="footer__chevron" />
                        </h3>
                        <ul className="footer__list footer__contact-list footer__collapsible">
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
                                <span>Akwa, Campyabass, Douala</span>
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
