import Header from './Header';
import Toast from '../components/Toast/Toast';
import BottomNav from './BottomNav';

// The same DOM shell is rendered by the catalogue server and the React app.
export default function StorefrontFrame({ path, initial = false, children }) {
  return <div className="app">
    {import.meta.env.VITE_SANDBOX === 'true' && <div role="note" style={{ background: '#fff1c9', color: '#503b0b', padding: '8px 16px', textAlign: 'center', fontSize: 13 }}>
      Environnement de test · Prix et stocks de démonstration · Aucune commande boutique
    </div>}
    <Header />
    <main className="app__content" id="main-content" tabIndex={-1}>
      <div key={path} className={initial ? 'page-enter initial-home' : 'page-enter'}>{children}</div>
    </main>
    <Toast />
    <BottomNav />
  </div>;
}
