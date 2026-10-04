import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { MetadataContext, metadataKey } from "./metadataContext.js";
import { pageMetadata, SITE_ORIGIN } from "./routeMetadata.js";

export default function PageMetadataProvider({ children }) {
  const { pathname, search } = useLocation();
  const { lang } = useI18n();
  const [override, setOverride] = useState(null);
  const register = useCallback((entry) => {
    setOverride(entry);
    return () =>
      setOverride((current) => (current?.id === entry.id ? null : current));
  }, []);
  const context = useMemo(() => ({ register }), [register]);
  const base = pageMetadata(pathname, search, lang);
  // An old page's data must never leak into a different route or language.
  const page =
    override?.key === metadataKey(pathname, search, lang) ? override : {};
  const title = page.title || base.title;
  const description = page.description || base.description;
  const robots = base.private
    ? base.robots
    : page.noindex
      ? "noindex, follow"
      : base.robots;
  const canonical = page.noindex ? null : base.canonical;

  return (
    <MetadataContext.Provider value={context}>
      {/* Native React 19 metadata must have one owner; pages register data only. */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      {base.private && <meta name="referrer" content="no-referrer" />}
      {canonical && <link rel="canonical" href={canonical} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="X-Electronic / NEWOTEG" />
      <meta property="og:locale" content={lang === "en" ? "en_CM" : "fr_CM"} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {!base.private && canonical && (
        <meta property="og:url" content={canonical} />
      )}
      <meta property="og:image" content={`${SITE_ORIGIN}/logo.png`} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {children}
    </MetadataContext.Provider>
  );
}
