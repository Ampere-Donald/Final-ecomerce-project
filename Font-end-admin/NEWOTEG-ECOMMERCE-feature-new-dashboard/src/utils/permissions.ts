export const can = {
  accessCaisse: (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || ''),
  accessRoles: (role?: string) => role === 'SUPER_ADMIN',
  accessAccounts: (role?: string) => role === 'SUPER_ADMIN',
  accessNotificationsPage: (role?: string) => role === 'SUPER_ADMIN',
  deleteEntities: (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || ''),
  exportCsv: (role?: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role || ''),
};
