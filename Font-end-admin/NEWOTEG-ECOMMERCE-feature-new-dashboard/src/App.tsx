import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { Invoices } from './components/Invoices';
import { Addresses } from './components/Addresses';
import { Settings } from './components/Settings';
import { Support } from './components/Support';
import { Produits } from './components/Produits';
import { Categories } from './components/Categories';

import { Ventes } from './components/Ventes';
import { Achats } from './components/Achats';
import { Clients } from './components/Clients';
import { Fournisseurs } from './components/Fournisseurs';
import { MouvementsStock } from './components/MouvementsStock';
import { Caisse } from './components/Caisse';
import { Roles } from './components/Roles';
import { Attributs } from './components/Attributs';

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/" element={<AdminProtectedRoute><Layout /></AdminProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="addresses" element={<Addresses />} />

            {/* Nouveaux écrans connectés au backend */}
            <Route path="produits" element={<Produits />} />
            <Route path="categories" element={<Categories />} />

            <Route path="stock" element={<MouvementsStock />} />
            <Route path="ventes" element={<Ventes />} />
            <Route path="achats" element={<Achats />} />
            <Route path="clients" element={<Clients />} />
            <Route path="fournisseurs" element={<Fournisseurs />} />
            <Route path="caisse" element={<Caisse />} />
            <Route path="roles" element={<Roles />} />
            <Route path="attributs" element={<Attributs />} />

            <Route path="settings" element={<Settings />} />
            <Route path="support" element={<Support />} />
          </Route>
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
