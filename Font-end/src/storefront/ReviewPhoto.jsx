import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import { useI18n } from "../context/I18nContext";
import { Modal } from "./Elements";

export default function ReviewPhoto({ id, token, accessToken }) {
  const { lang } = useI18n(),
    tr = (fr, en) => (lang === "en" ? en : fr);
  const [open, setOpen] = useState(false),
    [retry, setRetry] = useState(0),
    [loaded, setLoaded] = useState(null);
  const identity = `${id}:${token || ""}:${accessToken || ""}:${retry}`;
  const resource =
    loaded?.identity === identity ? loaded : { url: "", error: false };
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let objectUrl;
    const options = {
      signal: controller.signal,
      responseType: "blob",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 20000,
    };
    const promise = accessToken
      ? apiClient.post(
          "/avis/guest/photo",
          { accessToken, avisId: id },
          options,
        )
      : apiClient.get(`/avis/${id}/photo-privee`, options);
    promise
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (data.type !== "image/webp" || data.size > 262144)
          throw Error("Invalid photo");
        objectUrl = URL.createObjectURL(data);
        setLoaded({ identity, url: objectUrl, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setLoaded({ identity, url: "", error: true });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, retry, id, token, accessToken, identity]);
  return (
    <>
      <button
        className="e-text-button"
        onClick={() => {
          setLoaded(null);
          setOpen(true);
        }}
      >
        {tr("Voir la photo jointe", "View the attached photo")}
      </button>
      <Modal
        open={open}
        title={tr("Photo de votre avis", "Your review photo")}
        onClose={() => setOpen(false)}
      >
        {resource.error ? (
          <div role="alert">
            <p>{tr("Photo indisponible.", "Photo unavailable.")}</p>
            <button
              className="e-btn e-secondary"
              onClick={() => {
                setLoaded(null);
                setRetry((n) => n + 1);
              }}
            >
              {tr("Réessayer", "Try again")}
            </button>
          </div>
        ) : resource.url ? (
          <img
            className="e-review-photo-full"
            src={resource.url}
            alt={tr(
              "Photo jointe à votre avis",
              "Photo attached to your review",
            )}
          />
        ) : (
          <p role="status">{tr("Chargement de la photo…", "Loading photo…")}</p>
        )}
      </Modal>
    </>
  );
}
