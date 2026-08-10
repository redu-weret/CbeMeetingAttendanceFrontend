import apiClient from './client';
import type {
  ApiResponse,
  Employee,
  RegisterEmployeeDto,
  UpdateEmployeeDto,
} from '../types';

export const employeeApi = {
  getAll: async () => {
    const response = await apiClient.get<ApiResponse<Employee[]>>('/employees');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Employee>>(`/employee/${id}`);
    return response.data;
  },

  register: async (dto: RegisterEmployeeDto) => {
    const response = await apiClient.post<ApiResponse<Employee>>('/employees/register', dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateEmployeeDto) => {
    const response = await apiClient.put<ApiResponse<Employee>>(`/employee/${id}`, dto);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/employee/${id}`);
    return response.data;
  },

  checkStatus: async (employeeId: string) => {
    const response = await apiClient.get<ApiResponse<import('../types').AttendanceCheckResult>>(
      `/employees/${employeeId}`
    );
    return response.data;
  },
};
