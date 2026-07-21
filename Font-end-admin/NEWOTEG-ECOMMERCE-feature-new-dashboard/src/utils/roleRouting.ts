export type RoleHomePath = '/' | '/file-caissier' | '/pos';

/**
 * Returns the first operational screen a user should see after authentication.
 * Unknown and management roles deliberately fall back to the admin dashboard.
 */
export const getRoleHomePath = (role?: string | null): RoleHomePath => {
  switch (role?.trim().toUpperCase()) {
    case 'CAISSIER':
      return '/file-caissier';
    case 'VENDEUR':
      return '/pos';
    default:
      return '/';
  }
};
