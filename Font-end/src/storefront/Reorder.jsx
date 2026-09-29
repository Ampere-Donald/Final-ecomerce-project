import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useI18n } from "../context/I18nContext";
import apiClient from "../utils/apiClient";
import { resolveImageUrl } from "../utils/mapProduct";
import { formatFCFA } from "../utils/formatFCFA";
import { Modal, Photo } from "./Elements";
import {
  prepareReorder,
  readReorderProducts,
  reorderChanged,
  reorderLines,
} from "./reorderData";

export default function Reorder({ order, onClose }) {
  const { cartItems, addSelection } = useCart();
  const { lang } = useI18n();
  const navigate = useNavigate();
  const tr = (fr, en) => (lang === "en" ? en : fr);
  const [rows, setRows] = useState(null);
  const [selection, setSelection] = useState({});
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const active = useRef(true);
  const cartRef = useRef(cartItems);
  useEffect(() => {
    cartRef.current = cartItems;
  }, [cartItems]);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    const lines = reorderLines(order.lignes);
    readReorderProducts(lines, async (id) => {
      const { data } = await apiClient.get(
        `/produits/${encodeURIComponent(id)}`,
        {
          signal: controller.signal,
          timeout: 15000,
        },
      );
      return data;
    }).then((products) => {
      if (controller.signal.aborted) return;
      const current = prepareReorder(
        lines,
        products,
        cartRef.current,
        resolveImageUrl,
      );
      setRows(current);
      setSelection(
        Object.fromEntries(current.map((row) => [row.key, row.quantity])),
      );
    });
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [order, revision]);
  const selectedRows = (rows || []).filter(
    (row) => selection[row.key] > 0 && !row.reason,
  );
  const total = selectedRows.reduce(
    (sum, row) => sum + selection[row.key] * row.product.retailPrice,
    0,
  );
  const reasons = {
    missing: tr("Référence retirée du catalogue", "No longer in the catalogue"),
    unverified: tr(
      "Vérification impossible — réessayez",
      "Unable to verify — try again",
    ),
    out: tr("Rupture de stock", "Out of stock"),
    availability: tr(
      "Disponibilité à confirmer",
      "Availability needs confirmation",
    ),
    price: tr("Prix à confirmer", "Price needs confirmation"),
    "cart-full": tr(
      "La quantité disponible est déjà dans votre panier",
      "All available units are already in your cart",
    ),
  };

  async function confirm() {
    if (lock.current || !selectedRows.length) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const lines = reorderLines(order.lignes);
      const products = await readReorderProducts(lines, async (id) => {
        const { data } = await apiClient.get(
          `/produits/${encodeURIComponent(id)}`,
          { timeout: 15000 },
        );
        return data;
      });
      if (!active.current) return;
      const current = prepareReorder(
        lines,
        products,
        cartRef.current,
        resolveImageUrl,
      );
      if (reorderChanged(rows, current, selection)) {
        setRows(current);
        setSelection(
          Object.fromEntries(
            current.map((row) => [
              row.key,
              Math.min(selection[row.key] || 0, row.max),
            ]),
          ),
        );
        setError(
          tr(
            "Un prix ou une disponibilité a changé. Relisez la sélection actualisée avant de l’ajouter.",
            "A price or availability has changed. Review the updated selection before adding it.",
          ),
        );
        return;
      }
      const items = current
        .filter((row) => selection[row.key] > 0 && !row.reason)
        .map((row) => ({ product: row.product, quantity: selection[row.key] }));
      if (!addSelection(items)) {
        setRows(current);
        setError(
          tr(
            "Votre panier a changé. Actualisez la sélection.",
            "Your cart has changed. Refresh the selection.",
          ),
        );
        return;
      }
      onClose();
      navigate("/panier");
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={tr("Acheter à nouveau", "Buy again")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="e-reorder">
        <p className="e-reorder-intro">
          {tr(
            "Votre ancienne sélection, avec les prix et disponibilités d’aujourd’hui.",
            "Your previous selection, with current prices and availability.",
          )}
        </p>
        {error && (
          <p className="e-form-error" role="alert">
            {error}
          </p>
        )}
        {!rows ? (
          <p role="status">
            {tr("Vérification du catalogue…", "Checking the catalogue…")}
          </p>
        ) : (
          <>
            {rows.map((row) => (
              <article
                className={`e-reorder-line${row.reason ? " is-unavailable" : ""}`}
                key={row.key}
              >
                <label className="e-check">
                  <input
                    type="checkbox"
                    disabled={busy || Boolean(row.reason)}
                    checked={Boolean(selection[row.key])}
                    onChange={(event) =>
                      setSelection({
                        ...selection,
                        [row.key]: event.target.checked ? row.quantity : 0,
                      })
                    }
                  />
                  <span>{row.product?.model || row.name}</span>
                </label>
                {row.product && (
                  <div className="e-reorder-photo">
                    <Photo product={row.product} />
                  </div>
                )}
                <div className="e-reorder-detail">
                  <small>
                    {tr("Ancienne quantité", "Previous quantity")} :{" "}
                    {row.requested}
                  </small>
                  {row.reason ? (
                    <p>{reasons[row.reason]}</p>
                  ) : (
                    <>
                      <strong>
                        {formatFCFA(row.product.retailPrice)} /{" "}
                        {tr("unité", "unit")}
                      </strong>
                      {row.priceChanged && (
                        <>
                          <p className="e-reorder-change">
                            {tr("Prix actualisé", "Price updated")}
                          </p>
                          <small>
                            {tr(
                              "Ancien prix enregistré",
                              "Previous recorded price",
                            )}{" "}
                            :{" "}
                            {[...new Set(row.oldPrices)]
                              .filter(
                                (price) => Number.isFinite(price) && price > 0,
                              )
                              .map(formatFCFA)
                              .join(" / ")}
                          </small>
                        </>
                      )}
                      {row.quantity < row.requested && (
                        <p className="e-reorder-change">
                          {tr(
                            "Quantité ajustée à la disponibilité",
                            "Quantity adjusted to availability",
                          )}
                        </p>
                      )}
                      {row.alreadyInCart > 0 && (
                        <small>
                          {row.alreadyInCart}{" "}
                          {tr("déjà dans votre panier", "already in your cart")}
                        </small>
                      )}
                      <label className="e-reorder-quantity">
                        {tr("À ajouter", "Add quantity")}
                        <input
                          type="number"
                          min="1"
                          max={row.max}
                          step="1"
                          aria-label={`${tr("Quantité à ajouter pour", "Quantity to add for")} ${row.product.model}`}
                          disabled={busy || !selection[row.key]}
                          value={selection[row.key] || row.quantity}
                          onChange={(event) => {
                            const quantity = Number(event.target.value);
                            if (
                              Number.isSafeInteger(quantity) &&
                              quantity >= 1 &&
                              quantity <= row.max
                            )
                              setSelection({
                                ...selection,
                                [row.key]: quantity,
                              });
                          }}
                        />
                      </label>
                    </>
                  )}
                </div>
              </article>
            ))}
            {!rows.length && (
              <p>
                {tr(
                  "Aucune référence exploitable dans cette commande.",
                  "No reusable references in this order.",
                )}
              </p>
            )}
            <div className="e-reorder-summary">
              <div>
                <small>{tr("Sélection à ajouter", "Selection to add")}</small>
                <strong>{formatFCFA(total)}</strong>
              </div>
              <p>
                {tr(
                  "Les prix et le stock seront vérifiés à nouveau avant d’enregistrer une commande.",
                  "Prices and stock will be checked again before an order is recorded.",
                )}
              </p>
            </div>
            <div className="e-actions">
              <button
                className="e-btn"
                disabled={busy || !selectedRows.length}
                onClick={confirm}
              >
                {busy
                  ? tr("Vérification…", "Checking…")
                  : tr(
                      "Ajouter la sélection au panier",
                      "Add selection to cart",
                    )}
              </button>
              <button
                className="e-text-button"
                disabled={busy}
                onClick={() => {
                  setRows(null);
                  setError("");
                  setRevision((n) => n + 1);
                }}
              >
                {tr("Actualiser la sélection", "Refresh selection")}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
