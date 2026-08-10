import apiClient from './client';
import type { ApiResponse, CurrentUser } from '../types';

// Allowed image types and maximum size (5 MB) — mirrored from the backend validation
export const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/** Client-side validation shared by the Profile page. Returns an error message or null. */
export function validateProfilePicture(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) || !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return 'Only JPG, JPEG, PNG and WEBP images are allowed.';
  }
  if (file.size > MAX_PROFILE_PICTURE_SIZE) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

/**
 * Build the full URL for a profile picture.
 * Backend stores a relative path like "Profiles/8f23c7d4.jpg" which is served
 * from wwwroot (dev: via the Vite proxy). Data/blob URLs pass through as-is.
 */
export function profilePictureUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) {
    return path;
  }
  return `/${path.replace(/^\/+/, '')}`;
}

/** Build multipart/form-data payload with the image file */
function buildFormData(file: File): FormData {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export const profileApi = {
  /** Upload a new profile picture (multipart/form-data) */
  upload: async (userId: string, file: File) => {
    const response = await apiClient.post<ApiResponse<CurrentUser>>(
      `/users/${userId}/profile-picture`,
      buildFormData(file)
    );
    return response.data;
  },

  /** Update / replace an existing profile picture (multipart/form-data) */
  update: async (userId: string, file: File) => {
    const response = await apiClient.put<ApiResponse<CurrentUser>>(
      `/users/${userId}/profile-picture`,
      buildFormData(file)
    );
    return response.data;
  },

  /** Get the stored profile picture path */
  get: async (userId: string) => {
    const response = await apiClient.get<ApiResponse<string>>(`/users/${userId}/profile-picture`);
    return response.data;
  },

  /** Delete the profile picture */
  remove: async (userId: string) => {
    const response = await apiClient.delete<ApiResponse<boolean>>(`/users/${userId}/profile-picture`);
    return response.data;
  },
};
