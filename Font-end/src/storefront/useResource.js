import { useContext, useEffect, useState } from "react";
import apiClient from "../utils/apiClient";
import { InitialResourceContext } from "./initialResourceContext";

export default function useResource(path) {
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
  const key = `${path}:${attempt}`;
  useEffect(() => {
    if (attempt === 0 && initial?.resources?.[path] && Date.now() - initial.at < 15000) return;
    const controller = new AbortController();
    apiClient
      .get(path, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setState({ key, data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, key, attempt, initial]);
  return {
    ...(state.key === key ? state : { data: null, error: null, loading: true }),
    retry: () => setAttempt((n) => n + 1),
  };
}
