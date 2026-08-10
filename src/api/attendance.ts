import apiClient from './client';
import type {
  ApiResponse,
  AttendanceRecord,
  AttendanceCheckResult,
  TakeAttendanceDto,
  DashboardData,
} from '../types';

export const attendanceApi = {
  check: async (employeeId: string, date?: string, session?: string) => {
    const params = new URLSearchParams({ employeeId });
    if (date) params.append('date', date);
    if (session) params.append('session', session);
    const response = await apiClient.get<ApiResponse<AttendanceCheckResult>>(
      `/attendance/check?${params.toString()}`
    );
    return response.data;
  },

  take: async (dto: TakeAttendanceDto) => {
    const response = await apiClient.post<ApiResponse<AttendanceRecord>>('/attendance', dto);
    return response.data;
  },

  getDashboard: async () => {
    const response = await apiClient.get<ApiResponse<DashboardData>>('/admin/dashboard');
    return response.data;
  },

  exportData: async (format: 'excel' | 'csv' | 'pdf' = 'excel') => {
    const response = await apiClient.get(`/admin/export/excel?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
