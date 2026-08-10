// ===== Generic API Response =====
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  total: number | null;
  data: T | null;
}

// ===== API Error with field-level details =====
export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string | null;
  errors?: ApiFieldError[] | Record<string, string[]>;
}
