import axios from 'axios';
import { mockHandler } from './mockHandler';
import { fileToDataUrl } from './mockData';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ===== Mock mode =====
// The app starts in mock mode so it works standalone without a backend.
// To switch to a real backend: open DevTools and run:
//   localStorage.setItem('use_mock', 'false')
// To switch back to mock mode:
//   localStorage.setItem('use_mock', 'true')

let mockMode = localStorage.getItem('use_mock') !== 'false';

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

        const { data } = await axios.post('/api/users/refresh', { refreshToken });

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

export default apiClient;
