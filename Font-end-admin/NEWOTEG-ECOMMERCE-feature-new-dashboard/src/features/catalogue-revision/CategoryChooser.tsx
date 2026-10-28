import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { Category, Progress } from "./api";
const empty: Progress = {
  total: 0,
  remaining: 0,
  pending: 0,
  discussion: 0,
  complete: 0,
};
export function CategoryChooser({
  categories,
  progress,
  onChoose,
  onClose,
}: {
  categories: Category[];
  progress: Record<string, Progress>;
  onChoose: (category: string, subcategory: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const stats = (key: string) => {
    const p = progress[key] || empty;
    return (
      <span className="block text-xs leading-5 text-slate-600">
        {p.total} articles · {p.remaining} à contrôler · {p.pending} en attente
        · {p.discussion} à discuter · {p.complete} terminés
      </span>
    );
  };
  return (
    <dialog
      ref={dialog}
      className="revision-category-dialog"
      onCancel={onClose}
      aria-labelledby="category-choice-title"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 id="category-choice-title" className="font-bold text-lg">
          {category ? category.nom : "Choisir une catégorie"}
        </h2>
        <button
          className="revision-button secondary"
          onClick={onClose}
          aria-label="Fermer les catégories"
        >
          <X size={18} />
        </button>
      </div>
      {category ? (
        <>
          <button
            className="revision-button secondary mb-3"
            onClick={() => setCategory(null)}
          >
            <ArrowLeft size={16} /> Toutes les catégories
          </button>
          <button
            className="revision-category-option"
            onClick={() => onChoose(category.id, "")}
          >
            <strong>Toute cette catégorie</strong>
            {stats(`categorie:${category.id}`)}
          </button>
          {category.sousCategories.map((sub) => (
            <button
              key={sub.id}
              className="revision-category-option"
              onClick={() => onChoose(category.id, sub.id)}
            >
              <strong>{sub.nom}</strong>
              {stats(`sous:${sub.id}:${category.id}`)}
            </button>
          ))}
          <button
            className="revision-category-option"
            onClick={() => onChoose(category.id, "sans")}
          >
            <strong>Sans sous-catégorie</strong>
            {stats(`sous:sans:${category.id}`)}
          </button>
        </>
      ) : (
        <>
          <label className="revision-field mb-3">
            <span className="flex items-center gap-2">
              <Search size={16} /> Rechercher une catégorie
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            className="revision-category-option"
            onClick={() => onChoose("", "")}
          >
            <strong>Tout le catalogue publié</strong>
            {stats("total")}
          </button>
          {categories
            .filter((c) =>
              c.nom
                .toLocaleLowerCase("fr")
                .includes(search.toLocaleLowerCase("fr")),
            )
            .map((c) => (
              <button
                key={c.id}
                className="revision-category-option"
                onClick={() => setCategory(c)}
              >
                <span className="flex justify-between gap-2">
                  <strong>{c.nom}</strong>
                  <ChevronRight size={18} />
                </span>
                {stats(`categorie:${c.id}`)}
              </button>
            ))}
        </>
      )}
    </dialog>
  );
}
