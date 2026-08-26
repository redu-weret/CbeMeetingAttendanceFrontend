import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { APP_URL, isLoopbackHost } from '../config';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { QrCode, Copy, Check, Link2, AlertTriangle, Loader2, RefreshCw, Wifi } from 'lucide-react';
import { cn } from '../lib/utils';

interface QrCodeCardProps {
  className?: string;
  /** Hide the copy button for compact embedding */
  showCopyButton?: boolean;
}

const HOTSPOT_PREFIX = '192.168.137.';
/** Remembers the address the user picked so the QR re-opens on the right one. */
const SELECTED_URL_KEY = 'qr_selected_url';
/** Remembers a manually typed address so it survives reloads. */
const MANUAL_URL_KEY = 'qr_manual_url';

function isLoopback(a: number): boolean {
  return a === 127;
}

function isLinkLocal(a: number, b: number): boolean {
  return a === 169 && b === 254;
}

/** Docker's default bridge networks live in 172.16.0.0/12. Only the backend
 *  reports container IPs, so this filter applies to backend data alone — never
 *  to WebRTC host candidates, which are always this machine's real adapters
 *  (a legitimate LAN can also use 172.16/12, e.g. 172.23.x Wi-Fi). */
function isDockerBridge(a: number, b: number): boolean {
  return a === 172 && b >= 16 && b <= 31;
}

/** Rank so the Windows Mobile Hotspot subnet wins, then common LAN ranges. */
function rankIp(ip: string): number {
  if (ip.startsWith(HOTSPOT_PREFIX)) return 0;
  if (ip.startsWith('192.168.')) return 1;
  if (ip.startsWith('10.')) return 2;
  return 3;
}

function sortAndFilterIps(ips: string[], filterDockerBridge: boolean): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ip of ips) {
    const [a, b] = ip.split('.').map(Number);
    if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
    if (isLoopback(a) || isLinkLocal(a, b)) continue;
    if (filterDockerBridge && isDockerBridge(a, b)) continue;
    if (seen.has(ip)) continue;
    seen.add(ip);
    out.push(ip);
  }
  return out.sort((x, y) => rankIp(x) - rankIp(y));
}

/** Build a phone-accessible URL. Handles an empty port (e.g. behind nginx on :80). */
function buildUrl(ip: string): string {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const port = window.location.port || (protocol === 'https:' ? '443' : '80');
  return `${protocol}//${ip}:${port}/`;
}

/** Ask the backend's dev-only helper for this machine's LAN IPv4 addresses. */
async function fetchBackendIps(): Promise<string[]> {
  try {
    const res = await fetch('/api/network/ip', { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.ips) ? data.ips : [];
  } catch {
    return [];
  }
}

/**
 * Client-side discovery that needs no backend: WebRTC ICE host candidates expose
 * the browser machine's own LAN IPv4 addresses. Resolves with an empty array on
 * browsers where the API is unavailable or when discovery times out.
 */
function discoverLocalIps(): Promise<string[]> {
  return new Promise((resolve) => {
    let pc: RTCPeerConnection;
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
    } catch {
      resolve([]);
      return;
    }

    const ips = new Set<string>();
    let settled = false;
    let timer = 0;

    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      pc.close();
      resolve([...ips]);
    };

    timer = window.setTimeout(done, 1500);
    pc.onicecandidate = (event) => {
      const match = event.candidate?.candidate?.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      if (match) ips.add(match[1]);
    };
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') done();
    };

    try {
      pc.createDataChannel('qr-url');
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => done());
    } catch {
      done();
    }
  });
}

/**
 * Resolve every URL the QR code could point at, best match first:
 *  - APP_URL from config when set (VITE_APP_URL override) — the only option.
 *  - The current site origin when the page was opened from a real network
 *    address (e.g. a phone at http://172.23.227.132:5173) — already phone-accessible.
 *  - Otherwise the page was opened via localhost, so discover this machine's LAN
 *    addresses two ways in parallel: the backend's dev-only endpoint and a
 *    client-side WebRTC fallback that works even without a backend (mock mode).
 *    Hotspot addresses (192.168.137.x) are ranked first; every candidate is
 *    offered in the UI so the user can pick the one matching the phone's network
 *    (a PC with VMware/WSL adapters reports several unreachable addresses).
 */
async function resolveQrUrls(): Promise<string[]> {
  if (APP_URL) return [APP_URL];

  if (!isLoopbackHost()) {
    return [window.location.origin];
  }

  const [backendIps, localIps] = await Promise.all([fetchBackendIps(), discoverLocalIps()]);
  // Docker-bridge filtering applies to backend data only (container IPs);
  // WebRTC host candidates are this machine's real adapters and must be kept.
  const merged = [
    ...sortAndFilterIps(backendIps, true),
    ...sortAndFilterIps(localIps, false),
  ];
  // Dedupe across sources: the same IP is often reported by both the backend
  // and WebRTC, and the selector must never show duplicate addresses.
  const seen = new Set<string>();
  const candidates = merged.filter((ip) => (seen.has(ip) ? false : (seen.add(ip), true)));
  if (candidates.length > 0) return candidates.map(buildUrl);

  return [window.location.origin];
}

/** True when a URL would only work on this PC, not on a phone. */
function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  } catch {
    return true;
  }
}

