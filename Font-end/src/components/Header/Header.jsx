import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, Heart, X, Search, LogOut, Globe } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { formatFCFA } from '../../utils/formatFCFA';
import SearchBar from '../SearchBar/SearchBar';
import './Header.scss';

const Header = () => {
    const { cartCount, cartTotal } = useCart();
    const { isAuthenticated, user, logout } = useAuth();
    const { lang, t, toggleLang } = useI18n();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [mobileSearchTerm, setMobileSearchTerm] = useState('');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobileMenuOpen]);

    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    const handleMobileSearch = (e) => {
        e.preventDefault();
        if (mobileSearchTerm.trim()) {
            navigate(`/catalogue?search=${encodeURIComponent(mobileSearchTerm.trim())}`);
            setMobileSearchTerm('');
            setIsMobileSearchOpen(false);
        }
    };

    const handleProfileClick = () => {
        if (isAuthenticated) {
            navigate('/profile');
        } else {
            navigate('/login?returnTo=/profile');
        }
    };

    const handleFavoritesClick = () => {
        if (isAuthenticated) {
            navigate('/favourites');
        } else {
            navigate('/login?returnTo=/favourites');
        }
    };

    const handleCartClick = () => {
        navigate('/checkout');
    };

    const handleLogout = () => {
        logout();
        closeMobileMenu();
        navigate('/');
    };

    return (
        <>
            {/* ═══════════ TOP HEADER ═══════════ */}
            <header className={`header ${isScrolled ? 'header--sticky' : ''}`}>
                <div className="header__container container">
                    {/* Logo — always visible with company name */}
                    <div className="header__logo">
                        <Link to="/" className="header__logo-link">
                            <span className="header__logo-icon">
                                <img src="/logo.png" alt="NEWOTEG Logo" className="header__logo-image" />
                            </span>
                            <span className="header__logo-text">NEWOTEG</span>
                        </Link>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="header__nav">
                        <ul className="header__nav-list">
                            <li className="header__nav-item">
                                <NavLink to="/" className={({ isActive }) => `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>{t('nav.home')}</NavLink>
                            </li>
                            <li className="header__nav-item">
                                <NavLink to="/catalogue" className={({ isActive }) => `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>{t('nav.catalogue')}</NavLink>
                            </li>
                            <li className="header__nav-item">
                                <NavLink to="/about" className={({ isActive }) => `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>{t('nav.about')}</NavLink>
                            </li>
                            <li className="header__nav-item">
                                <NavLink to="/contact" className={({ isActive }) => `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>{t('nav.contact')}</NavLink>
                            </li>
                        </ul>
                    </nav>

                    {/* Desktop Actions */}
                    <div className="header__actions">
                        <button onClick={toggleLang} className="header__action-btn header__action-btn--lang" aria-label="Switch language">
                            <Globe size={18} />
                            <span className="header__lang-label">{lang.toUpperCase()}</span>
                        </button>
                        <SearchBar />
                        <button onClick={handleFavoritesClick} className="header__action-btn header__action-btn--icon-only" aria-label="Favoris">
                            <Heart size={20} />
                        </button>
                        <button onClick={handleProfileClick} className="header__action-btn header__action-btn--icon-only" aria-label="Mon Compte">
                            <User size={20} />
                            {isAuthenticated && (
                                <span className="header__user-dot" />
                            )}
                        </button>
                        <button onClick={handleCartClick} className="header__action-btn header__action-btn--cart" aria-label="Panier">
                            <ShoppingCart size={20} />
                            {cartCount > 0 && <span className="header__cart-badge">{cartCount}</span>}
                        </button>
                    </div>

                    {/* Mobile Actions (right side of header) */}
                    <div className="header__mobile-actions">
                        <button
                            className="header__mobile-action-btn"
                            aria-label="Rechercher"
                            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                        >
                            <Search size={20} />
                        </button>
                        <button onClick={handleCartClick} className="header__mobile-action-btn header__mobile-action-btn--cart" aria-label="Panier">
                            <ShoppingCart size={20} />
                            {cartCount > 0 && <span className="header__mobile-action-badge">{cartCount}</span>}
                        </button>
                        <button
                            className="header__mobile-action-btn"
                            aria-label="Ouvrir le menu"
                            aria-expanded={isMobileMenuOpen}
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={22} />
                        </button>
                    </div>
                </div>

                {/* Mobile Quick Nav – always visible horizontal strip */}
                <div className="header__mobile-strip">
                    <nav className="header__mobile-strip-nav">
                        <NavLink to="/" end className={({ isActive }) => `header__mobile-strip-link ${isActive ? 'header__mobile-strip-link--active' : ''}`}>
                            {t('mobileStrip.home')}
                        </NavLink>
                        <NavLink to="/catalogue" className={({ isActive }) => `header__mobile-strip-link ${isActive ? 'header__mobile-strip-link--active' : ''}`}>
                            {t('mobileStrip.catalogue')}
                        </NavLink>
                        <NavLink to="/about" className={({ isActive }) => `header__mobile-strip-link ${isActive ? 'header__mobile-strip-link--active' : ''}`}>
                            {t('mobileStrip.about')}
                        </NavLink>
                        <NavLink to="/contact" className={({ isActive }) => `header__mobile-strip-link ${isActive ? 'header__mobile-strip-link--active' : ''}`}>
                            {t('mobileStrip.contact')}
                        </NavLink>
                    </nav>
                </div>

                {/* Mobile Expandable Search */}
                <div className={`header__mobile-search ${isMobileSearchOpen ? 'header__mobile-search--open' : ''}`}>
                    <form className="header__mobile-search-inner container" onSubmit={handleMobileSearch}>
                        <Search size={16} className="header__mobile-search-icon" />
                        <input
                            type="text"
                            className="header__mobile-search-input"
                            placeholder={t('common.searchPlaceholder')}
                            value={mobileSearchTerm}
                            onChange={(e) => setMobileSearchTerm(e.target.value)}
                        />
                        <button
                            type="button"
                            className="header__mobile-search-close"
                            onClick={() => { setIsMobileSearchOpen(false); setMobileSearchTerm(''); }}
                            aria-label="Fermer la recherche"
                        >
                            <X size={16} />
                        </button>
                    </form>
                </div>
            </header>

            {/* ═══════════ MOBILE DRAWER ═══════════ */}
            <div
                className={`header__drawer-overlay ${isMobileMenuOpen ? 'header__drawer-overlay--open' : ''}`}
                onClick={closeMobileMenu}
                aria-hidden="true"
            />
            <nav className={`header__drawer ${isMobileMenuOpen ? 'header__drawer--open' : ''}`} aria-label="Menu mobile">
                {/* Drawer Header */}
                <div className="header__drawer-header">
                    <Link to="/" className="header__logo-link" onClick={closeMobileMenu}>
                        <span className="header__logo-icon">
                            <img src="/logo.png" alt="NEWOTEG Logo" className="header__logo-image" />
                        </span>
                        <span className="header__logo-text">NEWOTEG</span>
                    </Link>
                    <button className="header__drawer-close" onClick={closeMobileMenu} aria-label="Fermer le menu">
                        <X size={20} />
                    </button>
                </div>

                {/* Drawer user section */}
                {isAuthenticated && (
                    <div className="header__drawer-user">
                        <div className="header__drawer-user-avatar">
                            {user?.nom?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <p className="header__drawer-user-name">{user?.nom}</p>
                            <p className="header__drawer-user-email">{user?.email}</p>
                        </div>
                    </div>
                )}

                {/* Drawer Links */}
                <ul className="header__drawer-list">
                    <li>
                        <NavLink to="/" end className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            {t('drawer.home')}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/catalogue" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            {t('drawer.catalogue')}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/about" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            {t('drawer.about')}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/contact" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            {t('drawer.contact')}
                        </NavLink>
                    </li>

                    <li className="header__drawer-divider" />

                    <li>
                        <NavLink to="/checkout" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            {t('drawer.cart')}
                            {cartCount > 0 && <span className="header__drawer-badge">{cartCount} · {formatFCFA(cartTotal)}</span>}
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/favourites" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            {t('drawer.favorites')}
                        </NavLink>
                    </li>
                    <li>
                        {isAuthenticated ? (
                            <NavLink to="/profile" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                                {t('drawer.profile')}
                            </NavLink>
                        ) : (
                            <NavLink to="/login" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                                {t('drawer.login')}
                            </NavLink>
                        )}
                    </li>

                    {/* Language toggle in drawer */}
                    <li className="header__drawer-divider" />
                    <li>
                        <button className="header__drawer-link header__drawer-link--lang" onClick={toggleLang}>
                            <Globe size={18} /> {lang === 'fr' ? 'English (EN)' : 'Français (FR)'}
                        </button>
                    </li>

                    {isAuthenticated && (
                        <>
                            <li className="header__drawer-divider" />
                            <li>
                                <button className="header__drawer-link header__drawer-link--danger" onClick={handleLogout}>
                                    <LogOut size={18} /> {t('drawer.logout')}
                                </button>
                            </li>
                        </>
                    )}
                </ul>

                {/* Drawer Footer */}
                <div className="header__drawer-footer">
                    <p>© {new Date().getFullYear()} NEWOTEG SARL. {t('footer.rights')}</p>
                </div>
            </nav>
        </>
    );
};

export default Header;
