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

export function statusError(status, detail) {
  if (status === 429) return new ApiError(status, tr("Has alcanzado el límite de consultas. Espera un momento e inténtalo de nuevo.", "You have reached the query limit. Wait a moment and try again."));
  if (status === 503) return new ApiError(status, tr("El asistente no está disponible ahora mismo. Inténtalo de nuevo en unos minutos.", "The assistant is not available right now. Try again in a few minutes."));
  if (status === 0) return new ApiError(status, tr("Se perdió la conexión con el servidor.", "The connection to the server was lost."));
  return new ApiError(status, detail || tr("Ocurrió un error en el servidor.", "Something went wrong on the server."));
}

async function send(path, options = {}) {
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
    throw statusError(response.status, detail);
  }
  return response;
}

async function request(path, options = {}) {
  const response = await send(path, options);
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

export async function apiStream(path, body, onEvent, signal) {
  const response = await send(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const emit = (line) => line.trim() && onEvent(JSON.parse(line));
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        emit(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
      }
    }
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw statusError(0);
  }
  emit(buffer + decoder.decode());
}
