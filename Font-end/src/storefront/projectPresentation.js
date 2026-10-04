import { resolveImageUrl } from "../utils/mapProduct";
import { projectLink } from "./projectData";

export const levels = {
  DEBUTANT: ["Débutant", "Beginner"],
  INTERMEDIAIRE: ["Intermédiaire", "Intermediate"],
  AVANCE: ["Avancé", "Advanced"],
};
export const titleOf = (p, lang) => (lang === "en" && p.titreEn ? p.titreEn : p.titre);
export const summaryOf = (p, lang) =>
  lang === "en" && p.resumeEn ? p.resumeEn : p.resume;
export const materialImage = (raw) => {
  const safe = projectLink(raw, true);
  return safe?.startsWith("/design-e/") || safe?.startsWith("/images/")
    ? safe
    : safe
      ? resolveImageUrl(safe)
      : "";
};
