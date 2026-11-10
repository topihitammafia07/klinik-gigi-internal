import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle auth expiry and clinic maintenance
// PENTING: skip redirect jika request berasal dari /auth/login itu sendiri,
// karena login yang gagal juga return 401 dan tidak boleh menyebabkan page refresh.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');

    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const isClinicClosed =
      error.response?.status === 503 && error.response?.data?.code === 'CLINIC_CLOSED';

    if (isClinicClosed && typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('auth_user');
        const currentUser = storedUser ? JSON.parse(storedUser) as { role?: string } : null;

        if (currentUser?.role !== 'owner') {
          sessionStorage.setItem(
            'clinic_closed_message',
            error.response?.data?.message ?? 'Klinik sedang tidak beroperasi.',
          );
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/login';
        }
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;