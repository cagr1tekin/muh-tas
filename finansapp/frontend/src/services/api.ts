// cursorrules §3.2: UI bileşeni asla doğrudan API çağrısı yapmaz — her zaman service katmanı.
import axios, { AxiosRequestConfig } from 'axios';
import { API_BASE } from '@/constants';
import { useAuthStore } from '@/store/authStore';

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — mevcut access token'ı her isteğe ekler
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token yenileme: tek seferlik deney; paralel 401'lerde sıralamak için flag kullanılır.
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) => {
    if (error || !token) {
      p.reject(error);
    } else {
      p.resolve(token);
    }
  });
  pendingQueue = [];
}

// Response interceptor — 401 alınca refresh token ile yeni access token ister.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Refresh isteği 401 aldıysa veya zaten retry denendiyse → clearAuth → reddet
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh' &&
      originalRequest.url !== '/auth/demo'
    ) {
      const refreshToken = useAuthStore.getState().refreshToken;

      // Refresh token yoksa (demo: 24h token, normal: beklenmedik durum) sadece reddet
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Başka bir refresh zaten sürüyorsa kuyruğa ekle
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken) => {
              if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
        const newToken: string = res.data?.access_token;
        if (!newToken) throw new Error('refresh: token boş');

        await useAuthStore.getState().updateAccessToken(newToken);
        processQueue(null, newToken);

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Refresh başarısız → kullanıcıyı çıkart
        await useAuthStore.getState().clearAuth();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
