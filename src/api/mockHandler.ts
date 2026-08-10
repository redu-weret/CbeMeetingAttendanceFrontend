import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  mockEmployees,
  mockAttendanceRecords,
  getMockDashboardData,
  mockCurrentUser,
  mockUsers,
  mockToken,
  mockRefreshToken,
  delay,
  saveEmployees,
  saveAttendanceRecords,
  saveUsers,
  mockProfilePictures,
  saveProfilePictures,
  fileToDataUrl,
  getCurrentUserFromStorage,
} from './mockData';
import type {
  ApiResponse,
  AuthResponse,
  CurrentUser,
  Employee,
  AttendanceRecord,
  AttendanceCheckResult,
  UserDto,
} from '../types';

// ===== Helpers =====
function success<T>(data: T, message?: string, total?: number): ApiResponse<T> {
  return { success: true, message: message || null, total: total ?? null, data };
}

function fail(message: string): ApiResponse<null> {
  return { success: false, message, total: null, data: null };
}

function findEmployee(empId: string): Employee | undefined {
  return mockEmployees.find(
    (e) => e.employeeId.toLowerCase() === empId.toLowerCase() || e.id === empId
  );
}

function extractId(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1].split('?')[0];
}

/** Build CSV text from attendance records */
function buildCsvContent(): string {
  let csv = 'Employee ID,Full Name,Division,Job Title,Department,Phone Number,Meeting Date,Session,Attendance Time\n';
  for (const att of mockAttendanceRecords) {
    const emp = mockEmployees.find((e) => e.id === att.employeeId);
    csv += `"${att.employeeUniqueId}","${att.employeeFullName}","${emp?.division || ''}","${emp?.jobTitle || ''}","${att.department}","${emp?.phoneNumber || ''}","${att.meetingDate}","${att.session}","${att.attendanceTime}"\n`;
  }
  if (mockAttendanceRecords.length === 0) {
    csv += '\nNo attendance records found.\n';
  }
  return csv;
}

