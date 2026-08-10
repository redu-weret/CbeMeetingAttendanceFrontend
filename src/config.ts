/**
 * Public base URL of the application, used by the QR-code feature.
 *
 * Override it without touching code by setting the VITE_APP_URL environment
 * variable (see .env / .env.example). Vite inlines it at build time.
 * When empty/unset, the current site origin is used, which automatically
 * works for local dev (http://localhost:5173) and the Docker deployment
 * (http://localhost:8080).
 */
export const APP_URL: string =
  (import.meta.env.VITE_APP_URL as string | undefined)?.trim().replace(/\/+$/, '') ||
  window.location.origin;
