import axios from 'axios';

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 120_000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('hub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const body = response.data as {
      code?: number;
      message?: string;
      data?: unknown;
    };
    if (body && body.code === 200) {
      return body.data as never;
    }
    return Promise.reject(new Error(body?.message ?? '请求失败'));
  },
  (error) => {
    const status = error.response?.status as number | undefined;
    const raw = error.response?.data?.message ?? error.message ?? '网络错误';
    const message = Array.isArray(raw) ? raw.join('；') : String(raw);

    if (status === 401) {
      localStorage.removeItem('hub_token');
      localStorage.removeItem('hub_username');
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login';
      }
    }
    return Promise.reject(new Error(message));
  },
);

export async function get<T>(url: string, config?: unknown): Promise<T> {
  return (await http.get(url, config as never)) as unknown as T;
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  return (await http.post(url, data)) as unknown as T;
}

export async function patch<T>(url: string, data?: unknown): Promise<T> {
  return (await http.patch(url, data)) as unknown as T;
}

export async function del<T>(url: string): Promise<T> {
  return (await http.delete(url)) as unknown as T;
}

export default http;
