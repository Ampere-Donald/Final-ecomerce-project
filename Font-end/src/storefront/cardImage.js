// Only unsigned, versioned catalogue uploads owned by the shop are transformed.
// Other hosts, existing transformations and detail-page images stay unchanged.
export function cardImage(image) {
  if (typeof image !== "string") return null;
  const match = image.match(/^https:\/\/res\.cloudinary\.com\/dm4ij9sxg\/image\/upload\/(v[0-9]+\/produits\/[^?#]+)$/);
  if (!match) return null;
  const at = (width) => `https://res.cloudinary.com/dm4ij9sxg/image/upload/c_limit,w_${width},h_${width}/q_auto/f_auto/${match[1]}`;
  return {
    src: at(400),
    srcSet: [240, 400, 640].map((width) => `${at(width)} ${width}w`).join(", "),
    sizes: "(max-width: 760px) 45vw, 300px",
  };
}
