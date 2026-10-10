import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import StorefrontFrame from "./storefront/StorefrontFrame";
import InitialResources from "./storefront/InitialResources";
import { startJourney, leaveCheckout } from "./storefront/journey.js";
import PageMetadataProvider from "./storefront/PageMetadataProvider";

const Home = lazy(() => import("./storefront/Home"));
const Catalogue = lazy(() => import("./storefront/Catalogue"));
const Comparison = lazy(() => import("./storefront/Comparison"));
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
const Projects = lazy(() => import("./storefront/Projects"));
const Commercial = lazy(() => import("./storefront/Commercial"));
const GuestTracking = lazy(() => import("./storefront/GuestTracking"));
const DevisPrint = lazy(() => import("./storefront/DevisPrint"));
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

function AppContent({ initialHome, initialCatalogue }) {
  const HomeRoute = initialHome || Home;
  const CatalogueRoute = initialCatalogue || Catalogue;
  const location = useLocation();
  useEffect(() => {
    startJourney();
    if (location.pathname !== "/checkout") leaveCheckout();
  }, [location.pathname]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <StorefrontFrame path={location.pathname} initial={Boolean((initialHome && location.pathname === '/') || (initialCatalogue && location.pathname === '/catalogue'))}>
      <Suspense fallback={<PageFallback />}>
        <Routes location={location}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/catalogue" element={<CatalogueRoute />} />
          <Route path="/comparer" element={<Comparison />} />
          <Route path="/projets" element={<Projects />} />
          <Route path="/offres" element={<Commercial />} />
          <Route path="/arrivages" element={<Commercial />} />
          <Route path="/projets/:slug" element={<Projects />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/panier" element={<Cart />} />
          <Route path="/equivalences" element={<Equivalences />} />
          <Route path="/guides" element={<Editorial />} />
          <Route path="/faq" element={<Editorial />} />
          <Route path="/livraison" element={<Editorial />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/suivi-invite" element={<GuestTracking />} />
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
          <Route
            path="/mes-devis/:id/imprimer"
            element={
              <ProtectedRoute>
                <DevisPrint />
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
    </StorefrontFrame>
  );
}

function App({ initialHome, initialCatalogue, snapshot, router }) {
  const RouterComponent = router || Router;
  return (
    <RouterComponent>
      <InitialResources snapshot={snapshot}><PageMetadataProvider><AppContent initialHome={initialHome} initialCatalogue={initialCatalogue} /></PageMetadataProvider></InitialResources>
    </RouterComponent>
  );
}

export default App;
