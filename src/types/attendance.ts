export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeUniqueId: string;
  employeeFullName: string;
  department: string;
  meetingDate: string;
  session: string;
  attendanceTime: string;
}

export interface TakeAttendanceDto {
  employeeId: string;
  meetingDate?: string;
  session?: string;
}

export interface AttendanceCheckResult {
  id: string;
  employeeId: string;
  fullName: string;
  division: string;
  jobTitle: string;
  department: string;
  phoneNumber: string;
  meetingDate: string;
  session: string;
  isAttended: boolean;
  attendanceTime: string | null;
}

export interface DashboardData {
  totalEmployees: number;
  todayMorningCount: number;
  todayAfternoonCount: number;
  todayAttendanceRate: number;
  recentAttendances: AttendanceRecord[];
}
