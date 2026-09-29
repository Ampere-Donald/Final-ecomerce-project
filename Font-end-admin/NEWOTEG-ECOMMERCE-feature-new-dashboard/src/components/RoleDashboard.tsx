import { useAdminAuth } from '../context/AdminAuthContext';
import { isAdministrationRole } from '../config/adminNavigation';
import { AdministrationDashboard } from './AdministrationDashboard';
import { Dashboard } from './Dashboard';

export const RoleDashboard = () => {
  const { admin } = useAdminAuth();
  return isAdministrationRole(admin?.role) ? <AdministrationDashboard /> : <Dashboard />;
};
