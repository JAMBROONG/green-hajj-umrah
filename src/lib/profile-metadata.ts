/**
 * Schema validator untuk profiles.metadata.
 *
 * Field metadata adalah JSON kolom — tanpa validasi, attacker bisa nyisipin
 * key apapun (mis. {is_admin: true, role_override: "..."}) lewat endpoint
 * yang menulis metadata. Walaupun kolom JSON itu sendiri tidak dipakai
 * untuk authorization saat ini, file lain (cert generator, audit log,
 * UI render) bisa secara tidak sengaja trust nilai-nilai itu.
 *
 * Solusi: ALLOWLIST KEY EKSPLISIT. Semua key di luar allowlist akan di-strip
 * saat sanitize. Setiap key punya validator type sendiri.
 */

const PHONE_RE = /^[+0-9\s().-]{6,20}$/;

interface FieldSpec {
  validate: (v: unknown) => boolean;
  /** Optional sanitizer: trim, lowercase, dll. */
  sanitize?: (v: unknown) => unknown;
}

const ALLOWED_FIELDS: Record<string, FieldSpec> = {
  avatar_url: {
    // Validasi mendalam (SSRF) di-handle oleh validateAvatarUrl di endpoint
    // avatar. Di sini cukup type & length cap.
    validate: (v) => v === null || (typeof v === 'string' && v.length <= 2048),
  },
  phone: {
    validate: (v) => v === null || (typeof v === 'string' && PHONE_RE.test(v.trim())),
    sanitize: (v) => (typeof v === 'string' ? v.trim() : v),
  },
  address: {
    validate: (v) => v === null || (typeof v === 'string' && v.length <= 500),
    sanitize: (v) => (typeof v === 'string' ? v.trim() : v),
  },
  terms_accepted_at: {
    validate: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v),
  },
  terms_version: {
    validate: (v) => typeof v === 'string' && v.length <= 20 && /^[\w.-]+$/.test(v),
  },
  // Reset password / OTP timestamps — internal, hanya di-set oleh server.
  // Tetap di-allowlist supaya tidak ke-strip saat operasi merge.
  last_login_at: {
    validate: (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v),
  },
};

const ALLOWED_KEYS = new Set(Object.keys(ALLOWED_FIELDS));

/**
 * Strip key yang tidak ada di allowlist + drop value yang gagal validate.
 * Pakai ini saat menulis ulang metadata ke DB.
 *
 * @param current  metadata existing dari DB (read-only)
 * @param patch    perubahan yang user request (boleh null untuk hapus key)
 * @returns object metadata yang aman untuk disimpan
 */
export function mergeAndSanitizeMetadata(
  current: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    typeof current === 'object' && current !== null ? { ...(current as Record<string, unknown>) } : {};

  // Strip key yang ada di base tapi BUKAN di allowlist (membersihkan data
  // legacy yang mungkin sudah tercemar sebelum patch).
  for (const k of Object.keys(base)) {
    if (!ALLOWED_KEYS.has(k)) {
      delete base[k];
    }
  }

  for (const [k, raw] of Object.entries(patch)) {
    if (!ALLOWED_KEYS.has(k)) continue; // ignore key tidak dikenal
    const spec = ALLOWED_FIELDS[k];

    if (raw === null || raw === undefined) {
      delete base[k];
      continue;
    }

    const value = spec.sanitize ? spec.sanitize(raw) : raw;
    if (!spec.validate(value)) continue; // skip value invalid

    base[k] = value;
  }

  return base;
}

/**
 * Validasi sebuah field metadata individu. Return true kalau valid (atau
 * key tidak dikenal — caller tanggung jawab). Berguna untuk endpoint yang
 * mau cepat reject sebelum query DB.
 */
export function isValidMetadataField(key: string, value: unknown): boolean {
  const spec = ALLOWED_FIELDS[key];
  if (!spec) return false;
  const v = spec.sanitize ? spec.sanitize(value) : value;
  return spec.validate(v);
}
