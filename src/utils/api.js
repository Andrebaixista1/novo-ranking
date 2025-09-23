// Resolve API base URL with sensible defaults for local development and the VPS deployment
const rawEnvUrl = process.env.REACT_APP_API_BASE_URL ? process.env.REACT_APP_API_BASE_URL.trim() : "";
const host = typeof window !== "undefined" ? window.location.hostname : "";
const isLocalhost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(host);
const DEFAULT_LOCAL_BASE_URL = "http://localhost:3500";
const DEFAULT_REMOTE_BASE_URL = "http://85.31.61.242:3500";

const chosenBase = rawEnvUrl || (isLocalhost ? DEFAULT_LOCAL_BASE_URL : DEFAULT_REMOTE_BASE_URL);
const normalizedBase = chosenBase.replace(/\/$/, "");

export const API_BASE_URL = normalizedBase;

export function apiUrl(path = "") {
  if (!path) {
    return API_BASE_URL;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
