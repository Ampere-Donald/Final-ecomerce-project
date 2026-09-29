import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Header from "./storefront/Header";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Toast from "./components/Toast/Toast";
import BottomNav from "./storefront/BottomNav";

const Home = lazy(() => import("./storefront/Home"));
const Catalogue = lazy(() => import("./storefront/Catalogue"));
const ProductDetails = lazy(() => import("./storefront/Product"));
const Cart = lazy(() => import("./storefront/Cart"));
const Equivalences = lazy(() => import("./storefront/Equivalences"));
const Editorial = lazy(() => import("./storefront/Editorial"));
const Checkout = lazy(() => import("./storefront/Checkout"));
const About = lazy(() => import("./storefront/ShopInfo"));
const Contact = lazy(() => import("./storefront/ShopInfo"));
const Terms = lazy(() => import("./storefront/ShopInfo"));
const Privacy = lazy(() => import("./storefront/ShopInfo"));
const Login = lazy(() => import("./storefront/Auth"));
const Signup = lazy(() => import("./storefront/Auth"));
const Profile = lazy(() => import("./storefront/Account"));
const Favorites = lazy(() => import("./storefront/Favorites"));
const Devis = lazy(() => import("./storefront/Devis"));
const NotFound = lazy(() => import("./storefront/ShopInfo"));

const PageFallback = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      minHeight: "45vh",
      display: "grid",
      placeItems: "center",
      color: "#64748b",
      fontWeight: 600,
    }}
  >
    Chargement…
  </div>
);

function AppContent() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      {import.meta.env.VITE_SANDBOX === "true" && (
        <div
          role="note"
          style={{
            background: "#fff1c9",
            color: "#503b0b",
            padding: "8px 16px",
            textAlign: "center",
            fontSize: 13,
          }}
        >
          Environnement de test · Prix et stocks de démonstration · Aucune
          commande boutique
        </div>
      )}
      <Header />
      <main className="app__content" id="main-content" tabIndex={-1}>
        <div key={location.pathname} className="page-enter">
          <Suspense fallback={<PageFallback />}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/panier" element={<Cart />} />
              <Route path="/equivalences" element={<Equivalences />} />
              <Route path="/guides" element={<Editorial />} />
              <Route path="/faq" element={<Editorial />} />
              <Route path="/livraison" element={<Editorial />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/devis" element={<Devis />} />
              <Route
                path="/mes-devis"
                element={
                  <ProtectedRoute>
                    <Devis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mes-devis/:id"
                element={
                  <ProtectedRoute>
                    <Devis />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<Login />} />
              <Route
                path="/commandes"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/commandes/:id"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Protected */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favourites"
                element={
                  <ProtectedRoute>
                    <Favorites />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <Toast />
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
