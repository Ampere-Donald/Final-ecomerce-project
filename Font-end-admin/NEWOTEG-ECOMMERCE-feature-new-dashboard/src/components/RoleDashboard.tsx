import { useAdminAuth } from '../context/AdminAuthContext';
import { AdministrationDashboard } from './AdministrationDashboard';
import { Dashboard } from './Dashboard';
import { CatalogueTeamHome } from './CatalogueTeamHome';

export const RoleDashboard = () => {
  const { admin } = useAdminAuth();
  if (admin?.role === 'MANAGER') return <CatalogueTeamHome />;
  return admin?.role === 'SUPER_ADMIN' ? <AdministrationDashboard /> : <Dashboard />;
};
