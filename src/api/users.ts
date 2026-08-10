import apiClient from './client';
import type {
  ApiResponse,
  UserDto,
  AssignRoleDto,
  ChangeRoleDto,
  RemoveRoleDto,
  ChangePasswordDto,
  ResetPasswordDto,
} from '../types';

export const userApi = {
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<UserDto[]>>('/users');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<UserDto>>(`/users/${id}`);
    return response.data;
  },

  assignRole: async (dto: AssignRoleDto) => {
    const response = await apiClient.post<ApiResponse<boolean>>('/users/assign-role', dto);
    return response.data;
  },

  changeRole: async (dto: ChangeRoleDto) => {
    const response = await apiClient.post<ApiResponse<boolean>>('/users/change-role', dto);
    return response.data;
  },

  removeRole: async (dto: RemoveRoleDto) => {
    const response = await apiClient.post<ApiResponse<boolean>>('/users/remove-role', dto);
    return response.data;
  },

  changePassword: async (dto: ChangePasswordDto) => {
    const response = await apiClient.post<ApiResponse<boolean>>('/users/change-password', dto);
    return response.data;
  },

  resetPassword: async (dto: ResetPasswordDto) => {
    const response = await apiClient.post<ApiResponse<boolean>>('/users/reset-password', dto);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/users/${id}`);
    return response.data;
  },

  /** Delete the currently authenticated user's own account */
  deleteCurrentUser: async () => {
    const response = await apiClient.delete<ApiResponse<boolean>>('/users/me');
    return response.data;
  },
};
