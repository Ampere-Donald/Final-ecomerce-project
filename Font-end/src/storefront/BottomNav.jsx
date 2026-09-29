import { createElement } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Grid2X2, MessageCircle, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { Copy } from "./Elements";
export default function BottomNav() {
  const { pathname } = useLocation();
  const { cartCount } = useCart();
  if (pathname.startsWith("/product/") || pathname === "/checkout") return null;
  return (
    <nav className="e-bottom" aria-label="Navigation mobile">
      {[
        ["/", Home, "Accueil", "Home"],
        ["/catalogue", Grid2X2, "Catalogue", "Catalogue"],
        ["/contact", MessageCircle, "Conseil", "Advice"],
        ["/panier", ShoppingCart, "Panier", "Cart"],
      ].map(([to, Icon, fr, en]) => (
        <NavLink to={to} end key={to}>
          {createElement(Icon, { size: 21 })}
          <span>
            <Copy fr={fr} en={en} />
            {to === "/panier" && cartCount > 0 ? ` (${cartCount})` : ""}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
