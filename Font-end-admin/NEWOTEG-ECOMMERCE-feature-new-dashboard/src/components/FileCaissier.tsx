import { CashierPOSPage } from '../features/cashier-pos/CashierPOSPage';
import { FileCaissier as LegacyCashierPage } from './FileCaissierLegacy';

// Retour arrière opérationnel : définir VITE_RESPONSIVE_POS_V2=false puis redéployer.
export const FileCaissier = import.meta.env.VITE_RESPONSIVE_POS_V2 === 'false'
  ? LegacyCashierPage
  : CashierPOSPage;
