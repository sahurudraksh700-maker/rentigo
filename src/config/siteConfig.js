/**
 * ============================================================================
 * RENTIGO SITE CONFIGURATION
 * ============================================================================
 * Edit the values below to rebrand the entire website in one place.
 * Changing `brandName` updates the navbar, browser tab title, hero, footer,
 * and support email automatically.
 *
 * NOTE: You can also override these values live from the Admin Panel (/admin)
 * under the "Site Settings" tab without editing code.
 * ============================================================================
 */

export const siteConfig = {
  // Primary brand name shown across Navbar, Footer, <title>, and emails
  brandName: 'Rentigo',

  // Wordmark text shown in the top-left header
  logoText: 'Rentigo',

  // Main Hero headline on the home page
  tagline: "Don't buy it. Rent it from a classmate.",

  // Supporting description under the hero headline
  heroSubtitle:
    'Borrow DSLR cameras, hostel projectors, placement blazers, cycles, and lab calculators from students on your campus—for a fraction of retail price.',

  // Single primary accent color (Hex code). Also used for active filters & CTAs.
  accentColor: '#2563EB',

  // Support contact email shown in the footer & safety page
  contactEmail: 'rentigo.campus@gmail.com',

  // Support WhatsApp number for campus disputes or help
  supportWhatsapp: '+91 98765 43210',

  // Quiet footer summary line
  footerText: 'Peer-to-peer campus sharing. Built for college students.',

  // Default moderation toggle (can be flipped live in Admin Panel -> Site Settings)
  requireApproval: false,
};
