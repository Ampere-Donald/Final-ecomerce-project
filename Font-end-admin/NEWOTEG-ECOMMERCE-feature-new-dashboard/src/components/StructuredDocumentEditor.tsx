import { useEffect, useRef, useState } from "react";
import api, { getApiErrorMessage } from "../services/api";
import { createClientId } from "../utils/clientId";

type Copy = {
  summary: string;
  paragraphs: string[];
  applications: string[];
  integration: string[];
  replacement: string[];
  missing: string[];
  faq: { question: string; answer: string }[];
  documents: { label: string; url: string; scope: "product" | "family" }[];
};
type Content = {
  schemaVersion: 1;
  family: string;
  locales: { fr: Copy; en?: Copy };
};
type RecordDetail = {
  id: string;
  revision: number;
  nom_produit: string;
  description: string | null;
  short_description: string | null;
  product_fingerprint?: string;
  draft_content?: Content | null;
  published_content?: Content | null;
};
const emptyCopy = (): Copy => ({
  summary: "",
  paragraphs: [],
  applications: [],
  integration: [],
  replacement: [],
  missing: [],
  faq: [],
  documents: [],
});
const copyFields = {
  paragraphs:
    "Description approfondie (paragraphes séparés par une ligne vide)",
  applications: "Applications (une par ligne)",
  integration: "Intégration à un projet (un point par ligne)",
  replacement: "Avant remplacement (un point par ligne)",
  missing: "Informations à préciser (une par ligne)",
};
function editable(raw: Content): Content {
  return JSON.parse(
    JSON.stringify({
      schemaVersion: 1,
      family: raw.family,
      locales: {
        fr: raw.locales.fr,
        ...(raw.locales.en ? { en: raw.locales.en } : {}),
      },
    }),
  );
}
export default function StructuredDocumentEditor({
  detail,
  onSaved,
  onDirty,
  onBusy,
}: {
  detail: RecordDetail;
  onSaved: (message: string) => void;
  onDirty: (value: boolean) => void;
  onBusy: (value: boolean) => void;
}) {
  const [content, setContent] = useState<Content>({
    schemaVersion: 1,
    family: "equipement",
    locales: { fr: emptyCopy() },
  });
  const [language, setLanguage] = useState<"fr" | "en">("fr"),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false),
    [message, setMessage] = useState("");
  const operation = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    const initial = detail.draft_content || detail.published_content;
    setContent(
      initial
        ? editable(initial)
        : {
            schemaVersion: 1,
            family: "equipement",
            locales: {
              fr: {
                ...emptyCopy(),
                summary: detail.short_description || "",
                paragraphs: detail.description ? [detail.description] : [],
              },
            },
          },
    );
    setDirty(false);
    onDirty(false);
    setLanguage("fr");
    setError("");
    operation.current = null;
  }, [detail.id, detail.revision]); // Parent callback must not reset unsaved edits.
  const edit = (next: Content) => {
    setContent(next);
    setDirty(true);
    onDirty(true);
    setMessage("");
    operation.current = null;
  };
  const c = content.locales[language] || emptyCopy();
  const patch = (next: Partial<Copy>) =>
    edit({
      ...content,
      locales: { ...content.locales, [language]: { ...c, ...next } },
    });
  async function save(action: "draft" | "publish" | "rollback") {
    if (busy) return;
    setBusy(true);
    onBusy(true);
    setError("");
    setMessage("");
    const clean = editable(content);
    for (const locale of Object.values(clean.locales))
      if (locale)
        for (const field of Object.keys(copyFields))
          (locale as any)[field] = (locale as any)[field]
            .map((v: string) => v.trim())
            .filter(Boolean);
    const body = {
      expectedRevision: detail.revision,
      ...(detail.product_fingerprint?{expectedProductFingerprint:detail.product_fingerprint}:{}),
      action,
      ...(action === "draft" ? { content: clean } : {}),
    };
    const key = JSON.stringify(body);
    if (operation.current?.key !== key)
      operation.current = { key, id: createClientId() };
    try {
      await api.patch(`/catalogue-documentary/${detail.id}/structured`, {
        ...body,
        operationId: operation.current!.id,
      });
      setDirty(false);
      onDirty(false);
      const feedback =
        action === "draft"
          ? "Brouillon enregistré, sans changement public."
          : action === "publish"
            ? "Version structurée publiée."
            : "Publication précédente restaurée.";
      setMessage(feedback);
      onSaved(feedback);
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          "Enregistrement impossible. Vos modifications sont conservées.",
        ),
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section
      className="space-y-5 border-t border-slate-200 pt-6"
      aria-labelledby="structured-editor-title"
    >
      <header>
        <h3 id="structured-editor-title" className="text-xl font-semibold">
          Fiche technique et pédagogique
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Enregistrez un brouillon puis publiez-le. Les caractéristiques se
          modifient dans l’éditeur technique existant.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-emerald-800"
        >
          {message}
        </p>
      )}
      <fieldset disabled={busy} className="space-y-4">
        <label className="block font-medium">
          Modèle documentaire
          <select
            className="mt-2 block w-full rounded-lg border border-slate-300 p-3"
            value={content.family}
            onChange={(e) => edit({ ...content, family: e.target.value })}
          >
            {Object.entries({
              passifs: "Composants passifs",
              semiconducteurs: "Semi-conducteurs",
              alimentations: "Alimentations",
              modules: "Cartes et modules",
              connectique: "Connectique",
              "mesure-outillage": "Mesure et outillage",
              equipement: "Pièces et équipements",
            }).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <label>
            Langue
            <select
              className="ml-2 rounded border border-slate-300 p-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
            >
              <option value="fr">Français</option>
              {content.locales.en && <option value="en">English</option>}
            </select>
          </label>
          {!content.locales.en && (
            <button
              type="button"
              className="text-blue-700 underline"
              onClick={() => {
                edit({
                  ...content,
                  locales: { ...content.locales, en: emptyCopy() },
                });
                setLanguage("en");
              }}
            >
              Préparer la version anglaise
            </button>
          )}
          {content.locales.en && (
            <button
              type="button"
              className="text-slate-700 underline"
              onClick={() => {
                edit({ ...content, locales: { fr: content.locales.fr } });
                setLanguage("fr");
              }}
            >
              Retirer le brouillon anglais
            </button>
          )}
        </div>
        <label className="block font-medium">
          Présentation courte
          <textarea
            maxLength={700}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
            value={c.summary}
            onChange={(e) => patch({ summary: e.target.value })}
          />
        </label>
        {Object.entries(copyFields).map(([field, label]) => (
          <label key={field} className="block font-medium">
            {label}
            <textarea
              rows={field === "paragraphs" ? 6 : 3}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
              value={c[field as keyof typeof copyFields].join(
                field === "paragraphs" ? "\n\n" : "\n",
              )}
              onChange={(e) =>
                patch({
                  [field]: e.target.value.split(
                    field === "paragraphs" ? /\n\s*\n/ : /\n/,
                  ),
                })
              }
            />
          </label>
        ))}
        <section>
          <h4 className="font-semibold">Questions techniques</h4>
          {c.faq.map((q, i) => (
            <div key={i} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
              <label className="block">
                Question
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={q.question}
                  onChange={(e) =>
                    patch({
                      faq: c.faq.map((v, j) =>
                        j === i ? { ...v, question: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label className="block">
                Réponse
                <textarea
                  className="mt-1 w-full rounded border p-2"
                  value={q.answer}
                  onChange={(e) =>
                    patch({
                      faq: c.faq.map((v, j) =>
                        j === i ? { ...v, answer: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => patch({ faq: c.faq.filter((_, j) => j !== i) })}
              >
                Retirer cette question
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={c.faq.length >= 8}
            className="mt-3 text-blue-700 underline"
            onClick={() =>
              patch({ faq: [...c.faq, { question: "", answer: "" }] })
            }
          >
            Ajouter une question
          </button>
        </section>
        <section>
          <h4 className="font-semibold">Documents publics</h4>
          {c.documents.map((d, i) => (
            <div key={i} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
              <label className="block">
                Titre du document
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={d.label}
                  onChange={(e) =>
                    patch({
                      documents: c.documents.map((v, j) =>
                        j === i ? { ...v, label: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label className="block">
                URL HTTPS publique
                <input
                  type="url"
                  className="mt-1 w-full rounded border p-2"
                  value={d.url}
                  onChange={(e) =>
                    patch({
                      documents: c.documents.map((v, j) =>
                        j === i ? { ...v, url: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label className="block">
                Portée
                <select
                  className="ml-2 rounded border p-2"
                  value={d.scope}
                  onChange={(e) =>
                    patch({
                      documents: c.documents.map((v, j) =>
                        j === i
                          ? {
                              ...v,
                              scope: e.target.value as "product" | "family",
                            }
                          : v,
                      ),
                    })
                  }
                >
                  <option value="family">Document de famille</option>
                  <option value="product">Référence exacte</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  patch({ documents: c.documents.filter((_, j) => j !== i) })
                }
              >
                Retirer ce document
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={c.documents.length >= 12}
            className="mt-3 text-blue-700 underline"
            onClick={() =>
              patch({
                documents: [
                  ...c.documents,
                  { label: "", url: "", scope: "family" },
                ],
              })
            }
          >
            Ajouter un document
          </button>
        </section>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border px-4 py-3"
            onClick={() => setPreview((v) => !v)}
          >
            {preview ? "Masquer l’aperçu" : "Prévisualiser le contenu"}
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-3"
            onClick={() => void save("draft")}
          >
            Enregistrer le brouillon
          </button>
          <button
            type="button"
            disabled={dirty || !detail.draft_content}
            className="rounded-lg bg-blue-700 px-4 py-3 text-white disabled:opacity-50"
            onClick={() => void save("publish")}
          >
            Publier le brouillon enregistré
          </button>
          {detail.published_content && (
            <button
              type="button"
              disabled={dirty}
              className="rounded-lg border px-4 py-3 disabled:opacity-50"
              onClick={() => void save("rollback")}
            >
              Annuler la dernière publication
            </button>
          )}
        </div>
      </fieldset>
      {preview && (
        <article className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h4 className="text-xl font-semibold">
            {detail.nom_produit} — aperçu {language.toUpperCase()}
          </h4>
          <p>{c.summary}</p>
          {Object.entries(copyFields).map(
            ([field, label]) =>
              c[field as keyof typeof copyFields].some(Boolean) && (
                <section key={field}>
                  <h5 className="font-semibold">{label.split(" (")[0]}</h5>
                  {c[field as keyof typeof copyFields]
                    .filter(Boolean)
                    .map((t, i) => (
                      <p key={i} className="mt-2 whitespace-pre-wrap">
                        {t}
                      </p>
                    ))}
                </section>
              ),
          )}
          {c.faq.map((q, i) => (
            <section key={i}>
              <h5 className="font-semibold">{q.question}</h5>
              <p>{q.answer}</p>
            </section>
          ))}
          <p className="text-sm text-slate-600">
            Aperçu du contenu ; le prix, le stock et les attributs techniques
            restent gérés séparément.
          </p>
        </article>
      )}
    </section>
  );
}
