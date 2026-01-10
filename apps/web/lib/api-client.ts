import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

function clearAuthStorage() {
  try {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('entitlements');
  } catch {
    // ignore
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = window.localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true }
      );

      const accessToken = res.data?.accessToken;
      const nextRefreshToken = res.data?.refreshToken;

      if (typeof accessToken === 'string' && accessToken.length > 0) {
        window.localStorage.setItem('accessToken', accessToken);
        if (typeof nextRefreshToken === 'string' && nextRefreshToken.length > 0) {
          window.localStorage.setItem('refreshToken', nextRefreshToken);
        }
        return accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (typeof window === 'undefined') throw error;

    const reqAny = originalRequest as any;

    if (status === 401 && originalRequest && !reqAny?.__isRetryRequest) {
      reqAny.__isRetryRequest = true;
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient.request(originalRequest);
      }

      clearAuthStorage();
      window.location.href = '/login';
    }

    throw error;
  }
);
