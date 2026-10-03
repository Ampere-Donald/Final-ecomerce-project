import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./styles/main.scss";
import App from "./App.jsx";
import "./storefront/storefront.css";
import { CartProvider } from "./context/CartContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { I18nProvider } from "./context/I18nContext.jsx";
import { captureGuestFragment } from "./storefront/guestAccess";

captureGuestFragment();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HelmetProvider>
      <I18nProvider>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <App />
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </I18nProvider>
    </HelmetProvider>
  </StrictMode>,
);
