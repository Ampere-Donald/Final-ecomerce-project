import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/main.scss";
import App from "./App.jsx";
import "./storefront/storefront.css";
import StorefrontProviders from "./StorefrontProviders.jsx";
import { captureGuestFragment } from "./storefront/guestAccess";
import { readCatalogueBoot } from "./storefront/initialCatalogue";

captureGuestFragment();

async function startStorefront() {
  const root = document.getElementById("root");
  const initialHome = window.location.pathname === '/' && root.dataset.initialHome === 'fr';
  const boot = document.getElementById('initial-catalogue-data');
  const snapshot = root.dataset.initialCatalogue === 'fr' && boot
    ? readCatalogueBoot(boot.textContent, new URL(window.location.href)) : null;
  // Resolve the same home component before hydration so Suspense cannot replace
  // useful HTML with a loading fallback. Other routes keep their lazy loading.
  const Home = initialHome ? (await import('./storefront/Home')).default : undefined;
  const Catalogue = snapshot ? (await import('./storefront/Catalogue')).default : undefined;
  // Keep document metadata until React can take ownership. A delayed home
  // chunk must not leave the already visible public document without its title.
  document.querySelectorAll("[data-newoteg-fallback]").forEach(tag => tag.remove());
  const initial = initialHome || Boolean(snapshot);
  const app = <StorefrontProviders initialLanguage={initial ? 'fr' : undefined} initialAnonymous={initial}>
    <App initialHome={Home} initialCatalogue={Catalogue} snapshot={snapshot} />
  </StorefrontProviders>;
  if (initial) hydrateRoot(root, app, {
    onRecoverableError(error) { console.error('Storefront hydration failed', error); },
  });
  else createRoot(root).render(app);
}
startStorefront().catch(error => console.error('Storefront startup failed', error));
