import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { AdminLogin } from './components/AdminLogin';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Orders } from './components/Orders';
import { Settings } from './components/Settings';
import { Produits } from './components/Produits';
import { Categories } from './components/Categories';

import { Ventes } from './components/Ventes';
import { Achats } from './components/Achats';
import { Clients } from './components/Clients';
import { CreditsClients } from './components/CreditsClients';
import { Fournisseurs } from './components/Fournisseurs';
import { MouvementsStock } from './components/MouvementsStock';
import { Caisse } from './components/Caisse';
import { Coffres } from './components/Coffres';
import { Echeances } from './components/Echeances';
import { Roles } from './components/Roles';
import { Attributs } from './components/Attributs';
import { AdminAccounts } from './components/AdminAccounts';
import { NotificationsPage } from './components/NotificationsPage';
import { StockAlerts } from './components/StockAlerts';
import { POSVendeur } from './components/POSVendeur';
import { MesTickets } from './components/MesTickets';
import { FileCaissier } from './components/FileCaissier';
import { CaisseJour } from './components/CaisseJour';
import { Analyses } from './components/Analyses';
import { Employes } from './components/Employes';
import { Invoices } from './components/Invoices';
import { Primes } from './components/Primes';
import { ToastProvider } from './components/ui/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/" element={<AdminProtectedRoute><Layout /></AdminProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="analyses" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Analyses /></RoleProtectedRoute>} />
            <Route path="orders" element={<Orders />} />

            {/* Nouveaux écrans connectés au backend */}
            <Route path="produits" element={<Produits />} />
            <Route path="categories" element={<Categories />} />

            <Route path="stock" element={<MouvementsStock />} />
            <Route path="stock-alerts" element={<StockAlerts />} />
            <Route path="ventes" element={<Ventes />} />
            <Route path="achats" element={<Achats />} />
            <Route path="clients" element={<Clients />} />
            <Route path="credits" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CAISSIER']}><CreditsClients /></RoleProtectedRoute>} />
            <Route path="fournisseurs" element={<Fournisseurs />} />
            <Route path="attributs" element={<Attributs />} />

            {/* Routes protégées par rôle */}
            <Route path="caisse" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Caisse /></RoleProtectedRoute>} />
            <Route path="caisse-jour" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CAISSIER']}><CaisseJour /></RoleProtectedRoute>} />
            <Route path="coffres" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Coffres /></RoleProtectedRoute>} />
            <Route path="echeances" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Echeances /></RoleProtectedRoute>} />
            <Route path="roles" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><Roles /></RoleProtectedRoute>} />
            <Route path="comptes" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminAccounts /></RoleProtectedRoute>} />
            <Route path="notifications" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><NotificationsPage /></RoleProtectedRoute>} />

            {/* Workflow vendeur ↔ caissier (Phase 3 L4) */}
            <Route path="pos" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'VENDEUR']}><POSVendeur /></RoleProtectedRoute>} />
            <Route path="mes-tickets" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'VENDEUR']}><MesTickets /></RoleProtectedRoute>} />
            <Route path="file-caissier" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CAISSIER']}><FileCaissier /></RoleProtectedRoute>} />

            {/* Factures + Primes (Plan Implementation) */}
            <Route path="invoices" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CAISSIER']}><Invoices /></RoleProtectedRoute>} />
            <Route path="primes" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Primes /></RoleProtectedRoute>} />

            <Route path="employes" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><Employes /></RoleProtectedRoute>} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        </ToastProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
