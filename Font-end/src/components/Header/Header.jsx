import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ShoppingCart, User, Menu, Heart, X, Search } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import SearchBar from '../SearchBar/SearchBar';
import './Header.scss';

const Header = () => {
    const { cartCount } = useCart();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
                                <NavLink to="/" className={({ isActive }) => `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>HOME</NavLink>
                            </li>
                            <li className="header__nav-item">
                                <NavLink to="/catalogue" className={({ isActive }) => `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>CATALOGUE</NavLink>
                            </li>
                            <li className="header__nav-item">
                                <NavLink to="/about" className={({ isActive }) => `header__nav-link ${isActive ? 'header__nav-link--active' : ''}`}>À PROPOS</NavLink>
                            </li>
                        </ul>
                    </nav>

                    {/* Desktop Actions */}
                    <div className="header__actions">
                        <SearchBar />
                        <button className="header__action-btn header__action-btn--icon-only" aria-label="Favorites">
                            <Heart size={20} />
                        </button>
                        <button className="header__action-btn header__action-btn--icon-only" aria-label="Profile">
                            <User size={20} />
                        </button>
                        <Link to="/checkout" className="header__action-btn header__action-btn--cart" aria-label="Cart">
                            <ShoppingCart size={20} />
                            {cartCount > 0 && <span className="header__cart-badge">{cartCount}</span>}
                        </Link>
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
                        <Link to="/checkout" className="header__mobile-action-btn header__mobile-action-btn--cart" aria-label="Panier">
                            <ShoppingCart size={20} />
                            {cartCount > 0 && <span className="header__mobile-action-badge">{cartCount}</span>}
                        </Link>
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
                            Accueil
                        </NavLink>
                        <NavLink to="/catalogue" className={({ isActive }) => `header__mobile-strip-link ${isActive ? 'header__mobile-strip-link--active' : ''}`}>
                            Catalogue
                        </NavLink>
                        <NavLink to="/about" className={({ isActive }) => `header__mobile-strip-link ${isActive ? 'header__mobile-strip-link--active' : ''}`}>
                            À Propos
                        </NavLink>
                    </nav>
                </div>

                {/* Mobile Expandable Search */}
                <div className={`header__mobile-search ${isMobileSearchOpen ? 'header__mobile-search--open' : ''}`}>
                    <div className="header__mobile-search-inner container">
                        <Search size={16} className="header__mobile-search-icon" />
                        <input
                            type="text"
                            className="header__mobile-search-input"
                            placeholder="Rechercher un composant..."
                        />
                        <button
                            className="header__mobile-search-close"
                            onClick={() => setIsMobileSearchOpen(false)}
                            aria-label="Fermer la recherche"
                        >
                            <X size={16} />
                        </button>
                    </div>
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

                {/* Drawer Links */}
                <ul className="header__drawer-list">
                    <li>
                        <NavLink to="/" end className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            Accueil
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/catalogue" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            Catalogue
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/about" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            À Propos
                        </NavLink>
                    </li>

                    <li className="header__drawer-divider" />

                    <li>
                        <NavLink to="/checkout" className={({ isActive }) => `header__drawer-link ${isActive ? 'header__drawer-link--active' : ''}`} onClick={closeMobileMenu}>
                            Panier
                            {cartCount > 0 && <span className="header__drawer-badge">{cartCount}</span>}
                        </NavLink>
                    </li>
                    <li>
                        <button className="header__drawer-link" onClick={closeMobileMenu}>
                            Favoris
                        </button>
                    </li>
                    <li>
                        <button className="header__drawer-link" onClick={closeMobileMenu}>
                            Mon Compte
                        </button>
                    </li>
                </ul>

                {/* Drawer Footer */}
                <div className="header__drawer-footer">
                    <p>© {new Date().getFullYear()} Newoteg SARL</p>
                </div>
            </nav>
        </>
    );
};

export default Header;
