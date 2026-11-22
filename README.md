# Rentigo — Campus Peer-to-Peer Rental Marketplace

Rentigo is a mobile-first web marketplace where college students rent rarely used gear—DSLR cameras, projectors, formal blazers, cycles, books, and scientific calculators—from classmates on campus. It includes a full **Owner Admin Console** (`/admin`) backed by Firebase Authentication and Cloud Firestore.

---

## 1. Easy Customization (No Code Rewrites Needed)

### Option A: Live from the Admin Panel (Recommended)
1. Sign in with an authorized owner Google account and open **`/admin`** (or click **Admin** in the top bar).
2. Go to **Site Settings** to change:
   - **Site Name** (updates navbar logo, browser tab `<title>`, hero, and footer live)
   - **Hero Headline / Tagline** & **Hero Description Text**
   - **Accent Color** (pick a preset or enter any 6-digit hex code)
   - **Support Contact Email** & **WhatsApp Number**
   - **Footer Text**
   - **Require admin approval before listings go live** moderation toggle
3. Go to **Categories** to add, rename, remove, or reorder marketplace categories live.

### Option B: Edit Static Config Defaults
- **Branding & Defaults**: `src/config/siteConfig.js`
- **Default Categories**: `src/config/categories.js`
- **Backend / Data Layer**: All Firebase Auth, Firestore, and localStorage calls live in `src/services/db.js`.

---

## 2. How to Add or Change Admin Emails

Admin access is verified both in the UI and enforced server-side in Cloud Firestore security rules:

1. Add the owner's Google email (in lowercase) to **`src/config/adminEmails.js`**:
   ```js
   export const adminEmails = [
     'sahurudraksh700@gmail.com',
     'co-owner@example.com',
   ];
   ```
2. Add the same email to the `isAdmin()` helper inside **`firestore.rules`**:
   ```
   function isAdmin() {
     return isSignedIn()
       && request.auth.token.email_verified == true
       && request.auth.token.email in ['sahurudraksh700@gmail.com', 'co-owner@example.com'];
   }
   ```
3. Redeploy Firestore security rules after editing `firestore.rules`.

---

## 3. How to Add, Edit, or Remove Products

### From the Admin Console (`/admin`) or Item Pages
- **On any item page**: When signed in with your admin email, an **Owner Admin Controls** panel appears automatically on the right side with one-click **Hide from Site / Make Visible**, **Feature Item**, **Edit Item**, and **Remove Item** buttons.
- **In Manage Listings (`/admin`)**: Search, filter, or check multiple items at once to **Hide Selected**, **Unhide Selected**, or **Remove Selected** globally for all visitors.
- **Add Product (`/admin`)**: Publish official site items directly with up to 4 auto-compressed photos, optional **Featured** placement, and instant approval.
- **Restore starter items**: Open **Overview -> Reset demo data** to restore the 12 default starter campus items globally for every visitor.

### In Seed Data Code
- Edit **`src/data/seedListings.js`** to change the 12 starter listings shown to new visitors.

---

## 4. Local Development & Deployment

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Typecheck and build production bundle
npm run build
```

Deploy the compiled `dist/` bundle and ensure your Firebase project (`firebase-applet-config.json`) has **Google Sign-In** enabled in Firebase Authentication and the rules in `firestore.rules` deployed.
