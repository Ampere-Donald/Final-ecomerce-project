import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/main.scss";
import App from "./App.jsx";
import "./storefront/storefront.css";
import StorefrontProviders from "./StorefrontProviders.jsx";
import "./storefront/refinement.css";
import './storefront/motion.css';
import { captureGuestFragment } from "./storefront/guestAccess";
import { readCatalogueBoot } from "./storefront/initialCatalogue";
import { readProductBoot } from './storefront/initialProduct';
import { isEditorialDocument } from './storefront/editorialRoutes.js';

captureGuestFragment();

async function startStorefront() {
  const root = document.getElementById("root");
  const initialHome = window.location.pathname === '/' && root.dataset.initialHome === 'fr';
  const initialEditorial = root.dataset.initialEditorial === 'fr' && isEditorialDocument(window.location.pathname);
  const boot = document.getElementById('initial-catalogue-data');
  const catalogue = root.dataset.initialCatalogue === 'fr' && boot
    ? readCatalogueBoot(boot.textContent, new URL(window.location.href)) : null;
  const productBoot = document.getElementById('initial-product-data');
  const product = root.dataset.initialProduct === 'fr' && productBoot
    ? readProductBoot(productBoot.textContent, new URL(window.location.href)) : null;
  const snapshot = product || catalogue;
  // Resolve the same home component before hydration so Suspense cannot replace
  // useful HTML with a loading fallback. Other routes keep their lazy loading.
  const Home = initialHome ? (await import('./storefront/Home')).default : undefined;
  const Catalogue = catalogue ? (await import('./storefront/Catalogue')).default : undefined;
  const Product = product ? (await import('./storefront/Product')).default : undefined;
  const Editorial = initialEditorial ? (await import('./storefront/TechnicalLibrary')).default : undefined;
  // Keep document metadata until React can take ownership. A delayed home
  // chunk must not leave the already visible public document without its title.
  document.querySelectorAll("[data-newoteg-fallback]").forEach(tag => tag.remove());
  const initial = initialHome || initialEditorial || Boolean(snapshot);
  const app = <StorefrontProviders initialLanguage={initial ? 'fr' : undefined} initialAnonymous={initial}>
    <App initialHome={Home} initialCatalogue={Catalogue} initialProduct={Product} initialEditorial={Editorial} snapshot={snapshot} />
  </StorefrontProviders>;
  if (initial) hydrateRoot(root, app, {
    onRecoverableError(error, info) { console.error('Storefront hydration failed', error, info.componentStack); },
  });
  else createRoot(root).render(app);
}
startStorefront().catch(error => console.error('Storefront startup failed', error));
