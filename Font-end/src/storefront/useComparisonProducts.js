import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import { resolveImageUrl } from "../utils/mapProduct";
import { comparisonProduct } from "./comparisonData";

export default function useComparisonProducts(selection) {
  const [state, setState] = useState({ key: "", entries: [] });
  const [attempt, setAttempt] = useState(0);
  const encoded = JSON.stringify(selection);
  const key = encoded + ":" + attempt;
  useEffect(() => {
    const controller = new AbortController();
    const chosen = JSON.parse(encoded);
    Promise.all(
      chosen.ids.map(async (id) => {
        try {
          const { data } = await apiClient.get(
            "/produits/" + encodeURIComponent(id),
            { signal: controller.signal },
          );
          return {
            id,
            ...comparisonProduct(data, id, chosen.categoryId, resolveImageUrl),
          };
        } catch (error) {
          return {
            id,
            error: error.response?.status === 404 ? "unavailable" : "network",
          };
        }
      }),
    ).then((entries) => {
      if (!controller.signal.aborted) setState({ key, entries });
    });
    return () => controller.abort();
  }, [encoded, key]);
  return {
    entries: state.key === key ? state.entries : [],
    loading: selection.ids.length > 0 && state.key !== key,
    retry: () => setAttempt((n) => n + 1),
  };
}
