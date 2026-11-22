/**
 * Adversarial "Dirty Dozen" Security Rules Test Specification for RentKaro
 * Covers identity spoofing, PII isolation, state machine integrity, and shadow writes.
 */

export const DIRTY_DOZEN_SCENARIOS = [
  { id: 1, name: 'Identity Spoofing on Listing', target: '/listings/l1', expected: 'PERMISSION_DENIED' },
  { id: 2, name: 'Self-Rental Bypass', target: '/rentalRequests/r1', expected: 'PERMISSION_DENIED' },
  { id: 3, name: 'Contact Leak on Request Creation', target: '/rentalRequests/r1', expected: 'PERMISSION_DENIED' },
  { id: 4, name: 'Status Shortcutting on Create', target: '/rentalRequests/r1', expected: 'PERMISSION_DENIED' },
  { id: 5, name: 'Renter Self-Accept', target: '/rentalRequests/r1', expected: 'PERMISSION_DENIED' },
  { id: 6, name: 'Terminal State Mutation', target: '/rentalRequests/r1', expected: 'PERMISSION_DENIED' },
  { id: 7, name: 'Shadow Field Injection', target: '/listings/l1', expected: 'PERMISSION_DENIED' },
  { id: 8, name: 'ID Poisoning', target: '/listings/invalid_long_id', expected: 'PERMISSION_DENIED' },
  { id: 9, name: 'Array Overflow (>4 photos)', target: '/listings/l1', expected: 'PERMISSION_DENIED' },
  { id: 10, name: 'PII Cross-Read on /private/contact', target: '/users/victim/private/contact', expected: 'PERMISSION_DENIED' },
  { id: 11, name: 'Unverified Email Write', target: '/listings/l1', expected: 'PERMISSION_DENIED' },
  { id: 12, name: 'Client Timestamp Forgery', target: '/listings/l1', expected: 'PERMISSION_DENIED' },
] as const;
