export const normalizeCameroonPhone = (value?: string | null): string | null => {
  if (!value) return null;
  let digits = value.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00237')) digits = digits.slice(5);
  else if (digits.startsWith('237')) digits = digits.slice(3);

  return digits || null;
};
