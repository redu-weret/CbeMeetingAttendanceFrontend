/**
 * Public base URL of the application, used by the QR-code feature.
 *
 * Resolution order (no hardcoded host/IP anywhere):
 *  1. VITE_APP_URL environment variable (see .env.example) — explicit override,
 *     always wins. Vite inlines it at build time.
 *  2. The current site origin when the app is opened from a real network
 *     address (e.g. a phone at http://192.168.137.1:5173) — the origin is
 *     already the phone-accessible URL in that case.
 *  3. An empty string when opened via localhost / 127.0.0.1 — the QR card
 *     then auto-detects the PC's LAN/hotspot IP at runtime (see QrCodeCard.tsx).
 */
export const APP_URL: string =
  (import.meta.env.VITE_APP_URL as string | undefined)?.trim().replace(/\/+$/, '') ||
  (isLoopbackHost() ? '' : window.location.origin);

/**
 * True when the page is being viewed from the same machine (localhost /
 * 127.0.0.1 / ::1). Such URLs are useless on a phone, so features that need a
 * network-accessible URL (e.g. the QR code) must resolve the PC's LAN IP.
 */
export function isLoopbackHost(): boolean {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
}
