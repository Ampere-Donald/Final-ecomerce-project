import { createContext } from "react";

export const MetadataContext = createContext(null);
export const metadataKey = (pathname, search, lang) =>
  JSON.stringify([pathname, search, lang]);
