export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  division: string;
  jobTitle: string;
  department: string;
  phoneNumber: string;
  createdAt: string;
  /** Relative path (e.g. "Profiles/...") of the linked user's profile picture, if any */
  profilePicturePath?: string | null;
}

export interface RegisterEmployeeDto {
  employeeId: string;
  fullName: string;
  division: string;
  jobTitle: string;
  department: string;
  phoneNumber: string;
}

export interface UpdateEmployeeDto {
  fullName: string;
  division: string;
  jobTitle: string;
  department: string;
  phoneNumber: string;
}
