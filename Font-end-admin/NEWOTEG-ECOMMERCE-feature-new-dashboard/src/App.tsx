import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { AdminLogin } from './components/AdminLogin';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui/Toast';
import { FVAlertPopup } from './components/FVAlertPopup';

const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const Orders = lazy(() => import('./components/Orders').then((m) => ({ default: m.Orders })));
const Settings = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })));
const Produits = lazy(() => import('./components/Produits').then((m) => ({ default: m.Produits })));
const Categories = lazy(() => import('./components/Categories').then((m) => ({ default: m.Categories })));
const Ventes = lazy(() => import('./components/Ventes').then((m) => ({ default: m.Ventes })));
const Achats = lazy(() => import('./components/Achats').then((m) => ({ default: m.Achats })));
const Clients = lazy(() => import('./components/Clients').then((m) => ({ default: m.Clients })));
const CreditsClients = lazy(() => import('./components/CreditsClients').then((m) => ({ default: m.CreditsClients })));
const Fournisseurs = lazy(() => import('./components/Fournisseurs').then((m) => ({ default: m.Fournisseurs })));
const MouvementsStock = lazy(() => import('./components/MouvementsStock').then((m) => ({ default: m.MouvementsStock })));
const Inventaire = lazy(() => import('./components/Inventaire').then((m) => ({ default: m.Inventaire })));
const CommandeFournisseur = lazy(() => import('./components/CommandeFournisseur').then((m) => ({ default: m.CommandeFournisseur })));
const Caisse = lazy(() => import('./components/Caisse').then((m) => ({ default: m.Caisse })));
const Coffres = lazy(() => import('./components/Coffres').then((m) => ({ default: m.Coffres })));
const Echeances = lazy(() => import('./components/Echeances').then((m) => ({ default: m.Echeances })));
const Roles = lazy(() => import('./components/Roles').then((m) => ({ default: m.Roles })));
const Attributs = lazy(() => import('./components/Attributs').then((m) => ({ default: m.Attributs })));
const AdminAccounts = lazy(() => import('./components/AdminAccounts').then((m) => ({ default: m.AdminAccounts })));
const NotificationsPage = lazy(() => import('./components/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const StockAlerts = lazy(() => import('./components/StockAlerts').then((m) => ({ default: m.StockAlerts })));
const POSVendeur = lazy(() => import('./components/POSVendeur').then((m) => ({ default: m.POSVendeur })));
const MesTickets = lazy(() => import('./components/MesTickets').then((m) => ({ default: m.MesTickets })));
const FileCaissier = lazy(() => import('./components/FileCaissier').then((m) => ({ default: m.FileCaissier })));
const CaisseJour = lazy(() => import('./components/CaisseJour').then((m) => ({ default: m.CaisseJour })));
const Analyses = lazy(() => import('./components/Analyses').then((m) => ({ default: m.Analyses })));
const Employes = lazy(() => import('./components/Employes').then((m) => ({ default: m.Employes })));
const CmupValorisation = lazy(() => import('./components/CmupValorisation').then((m) => ({ default: m.CmupValorisation })));
const Invoices = lazy(() => import('./components/Invoices').then((m) => ({ default: m.Invoices })));
const Primes = lazy(() => import('./components/Primes').then((m) => ({ default: m.Primes })));
const Paie = lazy(() => import('./components/Paie').then((m) => ({ default: m.Paie })));
const Proformas = lazy(() => import('./components/Proformas').then((m) => ({ default: m.Proformas })));
const UserGuide = lazy(() => import('./components/UserGuide').then((m) => ({ default: m.UserGuide })));
const OfflineQueuePage = lazy(() => import('./components/OfflineQueuePage').then((m) => ({ default: m.OfflineQueuePage })));

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm font-semibold text-slate-500">
    Chargement de l’écran…
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <ToastProvider>
        <Suspense fallback={<RouteFallback />}>
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
            <Route path="inventaire" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Inventaire /></RoleProtectedRoute>} />
            <Route path="stock-alerts" element={<StockAlerts />} />
            <Route path="ventes" element={<Ventes />} />
            <Route path="achats" element={<Achats />} />
            <Route path="commandes-fournisseur" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><CommandeFournisseur /></RoleProtectedRoute>} />
            <Route path="cmup" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><CmupValorisation /></RoleProtectedRoute>} />
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
            <Route path="proformas" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'VENDEUR', 'CAISSIER']}><Proformas /></RoleProtectedRoute>} />

            {/* Factures + Primes (Plan Implementation) */}
            <Route path="invoices" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR']}><Invoices /></RoleProtectedRoute>} />
            <Route path="primes" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Primes /></RoleProtectedRoute>} />
            <Route path="paie" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}><Paie /></RoleProtectedRoute>} />

            <Route path="employes" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN']}><Employes /></RoleProtectedRoute>} />
            <Route path="guide" element={<UserGuide />} />
            <Route path="offline-queue" element={<RoleProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CAISSIER', 'VENDEUR']}><OfflineQueuePage /></RoleProtectedRoute>} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        </Suspense>
        <FVAlertPopup />
        </ToastProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
