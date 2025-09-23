// Resolve API base URL allowing env override and consistent fallbacks based on current host
const rawEnvUrl = process.env.REACT_APP_API_BASE_URL ? process.env.REACT_APP_API_BASE_URL.trim() : "";
const apiPort = process.env.REACT_APP_API_PORT ? process.env.REACT_APP_API_PORT.trim() : "3500";

const hasWindow = typeof window !== "undefined";
const host = hasWindow ? window.location.hostname : "";
const protocol = hasWindow ? window.location.protocol : "http:";
const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(host);

let baseCandidate = rawEnvUrl;

if (!baseCandidate) {
  if (isLocalhost) {
    baseCandidate = `http://localhost:${apiPort}`;
  } else if (host) {
    // Usa o mesmo host do front (substituindo apenas a porta) para ambientes publicados
    baseCandidate = `${protocol}//${host}:${apiPort}`;
  } else {
    // Fallback final (VPS atual)
    baseCandidate = `http://85.31.61.242:${apiPort}`;
  }
}

const normalizedBase = baseCandidate.replace(/\/$/, "");

export const API_BASE_URL = normalizedBase;

export function apiUrl(path = "") {
  if (!path) {
    return API_BASE_URL;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
