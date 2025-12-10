import api from './api';
import Cookies from 'js-cookie';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  companyName: string;
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  manager: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authApi = {
  /**
   * Login user
   */
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    const { accessToken, refreshToken } = response.data;

    // Store tokens in cookies
    Cookies.set('accessToken', accessToken, { expires: 7 });
    Cookies.set('refreshToken', refreshToken, { expires: 30 });

    return response.data;
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<{message: string}> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * Request password reset
   */
  async forgotPassword(data: ForgotPasswordData): Promise<{message: string}> {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      // Clear tokens regardless of API response
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
