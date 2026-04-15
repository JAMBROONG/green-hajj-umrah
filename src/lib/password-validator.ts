/**
 * Server-side password strength validation.
 * Apply on every endpoint that sets or changes a password.
 */

export interface PasswordValidation {
  valid: boolean;
  message: string;
}

/**
 * Validates password strength.
 *
 * Requirements:
 *  - Minimum 8 characters
 *  - At least one uppercase letter (A–Z)
 *  - At least one lowercase letter (a–z)
 *  - At least one digit (0–9)
 *  - At least one special character (anything that is not a letter or digit)
 */
export function validatePasswordStrength(password: string): PasswordValidation {
  if (password.length < 8) {
    return { valid: false, message: 'Kata sandi minimal 8 karakter.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Kata sandi harus mengandung minimal 1 huruf kapital (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Kata sandi harus mengandung minimal 1 huruf kecil (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Kata sandi harus mengandung minimal 1 angka (0-9).' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Kata sandi harus mengandung minimal 1 karakter spesial (contoh: !@#$%^&*).',
    };
  }
  return { valid: true, message: '' };
}
