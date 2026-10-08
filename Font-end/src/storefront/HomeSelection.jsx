import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Copy, State } from "./Elements";
import useResource from "./useResource";
import apiClient from "../utils/apiClient";
import { adaptProduct } from "./productData";
import { resolveImageUrl } from "../utils/mapProduct";
import { selectionPaths, selectionRows } from "./homeSelectionData";
import HomeProductCard from "./HomeProductCard";
import "./home-selection.css";
export default function HomeSelection() {
  const [filter, setFilter] = useState("");
  const [attempt, setAttempt] = useState(0);
  const categories = useResource("/categories");
  const [state, setState] = useState({ key: "", rows: [], loading: true });
  const filterCategories = filter ? categories.data : null;
  const key = JSON.stringify([filter, attempt, filterCategories]);
  useEffect(() => {
    if (filter && !filterCategories) return;
    const controller = new AbortController();
    Promise.resolve()
      .then(() => selectionPaths(filter, filterCategories))
      .then((paths) => Promise.all(paths.map((path) => apiClient.get(path, { signal: controller.signal }))))
      .then((responses) => { if (!controller.signal.aborted) setState({ key, rows: selectionRows(responses.map((r) => r.data)).map((p) => adaptProduct(p, resolveImageUrl)), loading: false }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ key, rows: [], error, loading: false }); });
    return () => controller.abort();
  }, [key, filter, filterCategories]);
  const current = state.key === key ? state : { rows: [], loading: true };
  return <section className="e-section e-home-selection" aria-labelledby="home-selection-title">
    <div className="e-section-head"><div><h2 id="home-selection-title"><Copy fr="Notre sélection" en="Our selection" /></h2><p><Copy fr="Une sélection de composants et accessoires à découvrir." en="A selection of components and accessories to discover." /></p></div><Link to="/catalogue"><Copy fr="Tout le catalogue" en="All products" /><ArrowRight size={17} /></Link></div>
    <div className="e-home-selection-filters" aria-label="Filtres / Filters">{[["", "Tous", "All"], ["connect", "Connecter", "Connect"], ["power", "Alimenter", "Power"], ["tools", "Mesurer & assembler", "Measure & assemble"], ["repair", "Réparer", "Repair"]].map(([value, fr, en]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}><Copy fr={fr} en={en} /></button>)}</div>
    <State loading={current.loading && !(filter && categories.error)} error={current.error || (filter && categories.error)} retry={() => { setAttempt((a) => a + 1); if (categories.error) categories.retry(); }}>
      {current.rows.length ? <div className="e-home-selection-grid" role="region" aria-label="Sélection produits / Product selection" tabIndex={0}>{current.rows.map((p) => <HomeProductCard key={p.id} product={p} />)}</div> : <p className="e-note"><Copy fr="Aucune référence dans cette sélection. Consultez le catalogue ou demandez conseil." en="No products in this selection. Browse the catalogue or ask for advice." /></p>}
    </State>
  </section>;
}
