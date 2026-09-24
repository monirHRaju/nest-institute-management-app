import axios from 'axios';

// The base URL for all API requests
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending/receiving httpOnly cookies (refresh_token)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Setup interceptors to handle automatic token refresh.
 * This is primarily for the client side.
 * We don't attach the access token here automatically for every request
 * because in Next.js Server Components, we have to pass it explicitly from cookies.
 *
 * For client components, we will store the access token in memory or a client-accessible cookie.
 * In this implementation (from Segment 1.4 requirements), the access token is stored in
 * a Next.js cookie ("access_token") so both server and client can read it.
 */
apiClient.interceptors.request.use((config) => {
  // If running in browser, we can read the access_token from document.cookie
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )access_token=([^;]+)'));
    if (match && match[2]) {
      config.headers.Authorization = `Bearer ${match[2]}`;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
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
    const originalRequest = error.config;

    // If it's 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token using the httpOnly refresh_token cookie
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newAccessToken = data.data.accessToken;

        // Save new access token to cookie
        if (typeof document !== 'undefined') {
          // Set cookie for client side (max age 15 mins)
          document.cookie = `access_token=${newAccessToken}; path=/; max-age=900; SameSite=Strict`;
        }

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return apiClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        // If refresh fails, clear the access token and redirect to login
        if (typeof document !== 'undefined') {
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export async function get<T>(url: string, config = {}): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

export async function post<T>(url: string, data?: any, config = {}): Promise<T> {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
}

export async function patch<T>(url: string, data?: any, config = {}): Promise<T> {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config = {}): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}
