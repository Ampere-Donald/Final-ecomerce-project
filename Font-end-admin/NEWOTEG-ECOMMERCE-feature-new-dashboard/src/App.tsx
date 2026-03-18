import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { Invoices } from './components/Invoices';
import { Addresses } from './components/Addresses';
import { Settings } from './components/Settings';
import { Support } from './components/Support';
import { Produits } from './components/Produits';
import { Categories } from './components/Categories';
import { Variantes } from './components/Variantes';
import { Ventes } from './components/Ventes';
import { Achats } from './components/Achats';
import { Clients } from './components/Clients';
import { Fournisseurs } from './components/Fournisseurs';
import { MouvementsStock } from './components/MouvementsStock';
import { Caisse } from './components/Caisse';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="addresses" element={<Addresses />} />
          
          {/* Nouveaux écrans connectés au backend */}
          <Route path="produits" element={<Produits />} />
          <Route path="categories" element={<Categories />} />
          <Route path="variantes" element={<Variantes />} />
          <Route path="stock" element={<MouvementsStock />} />
          <Route path="ventes" element={<Ventes />} />
          <Route path="achats" element={<Achats />} />
          <Route path="clients" element={<Clients />} />
          <Route path="fournisseurs" element={<Fournisseurs />} />
          <Route path="caisse" element={<Caisse />} />

          <Route path="settings" element={<Settings />} />
          <Route path="support" element={<Support />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