/** Build Excel (.xlsx) ArrayBuffer */
function buildExcelBuffer(): ArrayBuffer {
  const rows = mockAttendanceRecords.map((att) => {
    const emp = mockEmployees.find((e) => e.id === att.employeeId);
    return {
      'Employee ID': att.employeeUniqueId,
      'Full Name': att.employeeFullName,
      Division: emp?.division || '',
      'Job Title': emp?.jobTitle || '',
      Department: att.department,
      'Phone Number': emp?.phoneNumber || '',
      'Meeting Date': att.meetingDate,
      Session: att.session,
      'Attendance Time': att.attendanceTime,
    };
  });

  if (rows.length === 0) {
    rows.push({ 'Employee ID': '', 'Full Name': '', Division: '', 'Job Title': '', Department: '', 'Phone Number': '', 'Meeting Date': '', Session: '', 'Attendance Time': 'No records found.' });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

/** Build PDF ArrayBuffer */
function buildPdfBuffer(): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.text('CBE Meeting Attendance Report', 14, 20);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total records: ${mockAttendanceRecords.length}`, 14, 34);

  const headers = [['Employee ID', 'Full Name', 'Division', 'Department', 'Session', 'Date', 'Time']];
  const body = mockAttendanceRecords.map((att) => {
    const emp = mockEmployees.find((e) => e.id === att.employeeId);
    return [
      att.employeeUniqueId,
      att.employeeFullName,
      emp?.division || '',
      att.department,
      att.session,
      att.meetingDate,
      new Date(att.attendanceTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ];
  });

  if (body.length === 0) {
    body.push(['No attendance records found.', '', '', '', '', '', '']);
  }

  autoTable(doc, {
    head: headers,
    body,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 44, 87], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  return doc.output('arraybuffer');
}

// ===== Main handler =====
export async function mockHandler(
  config: AxiosRequestConfig
): Promise<AxiosResponse | null> {
  await delay();

  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';

  // ---------- Auth ----------
  // POST /users/login
  if (method === 'post' && url.endsWith('/users/login')) {
    const body = config.data ? JSON.parse(config.data) : {};
    const { emailOrUserName, password } = body;

    if (!emailOrUserName || !password) {
      return makeResponse(config, 400, fail('Email/Username and password are required.'));
    }

    if (password.length < 3) {
      return makeResponse(config, 400, fail('Invalid password.'));
    }

    if (password === 'wrongpassword') {
      return makeResponse(config, 401, fail('Invalid password.'));
    }

    if (emailOrUserName === 'unknown') {
      return makeResponse(config, 404, fail('User not found.'));
    }

    // Find the actual user in the persisted users array to get their real roles
    const foundUser = mockUsers.find(
      (u) =>
        (u.userName ?? '').toLowerCase() === emailOrUserName.toLowerCase() ||
        (u.email ?? '').toLowerCase() === emailOrUserName.toLowerCase()
    );

    let user: CurrentUser = foundUser
      ? {
          userId: foundUser.id,
          email: foundUser.email,
          userName: foundUser.userName,
          employeeId: foundUser.employeeId,
          employee: foundUser.employee,
          roles: foundUser.roles,
          profilePicturePath: foundUser.profilePicturePath ?? mockProfilePictures[foundUser.id] ?? null,
        }
      : {
          ...mockCurrentUser,
          userName: emailOrUserName,
          // A previously uploaded picture must survive sign-out / sign-in even
          // when the user record is missing from the persisted user list
          profilePicturePath: mockProfilePictures[mockCurrentUser.userId] ?? null,
        };

    // Self-heal stale demo data: persist the logged-in user so their account,
    // roles and picture survive sign-out / sign-in and show in admin lists.
    if (!mockUsers.some((u) => u.id === user.userId)) {
      mockUsers.push({
        id: user.userId,
        email: user.email,
        userName: user.userName,
        employeeId: user.employeeId,
        employee: user.employee,
        roles: user.roles,
        lockoutEnabled: false,
        lockoutEnd: null,
        accessFailedCount: 0,
        profilePicturePath: user.profilePicturePath,
      });
      saveUsers();
    }

    const authResponse: AuthResponse = {
      token: mockToken,
      expiration: new Date(Date.now() + 86400000).toISOString(),
      user,
      refreshToken: mockRefreshToken,
    };
    return makeResponse(config, 200, success(authResponse, 'Login successful'));
  }

  // POST /users/register
  if (method === 'post' && url.endsWith('/users/register')) {
    const body = config.data ? JSON.parse(config.data) : {};
    const { email, userName, password, employeeId } = body;

    if (!email) return makeResponse(config, 400, fail('Email is required.'));
    if (!userName) return makeResponse(config, 400, fail('Username is required.'));
    if (!password || password.length < 6)
      return makeResponse(config, 400, fail('Password must be at least 6 characters.'));
    if (!employeeId) return makeResponse(config, 400, fail('Employee ID is required.'));

    if (!findEmployee(employeeId)) {
      return makeResponse(config, 400, fail('Employee ID not found.'));
    }

    // Add user to persisted users array
    const emp = findEmployee(employeeId)!;
    const newUser: UserDto = {
      id: `user-${Date.now()}`,
      email,
      userName,
      employeeId: emp.id,
      employee: emp,
      roles: ['Staff'],
      lockoutEnabled: false,
      lockoutEnd: null,
      accessFailedCount: 0,
      profilePicturePath: null,
    };
    mockUsers.push(newUser);
    saveUsers();

    const authResponse: AuthResponse = {
      token: mockToken,
      expiration: new Date(Date.now() + 86400000).toISOString(),
      user: {
        userId: newUser.id,
        email: newUser.email,
        userName: newUser.userName,
        employeeId: newUser.employeeId,
        employee: newUser.employee,
        roles: newUser.roles,
        profilePicturePath: null,
      },
      refreshToken: mockRefreshToken,
    };
    return makeResponse(config, 200, success(authResponse, 'Registration successful'));
  }

  // POST /users/logout
  if (method === 'post' && url.endsWith('/users/logout')) {
    return makeResponse(config, 200, success(true, 'Logged out'));
  }

  // GET /users/me
  if (method === 'get' && url.endsWith('/users/me')) {
    const stored = localStorage.getItem('auth_user');
    const user = stored ? JSON.parse(stored) : mockCurrentUser;
    return makeResponse(config, 200, success({ token: mockToken, expiration: '', user, refreshToken: null }));
  }

  // ---------- Employees ----------
  // GET /employees
  if (method === 'get' && url.endsWith('/employees') && !url.includes('/employees/')) {
    // Merge the linked user's profile picture path into each employee record
    const withPictures = mockEmployees.map((emp) => ({
      ...emp,
      profilePicturePath: getEmployeeProfilePicturePath(emp),
    }));
    return makeResponse(config, 200, success(withPictures, 'Employees retrieved', mockEmployees.length));
  }

  // GET /employees/:id (check status)
  const checkMatch = url.match(/\/employees\/([^/]+)$/);
  if (method === 'get' && checkMatch) {
    const empId = checkMatch[1];
    const emp = findEmployee(empId);
    if (!emp) {
      return makeResponse(config, 404, fail(`No employee found with ID "${empId}".`));
    }
    const today = new Date().toISOString().slice(0, 10);
    const session = new Date().getHours() < 12 ? 'Morning' : 'Afternoon';
    const alreadyAttended = mockAttendanceRecords.some(
      (a) => a.employeeId === emp.id && a.meetingDate === today && a.session === session
    );
    const result: AttendanceCheckResult = {
      id: emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      division: emp.division,
      jobTitle: emp.jobTitle,
      department: emp.department,
      phoneNumber: emp.phoneNumber,
      meetingDate: today,
      session,
      isAttended: alreadyAttended,
      attendanceTime: alreadyAttended ? new Date().toISOString() : null,
    };
    return makeResponse(config, 200, success(result));
  }

  // GET /employee/:id (get by id)
  const getMatch = url.match(/\/employee\/([^/]+)$/);
  if (method === 'get' && getMatch) {
    const emp = mockEmployees.find((e) => e.id === getMatch[1] || e.employeeId === getMatch[1]);
    if (!emp) return makeResponse(config, 404, fail('Employee not found'));
    // Merge the linked user's profile picture, matching the list endpoint
    return makeResponse(config, 200, success({ ...emp, profilePicturePath: getEmployeeProfilePicturePath(emp) }));
  }

  // POST /employees/register
  if (method === 'post' && url.endsWith('/employees/register')) {
    const body = config.data ? JSON.parse(config.data) : {};
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      employeeId: body.employeeId || `EMP${String(mockEmployees.length + 1).padStart(3, '0')}`,
      fullName: body.fullName || 'New Employee',
      division: body.division || 'General',
      jobTitle: body.jobTitle || 'Staff',
      department: body.department || 'General',
      phoneNumber: body.phoneNumber || '+251-000-000000',
      createdAt: new Date().toISOString(),
      profilePicturePath: null,
    };
    mockEmployees.push(newEmp);
    saveEmployees();
    return makeResponse(config, 201, success(newEmp, 'Employee registered successfully'));
  }

  // PUT /employee/:id
  if (method === 'put' && url.includes('/employee/')) {
    const empId = extractId(url);
    const emp = mockEmployees.find((e) => e.id === empId);
    if (!emp) return makeResponse(config, 404, fail('Employee not found'));
    const body = config.data ? JSON.parse(config.data) : {};
    Object.assign(emp, body);
    saveEmployees();
    return makeResponse(config, 200, success(emp, 'Employee updated successfully'));
  }

  // DELETE /employee/:id
  if (method === 'delete' && url.includes('/employee/')) {
    const empId = extractId(url);
    const idx = mockEmployees.findIndex((e) => e.id === empId);
    if (idx === -1) return makeResponse(config, 404, fail('Employee not found'));
    mockEmployees.splice(idx, 1);
    saveEmployees();
    return makeResponse(config, 200, success(true, 'Employee deleted successfully'));
  }

  // ---------- Attendance ----------
  // GET /attendance/check?employeeId=...
  if (method === 'get' && url.includes('/attendance/check')) {
    const empId = new URL(url, 'http://localhost').searchParams.get('employeeId') || '';
    const emp = findEmployee(empId);
    if (!emp) return makeResponse(config, 404, fail(`No employee found with ID "${empId}".`));
    const today = new Date().toISOString().slice(0, 10);
    const session = new Date().getHours() < 12 ? 'Morning' : 'Afternoon';
    const alreadyAttended = mockAttendanceRecords.some(
      (a) => a.employeeId === emp.id && a.meetingDate === today && a.session === session
    );
    const result: AttendanceCheckResult = {
      id: emp.id,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      division: emp.division,
      jobTitle: emp.jobTitle,
      department: emp.department,
      phoneNumber: emp.phoneNumber,
      meetingDate: today,
      session,
      isAttended: alreadyAttended,
      attendanceTime: alreadyAttended ? new Date().toISOString() : null,
    };
    return makeResponse(config, 200, success(result));
  }

  // POST /attendance
  if (method === 'post' && url.endsWith('/attendance')) {
    const body = config.data ? JSON.parse(config.data) : {};
    const emp = findEmployee(body.employeeId);
    if (!emp) return makeResponse(config, 404, fail('Employee not found'));
    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: emp.id,
      employeeUniqueId: emp.employeeId,
      employeeFullName: emp.fullName,
      department: emp.department,
      meetingDate: body.meetingDate || new Date().toISOString().slice(0, 10),
      session: body.session || (new Date().getHours() < 12 ? 'Morning' : 'Afternoon'),
      attendanceTime: new Date().toISOString(),
    };
    mockAttendanceRecords.unshift(record);
    saveAttendanceRecords();
    return makeResponse(config, 201, success(record, 'Attendance recorded'));
  }

  // ---------- Dashboard ----------
  // GET /admin/dashboard
  if (method === 'get' && url.endsWith('/admin/dashboard')) {
    return makeResponse(config, 200, success(getMockDashboardData()));
  }

  // ---------- Reports / Export ----------
  // GET /admin/export/excel?format=excel|csv|pdf
  if (method === 'get' && url.includes('/admin/export/')) {
    const params = new URL(url, 'http://localhost').searchParams;
    const format = (params.get('format') || 'csv').toLowerCase();

    let blob: Blob;
    let mimeType: string;
    let ext: string;

    if (format === 'pdf') {
      const buffer = buildPdfBuffer();
      blob = new Blob([buffer], { type: 'application/pdf' });
      mimeType = 'application/pdf';
      ext = 'pdf';
    } else if (format === 'csv') {
      const content = buildCsvContent();
      blob = new Blob([content], { type: 'text/csv' });
      mimeType = 'text/csv';
      ext = 'csv';
    } else {
      // Default: Excel
      const buffer = buildExcelBuffer();
      blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      ext = 'xlsx';
    }

    const fileName = `AttendanceReport_${new Date().toISOString().slice(0, 10)}.${ext}`;

    return {
      data: blob,
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': mimeType,
        'content-disposition': `attachment; filename="${fileName}"`,
      },
      config,
    } as AxiosResponse;
  }

  // ---------- Users ----------
  // GET /users
  if (method === 'get' && url.endsWith('/users') && !url.includes('/users/')) {
    // Merge the stored picture data URL so the admin list always shows it
    // (falls back per user even if a user record is stale), and return a
    // copy so React sees a new reference and re-renders
    const withPictures = mockUsers.map((u) => ({
      ...u,
      profilePicturePath: u.profilePicturePath ?? mockProfilePictures[u.id] ?? null,
    }));
    return makeResponse(config, 200, success(withPictures, 'Users retrieved', mockUsers.length));
  }

  // GET /users/:id
  const userGetMatch = method === 'get' && url.match(/\/users\/([^/]+)$/);
  if (userGetMatch) {
    const user = mockUsers.find((u) => u.id === userGetMatch[1]);
    if (!user) return makeResponse(config, 404, fail('User not found'));
    return makeResponse(config, 200, success(user));
  }

  // POST /users/assign-role
  if (method === 'post' && url.endsWith('/users/assign-role')) {
    const body = config.data ? JSON.parse(config.data) : {};
    const user = mockUsers.find((u) => u.id === body.userId);
    if (user && body.roleName && !user.roles.includes(body.roleName)) {
      user.roles.push(body.roleName);
      saveUsers();
    }
    return makeResponse(config, 200, success(true, 'Role assigned successfully'));
  }

  // POST /users/change-role
  if (method === 'post' && url.endsWith('/users/change-role')) {
    const body = config.data ? JSON.parse(config.data) : {};
    const user = mockUsers.find((u) => u.id === body.userId);
    if (user && body.currentRole && body.newRole) {
      const idx = user.roles.indexOf(body.currentRole);
      if (idx !== -1) {
        user.roles[idx] = body.newRole;
        saveUsers();
      }
    }
    return makeResponse(config, 200, success(true, 'Role changed successfully'));
  }

  // POST /users/remove-role
  if (method === 'post' && url.endsWith('/users/remove-role')) {
    const body = config.data ? JSON.parse(config.data) : {};
    const user = mockUsers.find((u) => u.id === body.userId);
    if (user && body.roleName) {
      user.roles = user.roles.filter((r) => r !== body.roleName);
      saveUsers();
    }
    return makeResponse(config, 200, success(true, 'Role removed successfully'));
  }

  // POST /users/change-password
  if (method === 'post' && url.endsWith('/users/change-password')) {
    return makeResponse(config, 200, success(true, 'Password changed successfully'));
  }

  // POST /users/reset-password
  if (method === 'post' && url.endsWith('/users/reset-password')) {
    return makeResponse(config, 200, success(true, 'Password reset successfully'));
  }

  // DELETE /users/me
  const deleteMeMatch = method === 'delete' && url.endsWith('/users/me');
  if (deleteMeMatch) {
    return makeResponse(config, 200, success(true, 'Account deleted successfully'));
  }

  // DELETE /users/:id
  const userDeleteMatch = method === 'delete' && url.match(/\/users\/([^/]+)$/);
  if (userDeleteMatch) {
    const id = userDeleteMatch[1];
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx !== -1) {
      mockUsers.splice(idx, 1);
      saveUsers();
    }
    delete mockProfilePictures[id];
    saveProfilePictures();
    return makeResponse(config, 200, success(true, 'User deleted successfully'));
  }

  // ---------- Profile Pictures ----------
  // POST /users/:id/profile-picture (upload)
  const profileUploadMatch = method === 'post' && url.match(/\/users\/([^/]+)\/profile-picture$/);
  if (profileUploadMatch) {
    return handleProfilePictureUpload(config, profileUploadMatch[1], 'uploaded');
  }

  // PUT /users/:id/profile-picture (update / replace)
  const profileUpdateMatch = method === 'put' && url.match(/\/users\/([^/]+)\/profile-picture$/);
  if (profileUpdateMatch) {
    return handleProfilePictureUpload(config, profileUpdateMatch[1], 'updated');
  }

  // GET /users/:id/profile-picture
  const profileGetMatch = method === 'get' && url.match(/\/users\/([^/]+)\/profile-picture$/);
  if (profileGetMatch) {
    const id = profileGetMatch[1];
    const dataUrl = mockProfilePictures[id];
    if (!dataUrl) {
      return makeResponse(config, 404, fail('This user has no profile picture.'));
    }
    return makeResponse(config, 200, success(dataUrl, 'Profile picture path retrieved'));
  }

  // DELETE /users/:id/profile-picture
  const profileDeleteMatch = method === 'delete' && url.match(/\/users\/([^/]+)\/profile-picture$/);
  if (profileDeleteMatch) {
    const id = profileDeleteMatch[1];
    delete mockProfilePictures[id];
    saveProfilePictures();
    return makeResponse(config, 200, success(true, 'Profile picture deleted successfully'));
  }

  // ---------- Fallback ----------
  console.warn(`[Mock] Unhandled route: ${method.toUpperCase()} ${url}`);
  return null;
}

// ===== Profile picture helpers =====
/** Find the linked user's profile picture for an employee (mock join). */
function getEmployeeProfilePicturePath(emp: Employee): string | null {
  const user = mockUsers.find(
    (u) => u.employeeId === emp.id || u.employeeId === emp.employeeId
  );
  if (user) {
    return user.profilePicturePath ?? mockProfilePictures[user.id] ?? null;
  }
  // Fallback: the logged-in user may be missing from the persisted user list
  // (stale demo data) — always show their picture on their own employee row.
  const stored = getCurrentUserFromStorage();
  if (stored && (stored.employeeId === emp.id || stored.employeeId === emp.employeeId)) {
    return stored.profilePicturePath ?? null;
  }
  return null;
}

interface MockUploadPayload {
  file?: string; // data URL
  fileName?: string;
  size?: number;
  type?: string;
}

async function handleProfilePictureUpload(
  config: AxiosRequestConfig,
  userId: string,
  verb: 'uploaded' | 'updated'
): Promise<AxiosResponse> {
  // The payload can be a real FormData (direct mock calls) or the serialized
  // JSON object produced by the request interceptor in mock mode.
  const formData = config.data instanceof FormData ? (config.data as FormData) : null;
  const file = formData?.get('file');

  let payload: MockUploadPayload = {};
  if (typeof config.data === 'string') {
    try {
      payload = JSON.parse(config.data) as MockUploadPayload;
    } catch {
      payload = {};
    }
  } else if (config.data && typeof config.data === 'object') {
    payload = config.data as MockUploadPayload;
  }

  let dataUrl: string | null = null;
  let fileName = '';
  let fileSize = 0;
  let fileType = '';

  if (file instanceof File) {
    dataUrl = await fileToDataUrl(file);
    fileName = file.name;
    fileSize = file.size;
    fileType = file.type;
  } else if (typeof payload.file === 'string' && payload.file.startsWith('data:')) {
    dataUrl = payload.file;
    fileName = payload.fileName || '';
    fileSize = payload.size || 0;
    fileType = payload.type || '';
  }

  if (!dataUrl) {
    return makeResponse(config, 400, fail('No file was uploaded.'));
  }

  if (fileSize > 5 * 1024 * 1024) {
    return makeResponse(config, 400, fail('Profile picture must be 5 MB or smaller.'));
  }

  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    return makeResponse(config, 400, fail('Only .jpg, .jpeg, .png and .webp images are allowed.'));
  }

  if (fileType && !fileType.startsWith('image/')) {
    return makeResponse(config, 400, fail('The uploaded file is not a valid image.'));
  }

  // Mock equivalent of "read image into byte[] and save it" — persist as a data URL
  mockProfilePictures[userId] = dataUrl;
  saveProfilePictures();

  // Keep the persisted user in sync so the admin user list shows the picture
  const userRecord = mockUsers.find((u) => u.id === userId);
  if (userRecord) {
    userRecord.profilePicturePath = dataUrl;
    saveUsers();
  }

  // Keep the persisted auth session in sync so GET /users/me returns the
  // fresh picture even when the user record above is missing/stale
  const storedAuth = getCurrentUserFromStorage();
  if (storedAuth && storedAuth.userId === userId) {
    storedAuth.profilePicturePath = dataUrl;
    localStorage.setItem('auth_user', JSON.stringify(storedAuth));
  }

  const currentUser = getCurrentUserFromMock(userId);
  if (currentUser) {
    currentUser.profilePicturePath = dataUrl;
  }

  return makeResponse(config, 200, success(currentUser, `Profile picture ${verb} successfully`));
}

function getCurrentUserFromMock(userId: string): CurrentUser | null {
  const userRecord = mockUsers.find((u) => u.id === userId);
  if (userRecord) {
    return {
      userId: userRecord.id,
      email: userRecord.email,
      userName: userRecord.userName,
      employeeId: userRecord.employeeId,
      employee: userRecord.employee,
      roles: userRecord.roles,
      profilePicturePath: mockProfilePictures[userId] ?? userRecord.profilePicturePath ?? null,
    };
  }
  // Fallback: the logged-in user may not exist in the persisted user list
  // (e.g. stale localStorage from an earlier session). An upload that already
  // succeeded must never come back as null — return the stored auth user.
  const stored = getCurrentUserFromStorage();
  if (stored && stored.userId === userId) {
    return { ...stored };
  }
  return null;
}

// ===== Response builder =====
function makeResponse(
  config: AxiosRequestConfig,
  status: number,
  data: unknown
): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'content-type': 'application/json' },
    config,
  } as AxiosResponse;
}
