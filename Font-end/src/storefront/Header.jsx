import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  ArrowRight,
  ShoppingCart,
  User,
  Headset,
  Heart,
  Phone,
  ChevronDown,
  Grid2X2,
  Globe,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { Modal, Copy } from "./Elements";
import "./header-commerce.css";
import ReceptionChoice from "./ReceptionChoice";
import HeaderSearch from "./HeaderSearch";
import CatalogueMenu from "./CatalogueMenu";
import { shopContact } from "./shopContact";
import useBrowserReady from "./useBrowserReady";

export default function Header() {
  const ready = useBrowserReady();
  const [menu, setMenu] = useState(null);
  const [drawerCatalogue, setDrawerCatalogue] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const { favoritesCount } = useFavorites();
  const { cartCount } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const { lang, toggleLang } = useI18n();
  const location = useLocation();
  const open = menu?.route === location.key && menu.type === "drawer";
  const mega = menu?.route === location.key && menu.type === "catalogue";
  // Forget the old route's disclosure, including when returning with browser Back.
  if (menu && menu.route !== location.key) setMenu(null);
  const close = () => setMenu(null);
  useEffect(() => {
    const outside = (event) => {
      if (
        root.current?.querySelector(
          '[aria-expanded="true"][data-catalogue-trigger]',
        ) &&
        !root.current.contains(event.target)
      )
        setMenu(null);
    };
    const escape = (event) => {
      if (
        event.key === "Escape" &&
        root.current?.querySelector(
          '[aria-expanded="true"][data-catalogue-trigger]',
        )
      ) {
        setMenu(null);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const links = [
    ["/catalogue", "Tout le catalogue", "All products"],
    ["/catalogue?search=câble", "Câbles & connectique", "Cables & connectors"],
    ["/catalogue?search=alimentation", "Alimentation", "Power supplies"],
    ["/catalogue?search=composant", "Composants", "Components"],
    ["/catalogue?search=outillage", "Outillage", "Tools"],
    ["/catalogue?search=adaptateur", "Vidéo & adaptateurs", "Video & adapters"],
    ["/equivalences", "Équivalences", "Equivalents"],
    ["/guides", "Guides", "Guides"],
    ["/devis", "Devis", "Quotes"],
  ];
  return (
    <>
      <a className="e-skip" href="#main-content">
        <Copy fr="Aller au contenu" en="Skip to content" />
      </a>
      <div className="e-commerce-topline">
        <div className="e-wrap">
          <span>Douala · Akwa</span>
          <Link className="e-top-pro" to="/devis">
            <Copy fr="Pour les pros" en="For professionals" />
          </Link>
          <Link to="/livraison">
            <Copy fr="Livraison & retrait" en="Delivery & pickup" />
          </Link>
          <Link to="/contact">
            <Copy fr="Besoin d’aide ?" en="Need help?" />
          </Link>
          <a className="e-top-phone" href={"tel:" + shopContact.phone}>
            <Phone size={12} aria-hidden="true" />
            {shopContact.phone}
          </a>
        </div>
      </div>
      <header className="e-header" ref={root}>
        <div className="e-wrap e-header-main">
          <button
            className="e-icon e-menu"
            disabled={!ready}
            aria-label={lang === "fr" ? "Ouvrir le menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setMenu({ route: location.key, type: "drawer" })}
          >
            <Menu />
          </button>
          <Link to="/" className="e-brand">
            <img
              src="/logo-header-48.webp"
              srcSet="/logo-header-48.webp 1x, /logo-header-96.webp 2x"
              alt="NEWOTEG"
              width="42"
              height="46"
            />
            <span>
              <b>NEWOTEG</b>
              <strong>X-Electronic</strong>
              <small>
                <Copy
                  fr="La boutique électronique de NEWOTEG"
                  en="The NEWOTEG electronics shop"
                />
              </small>
            </span>
          </Link>
          <HeaderSearch
            key={location.key}
            preserveInitialValue={!ready}
            onInteract={close}
            initial={new URLSearchParams(location.search).get("search") || ""}
          />
          <div className="e-header-actions">
            <Link to="/contact" className="e-advice">
              <Headset />
              <span>
                <Copy fr="Conseil" en="Advice" />
              </span>
            </Link>
            <Link
              to={isAuthenticated ? "/profile" : "/login?returnTo=/profile"}
            >
              <User />
              <span>
                <Copy fr="Mon compte" en="My account" />
              </span>
            </Link>
            <Link
              to="/favourites"
              aria-label={`${lang === "fr" ? "Favoris" : "Favourites"} (${favoritesCount})`}
            >
              <Heart />
              <span>
                <Copy fr="Favoris" en="Favourites" />
              </span>
            </Link>
            <Link
              to="/panier"
              aria-label={`${lang === "fr" ? "Panier" : "Cart"} (${cartCount})`}
            >
              <ShoppingCart />
              <span>
                <Copy fr="Panier" en="Cart" />
              </span>
              {cartCount > 0 && <b className="e-count">{cartCount}</b>}
            </Link>
          </div>
        </div>
        <nav
          className="e-nav"
          aria-label={
            lang === "fr" ? "Catalogue et réception" : "Catalogue and reception"
          }
        >
          <div className="e-wrap">
            <button
              ref={trigger}
              data-catalogue-trigger
              disabled={!ready}
              className="e-catalogue-trigger"
              type="button"
              aria-expanded={mega}
              aria-controls="header-catalogue-panel"
              onClick={() =>
                setMenu(
                  mega ? null : { route: location.key, type: "catalogue" },
                )
              }
            >
              <Grid2X2 size={18} />
              <Copy fr="Tout le catalogue" en="All products" />
              <ChevronDown size={16} />
            </button>
            {links.slice(1).map(([url, fr, en]) => (
              <Link key={url} to={url}>
                <Copy fr={fr} en={en} />
              </Link>
            ))}
            <ReceptionChoice compact />
          </div>
        </nav>
        {mega && (
          <div className="e-mega-position e-wrap">
            <CatalogueMenu onNavigate={close} />
          </div>
        )}
      </header>
      <Modal open={open} onClose={close} title="X-Electronic">
        <nav className="e-drawer-links">
          <button
            type="button"
            aria-expanded={open && drawerCatalogue}
            aria-controls="header-catalogue-panel"
            onClick={() => setDrawerCatalogue((value) => !value)}
          >
            <Grid2X2 size={18} />
            <Copy fr="Explorer les familles" en="Browse categories" />
            <ChevronDown size={16} />
          </button>
          {open && drawerCatalogue && <CatalogueMenu onNavigate={close} />}
          {[
            ["/", "Accueil", "Home"],
            ...links,
            ["/favourites", "Favoris", "Favourites"],
            [
              isAuthenticated ? "/profile" : "/login",
              "Mon compte",
              "My account",
            ],
            ["/about", "À propos", "About"],
            ["/contact", "Contact", "Contact"],
            ["/livraison", "Livraison et retrait", "Delivery and pickup"],
          ].map(([url, fr, en]) => (
            <NavLink key={url} to={url} onClick={close}>
              <Copy fr={fr} en={en} />
              <ArrowRight size={17} />
            </NavLink>
          ))}
          <button onClick={toggleLang}>
            <Globe size={18} />
            {lang === "fr" ? "English" : "Français"}
          </button>
          {isAuthenticated && (
            <button
              onClick={() => {
                logout();
                close();
              }}
            >
              <Copy fr="Se déconnecter" en="Sign out" />
            </button>
          )}
        </nav>
      </Modal>
    </>
  );
}
