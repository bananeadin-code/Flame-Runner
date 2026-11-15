import { useEffect, useState } from "react";
import { apiGet, queryString } from "./api";

const cache = new Map();

export function useApi(path, params) {
  const key = path ? `${path}${queryString(params)}` : null;
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    if (!key || cache.has(key)) return undefined;
    const controller = new AbortController();
    apiGet(path, params, controller.signal)
      .then((data) => {
        cache.set(key, data);
        setState({ key, data, error: null });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setState({ key, data: null, error });
      });
    return () => controller.abort();
  }, [key]);

  if (!key) return { data: null, error: null, loading: false };
  if (cache.has(key)) return { data: cache.get(key), error: null, loading: false };
  if (state.key === key) return { data: state.data, error: state.error, loading: false };
  return { data: null, error: null, loading: true };
}
