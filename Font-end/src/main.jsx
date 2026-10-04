import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/main.scss";
import App from "./App.jsx";
import "./storefront/storefront.css";
import { CartProvider } from "./context/CartContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { I18nProvider } from "./context/I18nContext.jsx";
import { captureGuestFragment } from "./storefront/guestAccess";

captureGuestFragment();

// Keep a useful fallback without JavaScript, then hand ownership to React 19.
// Native head hoisting does not replace metadata already present in index.html.
document
  .querySelectorAll("[data-newoteg-fallback]")
  .forEach((tag) => tag.remove());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);
