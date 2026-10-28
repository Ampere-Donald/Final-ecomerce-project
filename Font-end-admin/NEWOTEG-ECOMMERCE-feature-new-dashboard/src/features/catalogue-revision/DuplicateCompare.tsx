import { useEffect, useRef, useState } from "react";
import { Product, money, revisionApi } from "./api";
export function DuplicateCompare({
  product,
  onReport,
  onClose,
}: {
  product: Product;
  onReport: (other: Product) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!search.trim()) {
        setResults([]);
        return;
      }
      revisionApi
        .list({ search, etat: "TOUS", limit: "12" })
        .then((r) => {
          if (active) {
            setResults(r.data.filter((p) => p.id !== product.id));
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError("Recherche indisponible. Réessayez avec une connexion.");
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, product.id]);
  return (
    <dialog
      ref={ref}
      className="revision-category-dialog"
      aria-labelledby="duplicate-title"
      onCancel={onClose}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 id="duplicate-title" className="font-bold text-lg">
          Comparer un doublon possible
        </h2>
        <button className="revision-button secondary" onClick={onClose}>
          Fermer
        </button>
      </div>
      <div className="revision-panel mb-3">
        {product.imageUrl && (
          <img
            className="h-24 w-24 object-contain"
            src={product.imageUrl}
            alt=""
          />
        )}
        <strong>{product.nomProduit}</strong>
        <p>
          {product.code} · {money(product.prixDetail)}
        </p>
      </div>
      <label className="revision-field">
        <span>Chercher l’autre article par nom ou code</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {results.map((other) => (
        <article className="revision-category-option" key={other.id}>
          {other.imageUrl && (
            <img
              className="h-24 w-24 object-contain mb-2"
              src={other.imageUrl}
              alt=""
            />
          )}
          <strong>{other.nomProduit}</strong>
          <p className="text-sm">
            {other.code} ·{" "}
            {other.referenceFabricant || "Référence fabricant non renseignée"} ·{" "}
            {money(other.prixDetail)}
          </p>
          <button
            className="revision-button secondary mt-2"
            onClick={() => onReport(other)}
          >
            Préparer le signalement
          </button>
        </article>
      ))}
      <p className="text-sm mt-3 text-slate-600">
        Comparez les références exactes. Le signalement ouvre une discussion ;
        aucune fusion ni suppression n’est effectuée.
      </p>
    </dialog>
  );
}
