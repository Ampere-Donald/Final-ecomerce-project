import { useEffect, useState } from "react";
import apiClient from "../utils/apiClient";

export default function useResource(path) {
  const [state, setState] = useState({
    key: "",
    data: null,
    error: null,
    loading: true,
  });
  const [attempt, setAttempt] = useState(0);
  const key = `${path}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get(path, { signal: controller.signal })
      .then(({ data }) => {
        setState({ key, data, error: null, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, data: null, error, loading: false });
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    ...(state.key === key ? state : { data: null, error: null, loading: true }),
    retry: () => setAttempt((n) => n + 1),
  };
}
