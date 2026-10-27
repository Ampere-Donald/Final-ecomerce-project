import { useContext, useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import { InitialResourceContext } from "./initialResourceContext";
import { cataloguePrefetch } from "./cataloguePrefetch";

export default function useResource(path, refreshOnReturn = false) {
  const initial = useContext(InitialResourceContext);
  const [state, setState] = useState(() => initial?.resources?.[path] ? {
    key: `${path}:0`, data: initial.resources[path], error: null, loading: false,
  } : {
    key: "",
    data: null,
    error: null,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!refreshOnReturn) return;
    let lastRefresh = 0;
    const refresh = () => {
      if (!document.hidden && Date.now() - lastRefresh > 1000) {
        lastRefresh = Date.now();
        setAttempt((n) => n + 1);
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [refreshOnReturn]);
  const key = `${path}:${attempt}`;
  useEffect(() => {
    if (attempt === 0 && initial?.resources?.[path] && Date.now() - initial.at < 15000) return;
    const controller = new AbortController();
    const early = attempt === 0 ? cataloguePrefetch(path) : null;
    const request = early
      ? early.then((result) => result || (controller.signal.aborted ? null :
        apiClient.get(path, { signal: controller.signal })))
      : apiClient.get(path, { signal: controller.signal });
    request
      .then((result) => {
        if (!controller.signal.aborted && result) setState({ key, data: result.data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, key, attempt, initial]);
  return {
    // The request identity is hook-internal; exposing it as `key` changes React
    // reconciliation when callers spread the result onto their state wrapper.
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: state.key === key ? state.loading : true,
    retry: () => setAttempt((n) => n + 1),
  };
}
