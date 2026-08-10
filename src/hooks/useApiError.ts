import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { isAxiosError } from 'axios';
import type { ApiFieldError } from '../types';

export interface FieldErrors {
  [field: string]: string;
}

interface ParsedApiError {
  /** General error message shown at the top of the form */
  general: string;
  /** Field-specific errors mapped to input names (lowercase, no spaces) */
  fields: FieldErrors;
}

/**
 * Parse Axios API errors into field-level and general messages.
 * Handles various backend error formats:
 * - Standard ASP.NET validation errors (errors property with field arrays)
 * - Simple message strings
 * - Field-level errors with field/message pairs
 * - Network errors / timeouts
 *
 * Messages produced by the hook itself are localized. Messages that come from
 * the backend are passed through untouched (the API contract is unchanged).
 */
export function useApiError() {
  const { t } = useTranslation();

  const parseError = useCallback(
    (err: unknown): ParsedApiError => {
      // Network / timeout errors
      if (isAxiosError(err)) {
        if (!err.response) {
          return {
            general: t('errors.network'),
            fields: {},
          };
        }

        const { response } = err;
        const data = response.data as Record<string, unknown> | undefined;

        if (data) {
          // Format 1: { success: false, message: "...", errors: [{ field: "email", message: "..." }] }
          if (data.errors && Array.isArray(data.errors)) {
            const fieldErrors: FieldErrors = {};
            let general = (data.message as string) || t('errors.validationFailed');

            for (const e of data.errors as ApiFieldError[]) {
              if (e.field) {
                const fieldKey = e.field.toLowerCase().replace(/\s+/g, '');
                fieldErrors[fieldKey] = e.message;
              }
            }

            return { general, fields: fieldErrors };
          }

          // Format 2: ASP.NET-style { errors: { "Email": ["...", "..."], "Password": ["..."] } }
          if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
            const errMap = data.errors as Record<string, string[]>;
            const fieldErrors: FieldErrors = {};
            for (const [field, messages] of Object.entries(errMap)) {
              if (Array.isArray(messages) && messages.length > 0) {
                fieldErrors[field.toLowerCase()] = messages[0];
              }
            }
            return {
              general: (data.message as string) || t('errors.invalidFields'),
              fields: fieldErrors,
            };
          }

          // Format 3: Simple message string
          if (data.message && typeof data.message === 'string') {
            const msg = data.message;
            return { general: msg, fields: inferFieldFromMessage(msg, t) };
          }
        }

        // HTTP status-based fallbacks
        if (response.status === 400) {
          return { general: t('errors.badRequest'), fields: {} };
        }
        if (response.status === 401) {
          return { general: t('errors.invalidCredentials'), fields: {} };
        }
        if (response.status === 403) {
          return { general: t('errors.forbidden'), fields: {} };
        }
        if (response.status >= 500) {
          return { general: t('errors.serverError'), fields: {} };
        }

        return { general: t('errors.unexpected'), fields: {} };
      }

      // Non-Axios errors
      if (err instanceof Error) {
        return { general: err.message, fields: {} };
      }

      return { general: t('errors.unexpected'), fields: {} };
    },
    [t]
  );

  return { parseError };
}

/**
 * Try to infer which field is invalid from a general error message.
 * Returns field-specific errors when the message matches known patterns.
 */
function inferFieldFromMessage(msg: string, t: TFunction): FieldErrors {
  const lower = msg.toLowerCase();
  const fields: FieldErrors = {};

  if (lower.includes('password')) {
    fields['password'] = msg;
  }
  if (lower.includes('email')) {
    fields['email'] = msg;
  }
  if (lower.includes('username') || lower.includes('user name')) {
    fields['username'] = msg;
  }
  if (lower.includes('employee') || lower.includes('employeeid') || lower.includes('employee id')) {
    fields['employeeid'] = msg;
  }
  if (lower.includes('credentials')) {
    fields['emailorusername'] = msg;
    fields['password'] = msg;
  }

  const loginFields = ['emailorusername', 'email', 'username'];
  if (loginFields.some((f) => fields[f])) {
    if (!fields['password']) {
      fields['password'] = t('errors.checkCredentials');
    }
  }

  return fields;
}
