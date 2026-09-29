import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  ArrowRight,
  ShoppingCart,
  User,
  MessageCircle,
  Grid2X2,
  MapPin,
  Globe,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import { Modal, Copy } from "./Elements";

function SearchForm({ initial }) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();
  const { lang } = useI18n();
  return (
    <form
      className="e-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(
          `/catalogue${value.trim() ? "?search=" + encodeURIComponent(value.trim()) : ""}`,
        );
      }}
    >
      <Search aria-hidden="true" size={21} />
      <label className="e-sr" htmlFor="e-search">
        {lang === "fr"
          ? "Rechercher un produit ou une référence"
          : "Search products or references"}
      </label>
      <input
        id="e-search"
        name="search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          lang === "fr"
            ? "Un produit, une référence, un besoin…"
            : "A product, a reference, a project…"
        }
      />
      <button aria-label={lang === "fr" ? "Rechercher" : "Search"}>
        <span>
          <Copy fr="Rechercher" en="Search" />
        </span>
        <ArrowRight size={20} />
      </button>
    </form>
  );
}
export default function Header() {
  const [open, setOpen] = useState(false);
  const { cartCount } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const { lang, toggleLang } = useI18n();
  const location = useLocation();
  const links = [
    ["/catalogue", "Tout le catalogue", "All products"],
    ["/catalogue?search=câble", "Câbles & connectique", "Cables & connectors"],
    ["/catalogue?search=chargeur", "Alimentation", "Power supplies"],
    ["/catalogue?search=composant", "Composants", "Components"],
    ["/catalogue?search=outillage", "Outillage", "Tools"],
    ["/equivalences", "Équivalences", "Equivalents"],
    ["/guides", "Guides", "Guides"],
  ];
  return (
    <>
      <a className="e-skip" href="#main-content">
        <Copy fr="Aller au contenu" en="Skip to content" />
      </a>
      <header className="e-header">
        <div className="e-wrap e-header-main">
          <button
            className="e-icon e-menu"
            aria-label={lang === "fr" ? "Ouvrir le menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <Link to="/" className="e-brand">
            <img src="/logo.png" alt="NEWOTEG" width="42" height="46" />
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
          <SearchForm
            key={location.search}
            initial={new URLSearchParams(location.search).get("search") || ""}
          />
          <div className="e-header-actions">
            <Link to="/contact" className="e-advice">
              <MessageCircle />
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
            lang === "fr" ? "Familles de produits" : "Product families"
          }
        >
          <div className="e-wrap">
            {links.map(([url, fr, en], i) => (
              <Link key={url} to={url}>
                {i === 0 && <Grid2X2 size={18} />}
                <Copy fr={fr} en={en} />
              </Link>
            ))}
            <span>
              <MapPin size={18} />
              Akwa, Douala
            </span>
          </div>
        </nav>
      </header>
      <Modal open={open} onClose={() => setOpen(false)} title="X-Electronic">
        <nav className="e-drawer-links">
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
            <NavLink key={url} to={url} onClick={() => setOpen(false)}>
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
                setOpen(false);
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
