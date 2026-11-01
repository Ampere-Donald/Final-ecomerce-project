import { useContext, useEffect, useId } from "react";
import { useLocation } from "./LocaleRouter";
import { useI18n } from "../context/I18nContext";
import { MetadataContext, metadataKey } from "./metadataContext.js";

export default function PageMeta({ title, description, noindex = false, translated }) {
  const { register } = useContext(MetadataContext);
  const { pathname, search } = useLocation();
  const { lang } = useI18n();
  const id = useId();
  const key = metadataKey(pathname, search, lang);
  useEffect(() => {
    if (!title && !description && !noindex) return;
    return register({ id, key, title, description, noindex, translated });
  }, [register, id, key, title, description, noindex, translated]);
  return null;
}
