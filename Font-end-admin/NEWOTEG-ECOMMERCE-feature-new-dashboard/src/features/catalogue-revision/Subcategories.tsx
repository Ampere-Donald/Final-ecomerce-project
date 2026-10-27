import { useState } from "react";
import { Category, revisionApi } from "./api";
import { getApiErrorMessage } from "../../services/api";

export function Subcategories({
  categories,
  reload,
}: {
  categories: Category[];
  reload: () => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [id, setId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const subs =
    categories.find((c) => c.id === categoryId)?.sousCategories || [];
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await revisionApi.saveSub(id, { categorieId: categoryId, nom });
      await reload();
      setNom("");
      setId(null);
      setMessage("Sous-catégorie enregistrée.");
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Enregistrement impossible."));
    } finally {
      setBusy(false);
    }
  }
  async function remove(subId: string) {
    setBusy(true);
    setMessage("");
    try {
      await revisionApi.deleteSub(subId);
      await reload();
      setDeleting(null);
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Suppression impossible."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="revision-panel">
      <summary className="cursor-pointer min-h-11 flex items-center font-bold">
        Gérer les sous-catégories
      </summary>
      <div className="mt-4 space-y-4">
        <label className="revision-field">
          <span>Catégorie parente</span>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setId(null);
              setNom("");
            }}
          >
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </label>
        <form onSubmit={save} className="flex flex-wrap items-end gap-2">
          <label className="revision-field flex-1">
            <span>
              {id ? "Renommer la sous-catégorie" : "Nouvelle sous-catégorie"}
            </span>
            <input
              required
              maxLength={100}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
          </label>
          <button
            className="revision-button primary"
            disabled={busy || !categoryId}
          >
            Enregistrer
          </button>
          {id && (
            <button
              type="button"
              className="revision-button secondary"
              onClick={() => {
                setId(null);
                setNom("");
              }}
            >
              Annuler
            </button>
          )}
        </form>
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <ul className="space-y-2">
          {subs.map((sub) => (
            <li
              key={sub.id}
              className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2"
            >
              <span className="flex-1 text-sm">
                {sub.nom}{" "}
                <span className="text-slate-500">
                  ({sub._count?.produits || 0})
                </span>
              </span>
              <button
                className="revision-button secondary"
                onClick={() => {
                  setId(sub.id);
                  setNom(sub.nom);
                }}
              >
                Renommer
              </button>
              <button
                className="revision-button secondary"
                disabled={busy}
                onClick={() => setDeleting(sub.id)}
              >
                Supprimer
              </button>
              {deleting === sub.id && (
                <div className="w-full revision-notice">
                  <span>Supprimer « {sub.nom} » ?</span>
                  <button
                    className="revision-button secondary"
                    disabled={busy}
                    onClick={() => void remove(sub.id)}
                  >
                    Confirmer
                  </button>
                  <button
                    className="revision-button secondary"
                    onClick={() => setDeleting(null)}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
