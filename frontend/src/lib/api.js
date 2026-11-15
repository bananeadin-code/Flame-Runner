import { tr } from "./i18n";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== false) search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE}${path}`, options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(0, tr("No se pudo conectar con el servidor.", "Could not connect to the server."));
  }
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : body.error || detail;
    } catch {
      detail = response.statusText;
    }
    if (response.status === 429) detail = tr("Has alcanzado el límite de consultas. Espera un momento e inténtalo de nuevo.", "You have reached the query limit. Wait a moment and try again.");
    if (response.status === 503) detail = tr("El asistente no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.", "The assistant is not available right now. Try again in a few minutes.");
    throw new ApiError(response.status, detail);
  }
  return response.json();
}

export function apiGet(path, params, signal) {
  return request(`${path}${queryString(params)}`, { signal });
}

export function apiPost(path, body, signal) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}