/** Compact address shown in the selector pills, e.g. "192.168.137.1:5173". */
function compactUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Build a URL from a manually typed address. A bare IPv4 (e.g. "192.168.1.6")
 * is combined with the current scheme + port; full http(s) URLs pass through.
 * Returns null for anything unrecognized.
 */
function buildManualUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ipv4 = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (ipv4) {
    // Reject octets > 255 so a typo can't silently produce a dead QR.
    const octetsValid = ipv4[1].split('.').every((octet) => Number(octet) <= 255);
    return octetsValid ? buildUrl(ipv4[1]) : null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return url.hostname ? url.toString().replace(/\/$/, '') : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Responsive card that renders the homepage URL as a scannable QR code. */
export function QrCodeCard({ className, showCopyButton = true }: QrCodeCardProps) {
  const { t } = useTranslation();
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>(APP_URL || window.location.origin);
  const [resolved, setResolved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [manualUrl, setManualUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(MANUAL_URL_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [manualDraft, setManualDraft] = useState('');
  const [manualError, setManualError] = useState(false);

  useEffect(() => {
    let active = true;
    setResolved(false);
    resolveQrUrls().then((candidates) => {
      if (!active) return;
      // Honor a previously chosen address when it is still available.
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(SELECTED_URL_KEY);
      } catch {
        /* localStorage unavailable — ignore */
      }
      const preferred =
        saved && candidates.includes(saved) ? saved : candidates[0] ?? window.location.origin;
      setUrls(candidates);
      setSelected(preferred);
      // Only reveal the loopback warning once resolution finished, so it
      // never flashes while the LAN IP is still being discovered.
      setResolved(true);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  // A QR may only ever encode an address a phone can actually reach. If
  // resolution finishes and every candidate is still loopback (discovery
  // failed and the only fallback is the localhost origin), no QR is rendered
  // at all — the phone must never be pointed at "localhost". A manually
  // typed address always overrides this: it is validated by buildManualUrl.
  const qrValue = manualUrl || selected;
  const hasReachableUrl = urls.some((url) => !isLoopbackUrl(url)) || Boolean(manualUrl);
  const resolutionFailed = resolved && !hasReachableUrl;
  const showQr = manualUrl ? true : resolved && hasReachableUrl;

  const choose = (url: string) => {
    setSelected(url);
    try {
      localStorage.setItem(SELECTED_URL_KEY, url);
    } catch {
      /* localStorage unavailable — ignore */
    }
  };

  const applyManualUrl = () => {
    const url = buildManualUrl(manualDraft);
    if (!url) {
      setManualError(true);
      return;
    }
    setManualError(false);
    setManualDraft('');
    setManualUrl(url);
    try {
      localStorage.setItem(MANUAL_URL_KEY, url);
    } catch {
      /* localStorage unavailable — ignore */
    }
  };

  const clearManualUrl = () => {
    setManualUrl('');
    setManualError(false);
    try {
      localStorage.removeItem(MANUAL_URL_KEY);
    } catch {
      /* localStorage unavailable — ignore */
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard API unavailable (e.g. insecure context) - ignore */
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent>
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="shrink-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            {showQr ? (
              <QRCodeSVG value={qrValue} size={132} level="M" marginSize={1} />
            ) : resolutionFailed ? (
              <div className="flex h-[132px] w-[132px] flex-col items-center justify-center gap-1.5">
                <AlertTriangle className="h-7 w-7 text-red-400" />
                <span className="max-w-[110px] text-[10px] font-medium leading-tight text-gray-400">
                  {t('qr.failedTitle')}
                </span>
              </div>
            ) : (
              <div className="flex h-[132px] w-[132px] items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-gray-300" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900 sm:justify-start">
              <QrCode className="h-5 w-5 shrink-0 text-blue-700" />
              {t('qr.title')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{t('qr.description')}</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:justify-start">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {qrValue}
            </p>
            {manualUrl && (
              <div className="mt-1.5 flex justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={clearManualUrl}
                  className="text-[11px] font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
                >
                  {t('qr.manualClear')}
                </button>
              </div>
            )}
            {resolutionFailed && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-left text-xs text-red-800">
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                  {t('qr.failedTitle')}
                </p>
                <p className="mt-1 leading-relaxed">{t('qr.failedBody')}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2.5 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('qr.retry')}
                </Button>
                <div className="mt-3 rounded-xl border border-red-100 bg-white/70 p-2.5">
                  <p className="text-[11px] font-medium text-gray-600">{t('qr.manualTitle')}</p>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      value={manualDraft}
                      onChange={(e) => {
                        setManualDraft(e.target.value);
                        setManualError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyManualUrl();
                      }}
                      placeholder={t('qr.manualPlaceholder')}
                      aria-label={t('qr.manualTitle')}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <Button size="sm" onClick={applyManualUrl}>
                      {t('qr.manualApply')}
                    </Button>
                  </div>
                  {manualError && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {t('qr.manualInvalid')}
                    </p>
                  )}
                </div>
              </div>
            )}                {!manualUrl && resolved && urls.length > 1 && (
              <div className="mt-3 text-left">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  <Wifi className="h-3.5 w-3.5 shrink-0" />
                  {t('qr.selectHint')}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {urls.map((url) => {
                    const isActive = url === selected;
                    return (
                      <button
                        key={url}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => choose(url)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                          isActive
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-700'
                        )}
                      >
                        {compactUrl(url)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {showCopyButton && (
              <Button variant="outline" size="sm" className="mt-3" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? t('qr.copied') : t('qr.copyUrl')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
