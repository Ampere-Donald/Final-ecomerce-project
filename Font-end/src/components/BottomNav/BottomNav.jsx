import { createElement, useRef, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import './BottomNav.scss';

const BottomNav = () => {
  const { cartCount } = useCart();
  const { favoritesCount } = useFavorites();
  const { token } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      // Show when scrolling up or near top, hide when scrolling down
      if (currentY < 50) {
        setVisible(true);
      } else if (currentY < lastScrollY.current) {
        setVisible(true);
      } else if (currentY > lastScrollY.current + 10) {
        setVisible(false);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide on auth pages
  if (['/login', '/signup'].includes(location.pathname)) return null;

  const tabs = [
    { to: '/',           icon: Home,         label: t('nav.home') },
    { to: '/catalogue',  icon: LayoutGrid,   label: t('nav.catalogue') },
    { to: '/checkout',   icon: ShoppingCart,  label: t('drawer.cart'),   badge: cartCount },
    { to: '/favourites', icon: Heart,         label: t('drawer.favorites'), badge: favoritesCount, auth: true },
    { to: '/profile',    icon: User,          label: t('drawer.profile'),   auth: true },
  ];

  return (
    <nav className={`bottom-nav ${visible ? '' : 'bottom-nav--hidden'}`} aria-label="Mobile navigation">
      {tabs.map(({ to, icon, label, badge, auth }) => {
        const href = auth && !token ? '/login' : to;
        return (
          <NavLink
            key={to}
            to={href}
            className={({ isActive }) =>
              `bottom-nav__tab ${isActive && href === to ? 'bottom-nav__tab--active' : ''}`
            }
          >
            <span className="bottom-nav__icon-wrap">
              {createElement(icon, { size: 22, strokeWidth: 1.8 })}
              {badge > 0 && <span className="bottom-nav__badge">{badge > 99 ? '99+' : badge}</span>}
            </span>
            <span className="bottom-nav__label">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomNav;
