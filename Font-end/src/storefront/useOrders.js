import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import apiClient from "../utils/apiClient";

export default function useOrders() {
  const { token } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({
    token: null,
    data: null,
    error: null,
    revision: -1,
  });
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get("/commandes/my-orders", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        timeout: 20000,
      })
      .then(({ data }) => {
        if (
          !Array.isArray(data) ||
          data.some((order) => !order?.id || !Array.isArray(order.lignes))
        )
          throw new Error("Invalid orders response");
        if (!controller.signal.aborted)
          setState({ token, data, error: null, revision });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ token, data: null, error, revision });
      });
    return () => controller.abort();
  }, [token, revision]);
  const current = state.token === token && state.revision === revision;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !current,
    refresh: () => setRevision((n) => n + 1),
  };
}
