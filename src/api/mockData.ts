import type {
  Employee,
  AttendanceRecord,
  DashboardData,
  CurrentUser,
  UserDto,
} from '../types';

// ===== localStorage keys =====
const LS_EMPLOYEES = 'mock_employees';
const LS_ATTENDANCE = 'mock_attendance';
const LS_USERS = 'mock_users';

// ===== Seed data for first-time load =====
const seedEmployees: Employee[] = [
  {
    id: 'emp-admin',
    employeeId: 'EMP001',
    fullName: 'System Admin',
    division: 'Administration',
    jobTitle: 'Administrator',
    department: 'IT',
    phoneNumber: '+251-911-000000',
    createdAt: '2024-01-01T08:00:00Z',
    profilePicturePath: null,
  },
];

const seedUsers: UserDto[] = [
  {
    id: 'user-admin-001',
    email: 'admin@cbe.com.et',
    userName: 'admin',
    employeeId: 'EMP001',
    employee: seedEmployees[0],
    roles: ['Admin'],
    lockoutEnabled: false,
    lockoutEnd: null,
    accessFailedCount: 0,
    profilePicturePath: null,
  },
];

// ===== Load from localStorage or seed =====
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // Save fallback so it's available on next load
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

// ===== Persist to localStorage =====
function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* storage full — ignore */ }
}

// ===== Mock Employees =====
export const mockEmployees: Employee[] = loadFromStorage(LS_EMPLOYEES, seedEmployees);

export function saveEmployees() {
  saveToStorage(LS_EMPLOYEES, mockEmployees);
}

// ===== Mock Attendance Records =====
export const mockAttendanceRecords: AttendanceRecord[] = loadFromStorage(LS_ATTENDANCE, []);

export function saveAttendanceRecords() {
  saveToStorage(LS_ATTENDANCE, mockAttendanceRecords);
}

// ===== Mock Users =====
export const mockUsers: UserDto[] = loadFromStorage(LS_USERS, seedUsers);

export function saveUsers() {
  saveToStorage(LS_USERS, mockUsers);
}

// ===== Mock Dashboard Data (computed from live arrays) =====
export function getMockDashboardData(): DashboardData {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = mockAttendanceRecords.filter((r) => r.meetingDate === today);
  const morningCount = todayRecords.filter((r) => r.session === 'Morning').length;
  const afternoonCount = todayRecords.filter((r) => r.session === 'Afternoon').length;
  const uniquePresent = new Set(todayRecords.map((r) => r.employeeId)).size;
  const totalEmp = mockEmployees.length;
  const rate = totalEmp > 0 ? Math.round((uniquePresent / totalEmp) * 100) : 0;

  return {
    totalEmployees: totalEmp,
    todayMorningCount: morningCount,
    todayAfternoonCount: afternoonCount,
    todayAttendanceRate: rate,
    recentAttendances: [...mockAttendanceRecords].slice(0, 8),
  };
}

// ===== Mock Current User (admin) =====
// Reference the live mockEmployees array so edits to the admin employee are reflected
export const mockCurrentUser: CurrentUser = {
  userId: 'user-admin-001',
  email: 'admin@cbe.com.et',
  userName: 'admin',
  employeeId: 'EMP001',
  employee: mockEmployees[0],
  roles: ['Admin'],
  profilePicturePath: null,
};

// ===== Mock Profile Pictures =====
// Store uploaded images as data URLs in localStorage so they survive reloads.
const LS_PROFILE_PICTURES = 'mock_profile_pictures';

function loadProfilePictures(): Record<string, string> {
  try {
    const stored = localStorage.getItem(LS_PROFILE_PICTURES);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export const mockProfilePictures: Record<string, string> = loadProfilePictures();

export function saveProfilePictures() {
  try {
    localStorage.setItem(LS_PROFILE_PICTURES, JSON.stringify(mockProfilePictures));
  } catch {
    /* storage full — ignore */
  }
}

/** Read an uploaded File as a data URL (mock backend equivalent of byte[]) */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ===== Mock Auth Token =====
export const mockToken = 'mock-jwt-token';
export const mockRefreshToken = 'mock-refresh-token';

// ===== Utility: simulate network delay =====
export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

// ===== Utility: check auth =====
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

export function getCurrentUserFromStorage(): CurrentUser | null {
  try {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
