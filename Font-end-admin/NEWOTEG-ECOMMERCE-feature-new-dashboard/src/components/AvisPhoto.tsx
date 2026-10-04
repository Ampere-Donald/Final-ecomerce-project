import { useEffect, useState } from "react";
import api from "../services/api";
export function AvisPhoto({ id, onSeen }: { id: string; onSeen: () => void }) {
  const [open, setOpen] = useState(false),
    [retry, setRetry] = useState(0),
    [resource, setResource] = useState({ url: "", error: false });
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setResource({ url: "", error: false });
    api
      .get(`/avis/admin/${id}/photo`, {
        responseType: "blob",
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (data.type !== "image/webp" || data.size > 262144)
          throw Error("Invalid photo");
        objectUrl = URL.createObjectURL(data);
        setResource({ url: objectUrl!, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResource({ url: "", error: true });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, open, retry]);
  return (
    <div className="my-4">
      <button
        type="button"
        className="text-sm underline"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Fermer la photo" : "Examiner la photo jointe"}
      </button>
      {open &&
        (resource.error ? (
          <p role="alert">
            Photo indisponible.{" "}
            <button
              className="underline"
              onClick={() => setRetry((n) => n + 1)}
            >
              Réessayer
            </button>
          </p>
        ) : resource.url ? (
          <figure className="mt-3">
            <img
              className="max-h-80 max-w-full object-contain"
              src={resource.url}
              alt="Photo jointe à cet avis"
              onLoad={onSeen}
            />
            <figcaption className="mt-2 text-sm text-slate-600">
              Relisez aussi les textes et coordonnées visibles dans l’image.
            </figcaption>
          </figure>
        ) : (
          <p role="status">Chargement de la photo…</p>
        ))}
    </div>
  );
}
