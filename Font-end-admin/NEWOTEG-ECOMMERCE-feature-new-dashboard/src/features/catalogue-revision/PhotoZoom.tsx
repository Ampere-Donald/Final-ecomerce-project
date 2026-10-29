import { useEffect, useRef } from "react";
export function PhotoZoom({
  src,
  name,
  onClose,
}: {
  src: string;
  name: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="revision-photo-dialog"
      aria-label={`Photo de ${name}`}
      onCancel={onClose}
    >
      <button className="revision-button secondary mb-3" onClick={onClose}>
        Fermer la photo
      </button>
      <img src={src} alt={name} />
    </dialog>
  );
}
