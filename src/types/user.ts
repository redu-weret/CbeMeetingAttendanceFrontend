import type { Employee } from './employee';

export interface UserDto {
  id: string;
  email: string | null;
  userName: string | null;
  employeeId: string;
  employee: Employee | null;
  roles: string[];
  lockoutEnabled: boolean;
  lockoutEnd: string | null;
  accessFailedCount: number;
  profilePicturePath: string | null;
}

export interface AssignRoleDto {
  userId: string;
  roleName: string;
}

export interface ChangeRoleDto {
  userId: string;
  currentRole: string;
  newRole: string;
}

export interface RemoveRoleDto {
  userId: string;
  roleName: string;
}

export interface ChangePasswordDto {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDto {
  userId: string;
  newPassword: string;
}
