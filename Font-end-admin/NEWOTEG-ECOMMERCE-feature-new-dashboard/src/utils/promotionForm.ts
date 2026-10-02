export function localPromotionDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function promotionDatePayload(input: string, original?: string) {
  if (!input) return '';
  // Retain the exact original instant (including seconds) for an unchanged field.
  if (original && input === localPromotionDate(original)) return new Date(original).toISOString();
  const date = new Date(input);
  if (!Number.isFinite(date.getTime())) throw Error('Date de fin de promotion invalide.');
  return date.toISOString();
}
