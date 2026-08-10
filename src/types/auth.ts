import type { Employee } from './employee';

export interface LoginDto {
  emailOrUserName: string;
  password: string;
}

export interface RegisterUserDto {
  email: string;
  userName: string;
  password: string;
  employeeId: string;
}

export interface AuthResponse {
  token: string;
  expiration: string;
  user: CurrentUser;
  refreshToken: string | null;
}

export interface CurrentUser {
  userId: string;
  email: string | null;
  userName: string | null;
  employeeId: string;
  employee: Employee | null;
  roles: string[];
  profilePicturePath: string | null;
}

export interface RefreshTokenDto {
  refreshToken: string;
}
