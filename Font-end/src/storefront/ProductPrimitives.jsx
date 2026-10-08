import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useI18n } from "../context/I18nContext";
import { formatFCFA } from "../utils/formatFCFA";
import { cardImage } from "./cardImage";

export function Copy({ fr, en }) {
  const { lang } = useI18n();
  return lang === "en" ? en : fr;
}
export function Photo({ product, eager = false, thumbnail = false, sizes }) {
  const [failed, setFailed] = useState("");
  const [original, setOriginal] = useState("");
  const responsive = thumbnail && original !== product.image ? cardImage(product.image) : null;
  return product.image && failed !== product.image ? (
    <img
      src={responsive?.src || product.image}
      srcSet={responsive?.srcSet}
      sizes={responsive ? sizes || responsive.sizes : undefined}
      alt={product.model}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      width="400"
      height="400"
      onError={() => responsive ? setOriginal(product.image) : setFailed(product.image)}
    />
  ) : (
    <div className="e-placeholder">
      <ImageOff aria-hidden="true" />
      <span>
        <Copy fr="Visuel en préparation" en="Image coming soon" />
      </span>
    </div>
  );
}
export function Price({ value }) {
  return (
    <span className="e-price">
      {value > 0 ? (
        formatFCFA(value)
      ) : (
        <Copy fr="Prix à confirmer" en="Price to confirm" />
      )}
    </span>
  );
}
