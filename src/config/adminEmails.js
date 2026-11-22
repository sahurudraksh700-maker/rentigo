/**
 * ============================================================================
 * ADMIN OWNER EMAILS
 * ============================================================================
 * Only Google accounts whose verified email appears in this list can access
 * the Admin Panel at /admin. Everyone else sees "Access denied".
 *
 * To add another co-admin, add their email in lowercase below AND include
 * them in `firestore.rules` -> `isAdmin()` before deploying rules.
 * ============================================================================
 */

export const adminEmails = [
  'sahurudraksh700@gmail.com',
];

/**
 * Helper to check whether a signed-in user email has Admin Panel access.
 * @param {string | null | undefined} email
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email) return false;
  const normalized = String(email).trim().toLowerCase();
  return adminEmails.some((item) => item.trim().toLowerCase() === normalized);
}
