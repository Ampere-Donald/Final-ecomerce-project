import { useAdminAuth } from '../context/AdminAuthContext';
import { AdministrationDashboard } from './AdministrationDashboard';
import { Dashboard } from './Dashboard';

export const RoleDashboard = () => {
  const { admin } = useAdminAuth();
  return admin?.role === 'SUPER_ADMIN' ? <AdministrationDashboard /> : <Dashboard />;
};
