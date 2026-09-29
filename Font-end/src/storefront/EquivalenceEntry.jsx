import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { Copy } from "./Elements";
export default function EquivalenceEntry({ query = "", productId = "" }) {
  const params = new URLSearchParams();
  if (query) params.set("query", query.slice(0, 255));
  if (productId) params.set("produitId", productId);
  return (
    <aside className="e-equivalence-entry">
      <ArrowLeftRight size={26} aria-hidden="true" />
      <div>
        <h2>
          <Copy
            fr="Vous cherchez une pièce de remplacement ?"
            en="Looking for a replacement part?"
          />
        </h2>
        <p>
          <Copy
            fr="Recherchez un équivalent parmi nos composants en stock, même sans la référence exacte au catalogue."
            en="Find an equivalent among our stocked components, even if your exact reference is not listed."
          />
        </p>
      </div>
      <Link
        className="e-btn e-secondary"
        to={"/equivalences" + (params.toString() ? "?" + params : "")}
      >
        <Copy fr="Trouver un équivalent" en="Find an equivalent" />
        <ArrowRight size={18} />
      </Link>
    </aside>
  );
}
