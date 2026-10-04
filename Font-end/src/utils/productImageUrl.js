// An API mounted at /api must keep media on the storefront's own proxy origin.
// Remove only the terminal API path, never the hostname's "api" subdomain.
export function productMediaBase(apiUrl) {
  return (apiUrl || "http://localhost:3000/api")
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");
}

export function productImageUrl(raw, base) {
  if (typeof raw !== "string" || !raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(raw)) return null;
  return `${base}${raw.startsWith("/") ? "" : "/"}${raw}`;
}
