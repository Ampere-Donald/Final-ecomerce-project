import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/main.scss";
import App from "./App.jsx";
import "./storefront/storefront.css";
import StorefrontProviders from "./StorefrontProviders.jsx";
import { captureGuestFragment } from "./storefront/guestAccess";

captureGuestFragment();

async function startStorefront() {
  const root = document.getElementById("root");
  const initialHome = window.location.pathname === '/' && root.dataset.initialHome === 'fr';
  // Resolve the same home component before hydration so Suspense cannot replace
  // useful HTML with a loading fallback. Other routes keep their lazy loading.
  const Home = initialHome ? (await import('./storefront/Home')).default : undefined;
  // Keep document metadata until React can take ownership. A delayed home
  // chunk must not leave the already visible public document without its title.
  document.querySelectorAll("[data-newoteg-fallback]").forEach(tag => tag.remove());
  const app = <StorefrontProviders initialLanguage={initialHome ? 'fr' : undefined} initialAnonymous={initialHome}>
    <App initialHome={Home} />
  </StorefrontProviders>;
  if (initialHome) hydrateRoot(root, app, {
    onRecoverableError(error) { console.error('Storefront hydration failed', error); },
  });
  else createRoot(root).render(app);
}
startStorefront().catch(error => console.error('Storefront startup failed', error));
