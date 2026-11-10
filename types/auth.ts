export type Role = 'owner' | 'pj_klinik' | 'resepsionis' | 'terapis';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive';
  role: Role;
  last_login: string | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    data: T[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    links: {
      first: string | null;
      last: string | null;
      prev: string | null;
      next: string | null;
    };
  };
}

// Role-based redirect map
export const ROLE_REDIRECT: Record<Role, string> = {
  owner:        '/dashboard',
  pj_klinik:   '/dashboard',
  resepsionis: '/dashboard',
  terapis:     '/dashboard',
};

// Role-based access map
// /dashboard kini dapat diakses semua role
export const ROLE_ACCESS: Record<string, Role[]> = {
  '/dashboard':       ['owner', 'pj_klinik', 'resepsionis', 'terapis'],
  '/profile':         ['owner', 'pj_klinik', 'resepsionis', 'terapis'],
  '/patients':        ['owner', 'pj_klinik', 'resepsionis'],
  '/appointments':    ['owner', 'pj_klinik', 'resepsionis'],
  '/visits':          ['owner', 'pj_klinik', 'resepsionis', 'terapis'],
  '/medical-records': ['owner', 'pj_klinik', 'terapis'],
  '/billing':         ['owner', 'pj_klinik', 'resepsionis'],
  '/users':           ['owner', 'pj_klinik'],
  '/reports':         ['owner', 'pj_klinik'],
  '/settings':        ['owner'],
  '/service-pricing': ['owner'],
  '/revenue-distributions': ['owner'],
  '/therapist-recap': ['resepsionis'],
};