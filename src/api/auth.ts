import apiClient from './client';
import type {
  ApiResponse,
  AuthResponse,
  LoginDto,
  RegisterUserDto,
  RefreshTokenDto,
} from '../types';

export const authApi = {
  login: async (dto: LoginDto) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/users/login', dto);
    return response.data;
  },

  register: async (dto: RegisterUserDto) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/users/register', dto);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post<ApiResponse<boolean>>('/users/logout');
    return response.data;
  },

  refresh: async (dto: RefreshTokenDto) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/users/refresh', dto);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<ApiResponse<AuthResponse>>('/users/me');
    return response.data;
  },
};
