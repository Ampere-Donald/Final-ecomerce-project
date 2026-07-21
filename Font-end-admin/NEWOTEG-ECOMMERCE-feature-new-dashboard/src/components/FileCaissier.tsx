import { CashierPOSPage } from '../features/cashier-pos/CashierPOSPage';

// Le parcours responsive validé est désormais l’unique interface de caisse.
// Garder une bascule de build vers l’ancien écran rendait la production imprévisible.
export const FileCaissier = CashierPOSPage;
