import axios from 'axios';
import { mockHandler } from './mockHandler';
import { fileToDataUrl } from './mockData';
import { encryptPayload, invalidatePublicKeyCache, isEncryptionAvailable } from './encryption';
import type { ApiResponse, AuthResponse } from '../types';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ===== Mock mode =====
// The app connects to the real backend by default, so request payloads are
// encrypted out of the box. Demo mode is opt-in: open DevTools and run
//   localStorage.setItem('use_mock', 'true')
// to use the standalone in-browser demo (in demo mode requests are NOT
// encrypted because there is no backend to exchange keys with).

let mockMode = localStorage.getItem('use_mock') === 'true';

// Request configs that already carry an encrypted envelope (prevents double
// encryption when a request is retried, e.g. after a 401 token refresh).
const encryptedConfigs = new WeakSet<object>();

// ===== Request interceptor: attach auth token =====
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Multipart uploads must not carry the client's default JSON content type.
    // With Content-Type: application/json set, axios serializes FormData into a
    // JSON body (formDataToJSON), which the backend rejects with HTTP 415. By
    // removing the header the browser/XHR sets the correct multipart boundary.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];

      // In mock mode, multipart uploads are converted to a serializable payload
      // so the file survives axios's JSON serialization and the mock handler can
      // read it back from error.config (the browser can't reflect real FormData
      // through the failed-request path).
      if (mockMode) {
        const file = config.data.get('file');
        if (file instanceof File) {
          const dataUrl = await fileToDataUrl(file);
          config.data = {
            file: dataUrl,
            fileName: file.name,
            size: file.size,
            type: file.type,
          };
        }
      }
    }

    // ===== Application-level payload encryption (hybrid AES-GCM + RSA-OAEP) =====
    // JSON request bodies are encrypted before they leave the browser. Multipart
    // uploads (FormData), body-less requests, mock mode (no real backend to fetch
    // a public key from) and the public-key endpoint itself are left untouched.
    // Encrypting again a request that was already encrypted (e.g. a 401-retry) is
    // prevented via the _encrypted flag. Backend responses are NOT encrypted.
    if (
      !mockMode &&
      !encryptedConfigs.has(config) &&
      config.data !== undefined &&
      config.data !== null &&
      !(config.data instanceof FormData)
    ) {
      const method = (config.method || 'get').toLowerCase();
      const hasBody = ['post', 'put', 'patch'].includes(method);

      if (hasBody && typeof config.data === 'object') {
        if (!isEncryptionAvailable()) {
          // Web Crypto requires a secure context (HTTPS or localhost). When it is
          // missing we must not silently degrade to plaintext — warn once so it is
          // obvious in DevTools that payload encryption is NOT active.
          warnEncryptionUnavailableOnce();
        } else {
          try {
            const envelope = await encryptPayload(config.data);
            config.data = envelope;
            config.headers['X-Encrypted-Payload'] = 'true';
            encryptedConfigs.add(config);
          } catch (err) {
            // Never silently send plaintext when encryption was requested.
            console.warn('[encryption] Request payload encryption failed:', err);
            return Promise.reject(err);
          }
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===== Response interceptor: mock fallback & 401 refresh =====
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If in mock mode, redirect all errors to mock handler
    if (mockMode && error.config && !error.config._isMock) {
      error.config._isMock = true;
      const result = await mockHandler(error.config);
      if (result) return result;
    }

    // Key-rotation safety net: if the backend rejected an encrypted payload, the
    // cached public key may be stale — drop it so the next request refetches.
    if (error.response?.status === 400) {
      const msg =
        (error.response.data as { message?: string } | undefined)?.message ?? '';
      if (/encrypted|decrypt/i.test(msg)) {
        invalidatePublicKeyCache();
      }
    }

    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Don't retry login/register/refresh requests
    const skipPaths = ['/users/login', '/users/register', '/users/refresh'];
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !skipPaths.some((p) => originalRequest.url?.includes(p))
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        // Route the refresh call through apiClient so it is encrypted like any
        // other JSON payload (bare axios would bypass the request interceptor).
        const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/users/refresh', {
          refreshToken,
        });

        if (data.success && data.data) {
          const newToken = data.data.token;
          localStorage.setItem('auth_token', newToken);
          if (data.data.refreshToken) {
            localStorage.setItem('refresh_token', data.data.refreshToken);
          }
          localStorage.setItem('auth_user', JSON.stringify(data.data.user));

          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch {
        processQueue(error, null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Check whether the app is running in mock mode (no real backend).
 * Useful for conditional UI like a "Demo Mode" banner.
 */
export function isMockMode(): boolean {
  return mockMode;
}

let warnedEncryptionUnavailable = false;

function warnEncryptionUnavailableOnce(): void {
  if (warnedEncryptionUnavailable) return;
  warnedEncryptionUnavailable = true;
  console.warn(
    '[encryption] Web Crypto is not available in this context (needs HTTPS or localhost). ' +
      'Request payloads are NOT being encrypted.'
  );
}

export default apiClient;
