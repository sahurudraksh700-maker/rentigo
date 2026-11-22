/**
 * ============================================================================
 * CENTRAL DATA ACCESS LAYER (services/db.js)
 * ============================================================================
 * All Firebase Auth & Firestore operations—plus localStorage persistence for
 * the 12 demo seed items—are isolated in this single file so a different
 * backend can be swapped in cleanly later.
 * ============================================================================
 */

import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { siteConfig } from '../config/siteConfig.js';
import { defaultCategories } from '../config/categories.js';
import { seedListings } from '../data/seedListings.js';

export const STORAGE_KEYS = {
  SEED_REQUESTS: 'rentigo_seed_requests_v1',
  SEED_BOOKINGS: 'rentigo_seed_bookings_v1',
  SEED_OVERRIDES: 'rentigo_seed_overrides_v1',
  SEED_STATE_CACHE: 'rentigo_seed_state_v1',
  SITE_SETTINGS_CACHE: 'rentigo_site_settings_v1',
  CATEGORIES_CACHE: 'rentigo_categories_v1',
  THEME: 'rentigo_theme_v1',
  CHAT_SEEN: 'rentigo_chat_seen_v1',
  PERMISSIONS_PREFS: 'rentigo_permissions_v1',
  PENDING_PHONE: 'rentigo_pending_phone_v1',
};

export const DEFAULT_SEED_STATE = {
  deletedIds: [],
  hiddenIds: [],
  featuredIds: [],
  unfeaturedIds: [],
};

export function createSafeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeText(val, minLen, maxLen, fallback) {
  const cleaned = String(val ?? '').trim();
  if (cleaned.length < minLen) return fallback.slice(0, maxLen);
  return cleaned.slice(0, maxLen);
}

function sanitizeNumber(val, min, max, fallback) {
  const num = Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function sanitizeDateISO(val, fallback) {
  const s = String(val ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fallback;
}

function sanitizeOptionalGeo(input) {
  const out = {};
  if (typeof input?.state === 'string' && input.state.trim()) {
    out.state = input.state.trim().slice(0, 80);
  }
  if (typeof input?.city === 'string' && input.city.trim()) {
    out.city = input.city.trim().slice(0, 80);
  }
  const lat = Number(input?.lat);
  const lng = Number(input?.lng);
  if (
    input?.lat !== undefined &&
    input?.lat !== null &&
    input?.lng !== undefined &&
    input?.lng !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    out.lat = Number(lat.toFixed(6));
    out.lng = Number(lng.toFixed(6));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auth & Profile
// ---------------------------------------------------------------------------
export function subscribeAuth(onUserChanged) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      onUserChanged(null);
      return;
    }

    const profilePath = `users/${fbUser.uid}`;
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const profileSnap = await getDoc(userRef);
      let phone = '';

      try {
        const contactSnap = await getDoc(
          doc(db, 'users', fbUser.uid, 'private', 'contact')
        );
        if (contactSnap.exists()) {
          phone = String(contactSnap.data().phone || '');
        }
      } catch {
        // Private contact doc may not exist yet
      }

      if (profileSnap.exists()) {
        const d = profileSnap.data();
        if (!('blocked' in d)) {
          try {
            await updateDoc(userRef, {
              blocked: false,
              updatedAt: serverTimestamp(),
            });
          } catch {
            // Non-fatal backfill; rules allow missing blocked field safely
          }
        }
        const safeDisplayName = sanitizeText(
          d.displayName || fbUser.displayName,
          2,
          80,
          'Campus Student'
        );
        const safeFirstName = sanitizeText(
          d.firstName || safeDisplayName.split(' ')[0],
          1,
          40,
          'Student'
        );
        const geo = sanitizeOptionalGeo(d);
        onUserChanged({
          uid: fbUser.uid,
          displayName: safeDisplayName,
          firstName: safeFirstName,
          college: sanitizeText(d.college, 2, 120, 'Campus Member'),
          photoUrl: String(d.photoUrl || fbUser.photoURL || '').slice(0, 500),
          rating: sanitizeNumber(d.rating ?? 5, 0, 5, 5),
          ratingCount: sanitizeNumber(d.ratingCount ?? 0, 0, 10000, 0),
          blocked: Boolean(d.blocked),
          phone,
          email: fbUser.email || '',
          ...geo,
        });
      } else {
        const fullName = sanitizeText(
          fbUser.displayName,
          2,
          80,
          'Campus Student'
        );
        const firstName = sanitizeText(fullName.split(' ')[0], 1, 40, 'Student');
        const photoUrl = String(fbUser.photoURL || '').slice(0, 500);
        const newProfile = {
          uid: fbUser.uid,
          displayName: fullName,
          firstName,
          college: 'Campus Member',
          photoUrl,
          rating: 5,
          ratingCount: 0,
          blocked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(userRef, newProfile);
        onUserChanged({
          uid: fbUser.uid,
          displayName: newProfile.displayName,
          firstName: newProfile.firstName,
          college: newProfile.college,
          photoUrl: newProfile.photoUrl,
          rating: 5,
          ratingCount: 0,
          blocked: false,
          phone: '',
          email: fbUser.email || '',
        });
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes('permission')
      ) {
        handleFirestoreError(err, OperationType.GET, profilePath);
      }
      const fullName = sanitizeText(
        fbUser.displayName,
        2,
        80,
        'Campus Student'
      );
      onUserChanged({
        uid: fbUser.uid,
        displayName: fullName,
        firstName: sanitizeText(fullName.split(' ')[0], 1, 40, 'Student'),
        college: 'Campus Member',
        photoUrl: String(fbUser.photoURL || '').slice(0, 500),
        rating: 5,
        ratingCount: 0,
        blocked: false,
        phone: '',
        email: fbUser.email || '',
      });
    }
  });
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function saveUserProfile(userProfile, updates) {
  const displayName = sanitizeText(updates.displayName, 2, 80, 'Campus Student');
  const firstName = sanitizeText(displayName.split(' ')[0], 1, 40, 'Student');
  const college = sanitizeText(updates.college, 2, 120, 'Campus Member');
  const photoUrl = String(updates.photoUrl || '').trim().slice(0, 500);
  const phone = sanitizeText(updates.phone, 7, 24, '');
  const email = sanitizeText(
    userProfile.email || auth.currentUser?.email,
    5,
    120,
    'student@campus.edu'
  );

  const userRef = doc(db, 'users', userProfile.uid);
  const contactRef = doc(db, 'users', userProfile.uid, 'private', 'contact');

  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists() && !('blocked' in existingSnap.data())) {
      try {
        await updateDoc(userRef, {
          blocked: false,
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore if rules block backfill
      }
    }

    const geo = sanitizeOptionalGeo(updates);
    const batch = writeBatch(db);
    if (existingSnap.exists()) {
      batch.update(userRef, {
        displayName,
        firstName,
        college,
        photoUrl,
        ...geo,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(userRef, {
        uid: userProfile.uid,
        displayName,
        firstName,
        college,
        photoUrl,
        rating: sanitizeNumber(userProfile.rating ?? 5, 0, 5, 5),
        ratingCount: sanitizeNumber(userProfile.ratingCount ?? 0, 0, 10000, 0),
        blocked: false,
        ...geo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (phone.length >= 7 && phone.length <= 24) {
      batch.set(contactRef, {
        uid: userProfile.uid,
        phone,
        email,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return {
      ...userProfile,
      displayName,
      firstName,
      college,
      photoUrl,
      phone: phone.length >= 7 ? phone : userProfile.phone || '',
      ...geo,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userProfile.uid}`);
  }
}

// ---------------------------------------------------------------------------
// Listings (Firestore)
// ---------------------------------------------------------------------------
export function subscribeListings(onData, onError) {
  const listingsRef = collection(db, 'listings');
  return onSnapshot(
    listingsRef,
    (snapshot) => {
      const docs = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        const createdAtMs =
          d.createdAt && typeof d.createdAt.toMillis === 'function'
            ? d.createdAt.toMillis()
            : Date.now();
        return {
          id: docSnap.id,
          ownerId: String(d.ownerId || ''),
          ownerFirstName: String(d.ownerFirstName || 'Student'),
          ownerName: String(d.ownerName || 'Student'),
          ownerCollege: String(d.ownerCollege || 'Campus'),
          ownerPhotoUrl: String(d.ownerPhotoUrl || ''),
          ownerRating: Number(d.ownerRating ?? 5),
          title: String(d.title || ''),
          description: String(d.description || ''),
          category: String(d.category || 'Other'),
          photos: Array.isArray(d.photos) ? d.photos : [],
          pricePerDay: Number(d.pricePerDay || 0),
          deposit: Number(d.deposit || 0),
          condition: d.condition || 'Good',
          pickupLocation: String(d.pickupLocation || ''),
          ...sanitizeOptionalGeo(d),
          availableFrom: String(d.availableFrom || ''),
          availableTo: String(d.availableTo || ''),
          status: d.status || 'Available',
          featured: Boolean(d.featured),
          approvalStatus: d.approvalStatus || 'Approved',
          bookedRanges: Array.isArray(d.bookedRanges) ? d.bookedRanges : [],
          createdAtMs,
          isSeed: false,
        };
      });
      onData(docs);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'listings');
    }
  );
}

export async function createListing(userProfile, data, options = {}) {
  const id = createSafeId('lst');
  const path = `listings/${id}`;
  const isAdminOfficial = Boolean(options.asSiteOfficial);
  const rawBrandName = options.siteBrandName || siteConfig.brandName;
  const ownerName = isAdminOfficial
    ? sanitizeText(rawBrandName, 2, 80, 'Rentigo')
    : sanitizeText(userProfile.displayName, 2, 80, 'Campus Student');
  const ownerFirstName = isAdminOfficial
    ? sanitizeText(rawBrandName, 1, 40, 'Rentigo')
    : sanitizeText(
        userProfile.firstName || ownerName.split(' ')[0],
        1,
        40,
        'Student'
      );
  const ownerCollege = isAdminOfficial
    ? 'Official Campus Store'
    : sanitizeText(userProfile.college, 2, 120, 'Campus Member');
  const approvalStatus =
    options.requireApproval && !isAdminOfficial ? 'Pending' : 'Approved';

  const todayStr = new Date().toISOString().split('T')[0];
  const availableFrom = sanitizeDateISO(data.availableFrom, todayStr);
  const rawAvailableTo = sanitizeDateISO(data.availableTo, availableFrom);
  const availableTo =
    rawAvailableTo >= availableFrom ? rawAvailableTo : availableFrom;

  const photos = Array.isArray(data.photos)
    ? data.photos
        .filter((p) => typeof p === 'string' && p.trim().length >= 5)
        .slice(0, 4)
    : [];

  if (photos.length === 0) {
    throw new Error('Please upload at least 1 valid photo before publishing.');
  }
  if (photos[0].length > 255000) {
    throw new Error(
      'The primary photo is too large. Please try another or smaller image.'
    );
  }

  const geo = sanitizeOptionalGeo(data);

  try {
    await setDoc(doc(db, 'listings', id), {
      id,
      ownerId: userProfile.uid,
      ownerFirstName,
      ownerName,
      ownerCollege,
      ownerPhotoUrl: String(userProfile.photoUrl || '').trim().slice(0, 500),
      ownerRating: sanitizeNumber(userProfile.rating ?? 5, 0, 5, 5),
      title: sanitizeText(data.title, 3, 100, 'Campus Rental Item'),
      description: sanitizeText(
        data.description,
        10,
        1200,
        'Campus item available for student rental.'
      ),
      category: sanitizeText(data.category, 2, 50, 'Other'),
      photos,
      pricePerDay: Math.round(sanitizeNumber(data.pricePerDay, 10, 50000, 100)),
      deposit: Math.round(sanitizeNumber(data.deposit, 0, 100000, 0)),
      condition: ['New', 'Good', 'Fair'].includes(data.condition)
        ? data.condition
        : 'Good',
      pickupLocation: sanitizeText(
        data.pickupLocation,
        3,
        140,
        'Campus Main Gate'
      ),
      ...geo,
      availableFrom,
      availableTo,
      status: 'Available',
      featured: Boolean(options.featured),
      approvalStatus,
      bookedRanges: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id, approvalStatus };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateListing(listing, updates) {
  const path = `listings/${listing.id}`;
  const cleanUpdates = { ...updates };

  if ('title' in cleanUpdates) {
    cleanUpdates.title = sanitizeText(
      cleanUpdates.title,
      3,
      100,
      listing.title || 'Campus Rental Item'
    );
  }
  if ('description' in cleanUpdates) {
    cleanUpdates.description = sanitizeText(
      cleanUpdates.description,
      10,
      1200,
      listing.description || 'Campus item available for student rental.'
    );
  }
  if ('category' in cleanUpdates) {
    cleanUpdates.category = sanitizeText(
      cleanUpdates.category,
      2,
      50,
      'Other'
    );
  }
  if ('pickupLocation' in cleanUpdates) {
    cleanUpdates.pickupLocation = sanitizeText(
      cleanUpdates.pickupLocation,
      3,
      140,
      listing.pickupLocation || 'Campus Main Gate'
    );
  }
  if ('state' in cleanUpdates) {
    if (typeof cleanUpdates.state === 'string' && cleanUpdates.state.trim()) {
      cleanUpdates.state = cleanUpdates.state.trim().slice(0, 80);
    } else {
      delete cleanUpdates.state;
    }
  }
  if ('city' in cleanUpdates) {
    if (typeof cleanUpdates.city === 'string' && cleanUpdates.city.trim()) {
      cleanUpdates.city = cleanUpdates.city.trim().slice(0, 80);
    } else {
      delete cleanUpdates.city;
    }
  }
  if ('lat' in cleanUpdates || 'lng' in cleanUpdates) {
    const geoPair = sanitizeOptionalGeo({
      lat: cleanUpdates.lat,
      lng: cleanUpdates.lng,
    });
    if (typeof geoPair.lat === 'number' && typeof geoPair.lng === 'number') {
      cleanUpdates.lat = geoPair.lat;
      cleanUpdates.lng = geoPair.lng;
    } else {
      delete cleanUpdates.lat;
      delete cleanUpdates.lng;
    }
  }
  if ('pricePerDay' in cleanUpdates) {
    cleanUpdates.pricePerDay = Math.round(
      sanitizeNumber(cleanUpdates.pricePerDay, 10, 50000, listing.pricePerDay)
    );
  }
  if ('deposit' in cleanUpdates) {
    cleanUpdates.deposit = Math.round(
      sanitizeNumber(cleanUpdates.deposit, 0, 100000, listing.deposit)
    );
  }
  if ('photos' in cleanUpdates && Array.isArray(cleanUpdates.photos)) {
    const validPhotos = cleanUpdates.photos
      .filter((p) => typeof p === 'string' && p.trim().length >= 5)
      .slice(0, 4);
    if (validPhotos.length === 0 || validPhotos[0].length > 255000) {
      throw new Error('Please keep at least 1 compressed photo per listing.');
    }
    cleanUpdates.photos = validPhotos;
  }

  try {
    await updateDoc(doc(db, 'listings', listing.id), {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteListingById(listingId) {
  const path = `listings/${listingId}`;
  try {
    await deleteDoc(doc(db, 'listings', listingId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// Rental Requests (Firestore)
// ---------------------------------------------------------------------------
function mapRentalRequest(docSnap) {
  const d = docSnap.data();
  const createdAt = d.createdAt;
  return {
    id: docSnap.id,
    listingId: String(d.listingId || ''),
    listingTitle: String(d.listingTitle || ''),
    listingPhoto: String(d.listingPhoto || ''),
    pickupLocation: String(d.pickupLocation || ''),
    ownerId: String(d.ownerId || ''),
    ownerName: String(d.ownerName || ''),
    ownerCollege: String(d.ownerCollege || ''),
    ownerContact: String(d.ownerContact || ''),
    renterId: String(d.renterId || ''),
    renterName: String(d.renterName || ''),
    renterCollege: String(d.renterCollege || ''),
    renterPhotoUrl: String(d.renterPhotoUrl || ''),
    startDate: String(d.startDate || ''),
    endDate: String(d.endDate || ''),
    days: Number(d.days || 1),
    pricePerDay: Number(d.pricePerDay || 0),
    deposit: Number(d.deposit || 0),
    totalAmount: Number(d.totalAmount || 0),
    message: String(d.message || ''),
    status: d.status || 'Pending',
    createdAtMs:
      createdAt && typeof createdAt.toMillis === 'function'
        ? createdAt.toMillis()
        : Date.now(),
    isSeed: false,
  };
}

export function subscribeUserRequests(uid, onIncoming, onMyRentals) {
  const ownerQuery = query(
    collection(db, 'rentalRequests'),
    where('ownerId', '==', uid)
  );
  const renterQuery = query(
    collection(db, 'rentalRequests'),
    where('renterId', '==', uid)
  );

  const unsubOwner = onSnapshot(
    ownerQuery,
    (snap) => {
      onIncoming(
        snap.docs.map(mapRentalRequest).sort((a, b) => b.createdAtMs - a.createdAtMs)
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'rentalRequests')
  );

  const unsubRenter = onSnapshot(
    renterQuery,
    (snap) => {
      onMyRentals(
        snap.docs.map(mapRentalRequest).sort((a, b) => b.createdAtMs - a.createdAtMs)
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'rentalRequests')
  );

  return () => {
    unsubOwner();
    unsubRenter();
  };
}

export async function createRentalRequest(userProfile, listing, payload) {
  const reqId = createSafeId('req');
  const safePhoto =
    listing.photos[0] && listing.photos[0].length <= 220000
      ? listing.photos[0]
      : '';
  const path = `rentalRequests/${reqId}`;

  try {
    await setDoc(doc(db, 'rentalRequests', reqId), {
      id: reqId,
      listingId: listing.id,
      listingTitle: sanitizeText(listing.title, 3, 100, 'Campus Item'),
      listingPhoto: safePhoto,
      pickupLocation: sanitizeText(
        listing.pickupLocation,
        3,
        140,
        'Campus Main Gate'
      ),
      ownerId: listing.ownerId,
      ownerName: sanitizeText(listing.ownerName, 2, 80, 'Campus Student'),
      ownerCollege: sanitizeText(listing.ownerCollege, 2, 120, 'Campus Member'),
      ownerContact: '',
      renterId: userProfile.uid,
      renterName: sanitizeText(userProfile.displayName, 2, 80, 'Campus Student'),
      renterCollege: sanitizeText(userProfile.college, 2, 120, 'Campus Member'),
      renterPhotoUrl: String(userProfile.photoUrl || '').slice(0, 500),
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: Math.round(sanitizeNumber(payload.days, 1, 90, 1)),
      pricePerDay: Math.round(sanitizeNumber(listing.pricePerDay, 10, 50000, 100)),
      deposit: Math.round(sanitizeNumber(listing.deposit, 0, 100000, 0)),
      totalAmount: Math.round(
        sanitizeNumber(payload.totalAmount, 10, 5000000, 100)
      ),
      message: String(payload.message || '').slice(0, 500),
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return reqId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function respondToRentalRequest(
  request,
  decision,
  ownerPhone,
  targetListing
) {
  const path = `rentalRequests/${request.id}`;
  try {
    if (decision === 'Accepted') {
      const batch = writeBatch(db);
      batch.update(doc(db, 'rentalRequests', request.id), {
        status: 'Accepted',
        ownerContact: ownerPhone,
        updatedAt: serverTimestamp(),
      });

      if (targetListing) {
        const updatedRanges = [
          ...targetListing.bookedRanges,
          {
            startDate: request.startDate,
            endDate: request.endDate,
            requestId: request.id,
          },
        ].slice(0, 50);

        batch.update(doc(db, 'listings', targetListing.id), {
          bookedRanges: updatedRanges,
          status: 'Rented',
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    } else {
      await updateDoc(doc(db, 'rentalRequests', request.id), {
        status: 'Declined',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function markRentalReturned(request, targetListing) {
  const path = `rentalRequests/${request.id}`;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'rentalRequests', request.id), {
      status: 'Returned',
      updatedAt: serverTimestamp(),
    });

    if (targetListing) {
      const nextRanges = targetListing.bookedRanges.filter(
        (r) => r.requestId !== request.id
      );
      batch.update(doc(db, 'listings', targetListing.id), {
        bookedRanges: nextRanges,
        status: nextRanges.length > 0 ? 'Rented' : 'Available',
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function cancelRentalRequest(requestId) {
  const path = `rentalRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'rentalRequests', requestId), {
      status: 'Cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Real-Time Renter-Owner Chat (Firestore Subcollection)
// ---------------------------------------------------------------------------
export function subscribeChatMessages(request, currentUid, onMessages, onError) {
  if (!request || request.isSeed || !currentUid) {
    onMessages([]);
    return () => {};
  }

  const isOwner = request.ownerId === currentUid;
  const isRenter = request.renterId === currentUid;
  if (!isOwner && !isRenter) {
    onMessages([]);
    return () => {};
  }

  const roleField = isOwner ? 'ownerId' : 'renterId';
  const messagesQuery = query(
    collection(db, 'rentalRequests', request.id, 'messages'),
    where(roleField, '==', currentUid)
  );

  return onSnapshot(
    messagesQuery,
    (snap) => {
      const list = snap.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const createdAtMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            requestId: String(d.requestId || request.id),
            ownerId: String(d.ownerId || ''),
            renterId: String(d.renterId || ''),
            senderId: String(d.senderId || ''),
            senderName: String(d.senderName || 'Student'),
            text: String(d.text || ''),
            createdAtMs,
            pending: docSnap.metadata.hasPendingWrites,
          };
        })
        .sort((a, b) =>
          a.createdAtMs !== b.createdAtMs
            ? a.createdAtMs - b.createdAtMs
            : a.id.localeCompare(b.id)
        );
      onMessages(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(
        err,
        OperationType.LIST,
        `rentalRequests/${request.id}/messages`
      );
    }
  );
}

export async function sendChatMessage(userProfile, request, text) {
  const cleanText = String(text ?? '').trim().slice(0, 1000);
  if (!cleanText || !userProfile || !request || request.isSeed) {
    return null;
  }

  const msgId = createSafeId('msg');
  const path = `rentalRequests/${request.id}/messages/${msgId}`;

  try {
    await setDoc(doc(db, 'rentalRequests', request.id, 'messages', msgId), {
      id: msgId,
      requestId: request.id,
      ownerId: request.ownerId,
      renterId: request.renterId,
      senderId: userProfile.uid,
      senderName: sanitizeText(userProfile.displayName, 2, 80, 'Campus Student'),
      text: cleanText,
      createdAt: serverTimestamp(),
    });
    return msgId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// ---------------------------------------------------------------------------
// Star Ratings & Reviews (Firestore)
// ---------------------------------------------------------------------------
export function subscribeReviews(onData, onError) {
  const reviewsRef = collection(db, 'reviews');
  return onSnapshot(
    reviewsRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const createdAtMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            requestId: String(d.requestId || ''),
            listingId: String(d.listingId || ''),
            listingTitle: String(d.listingTitle || ''),
            reviewerId: String(d.reviewerId || ''),
            reviewerName: String(d.reviewerName || 'Student'),
            reviewerPhotoUrl: String(d.reviewerPhotoUrl || ''),
            reviewerRole: d.reviewerRole === 'owner' ? 'owner' : 'renter',
            revieweeId: String(d.revieweeId || ''),
            revieweeName: String(d.revieweeName || 'Student'),
            rating: sanitizeNumber(d.rating, 1, 5, 5),
            comment: String(d.comment || ''),
            createdAtMs,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, 'reviews');
    }
  );
}

export async function submitRentalReview(userProfile, request, payload) {
  if (!userProfile || !request || request.isSeed) {
    throw new Error('Reviews are supported on completed campus rentals.');
  }
  if (request.status !== 'Returned') {
    throw new Error('You can leave a review once the rental is completed.');
  }

  const isRenter = userProfile.uid === request.renterId;
  const isOwner = userProfile.uid === request.ownerId;
  if (!isRenter && !isOwner) {
    throw new Error('Only participants of this rental can leave a review.');
  }

  const reviewerRole = isRenter ? 'renter' : 'owner';
  const revieweeId = isRenter ? request.ownerId : request.renterId;
  const revieweeName = sanitizeText(
    isRenter ? request.ownerName : request.renterName,
    2,
    80,
    'Campus Student'
  );
  const reviewId = `${request.id}_${userProfile.uid}`;
  const path = `reviews/${reviewId}`;
  const rating = Math.round(sanitizeNumber(payload.rating, 1, 5, 5));
  const comment = String(payload.comment ?? '').trim().slice(0, 600);

  try {
    await setDoc(doc(db, 'reviews', reviewId), {
      id: reviewId,
      requestId: request.id,
      listingId: request.listingId,
      listingTitle: sanitizeText(request.listingTitle, 3, 100, 'Campus Item'),
      reviewerId: userProfile.uid,
      reviewerName: sanitizeText(
        userProfile.displayName,
        2,
        80,
        'Campus Student'
      ),
      reviewerPhotoUrl: String(userProfile.photoUrl || '').trim().slice(0, 500),
      reviewerRole,
      revieweeId,
      revieweeName,
      rating,
      comment,
      createdAt: serverTimestamp(),
    });
    return reviewId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * @param {any[]} reviews
 * @param {string} userId
 * @param {number | null} [fallbackRating]
 */
export function computeUserRatingSummary(
  reviews,
  userId,
  fallbackRating = null
) {
  const userReviews = Array.isArray(reviews)
    ? reviews.filter((r) => r.revieweeId === userId)
    : [];
  const count = userReviews.length;
  if (count === 0) {
    return {
      average: typeof fallbackRating === 'number' ? fallbackRating : null,
      count: 0,
      userReviews: [],
    };
  }
  const sum = userReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
  return {
    average: Number((sum / count).toFixed(1)),
    count,
    userReviews,
  };
}

// ---------------------------------------------------------------------------
// Wishlist / Saved Items (Firestore User Subcollection)
// ---------------------------------------------------------------------------
export function subscribeSavedItems(uid, onData, onError) {
  if (!uid) {
    onData([]);
    return () => {};
  }

  const savedQuery = query(
    collection(db, 'users', uid, 'savedItems'),
    where('userId', '==', uid)
  );

  return onSnapshot(
    savedQuery,
    (snapshot) => {
      const list = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          const createdAtMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            userId: String(d.userId || uid),
            listingId: String(d.listingId || docSnap.id),
            listingTitle: String(d.listingTitle || 'Campus Item'),
            listingPhoto: String(d.listingPhoto || ''),
            pricePerDay: Number(d.pricePerDay || 0),
            createdAtMs,
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, `users/${uid}/savedItems`);
    }
  );
}

export async function toggleSavedItem(userProfile, listing, currentlySaved) {
  if (!userProfile || !listing) return false;
  const path = `users/${userProfile.uid}/savedItems/${listing.id}`;
  const itemRef = doc(db, 'users', userProfile.uid, 'savedItems', listing.id);

  if (currentlySaved) {
    try {
      await deleteDoc(itemRef);
      return false;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  const rawPhoto =
    Array.isArray(listing.photos) && typeof listing.photos[0] === 'string'
      ? listing.photos[0]
      : '';
  const listingPhoto = rawPhoto.length <= 260000 ? rawPhoto : '';

  try {
    await setDoc(itemRef, {
      id: listing.id,
      userId: userProfile.uid,
      listingId: listing.id,
      listingTitle: sanitizeText(listing.title, 1, 100, 'Campus Item'),
      listingPhoto,
      pricePerDay: Math.round(
        sanitizeNumber(listing.pricePerDay, 10, 50000, 100)
      ),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export async function submitListingReport(userId, listing, reason, details) {
  const reportId = createSafeId('rep');
  const path = `reports/${reportId}`;
  try {
    await setDoc(doc(db, 'reports', reportId), {
      id: reportId,
      listingId: listing.id,
      listingTitle: listing.title.slice(0, 100),
      reporterId: userId,
      reason,
      details,
      status: 'Open',
      createdAt: serverTimestamp(),
    });
    return reportId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// ---------------------------------------------------------------------------
// Admin-Only Subscriptions & Operations
// ---------------------------------------------------------------------------
export function subscribeAdminData(onUsers, onAllRequests, onReports) {
  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snap) => {
      onUsers(
        snap.docs.map((d) => {
          const v = d.data();
          return {
            uid: d.id,
            displayName: String(v.displayName || 'Student'),
            firstName: String(v.firstName || 'Student'),
            college: String(v.college || 'Campus'),
            photoUrl: String(v.photoUrl || ''),
            rating: Number(v.rating ?? 5),
            ratingCount: Number(v.ratingCount ?? 0),
            blocked: Boolean(v.blocked),
          };
        })
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'users')
  );

  const unsubRequests = onSnapshot(
    collection(db, 'rentalRequests'),
    (snap) => {
      onAllRequests(
        snap.docs.map(mapRentalRequest).sort((a, b) => b.createdAtMs - a.createdAtMs)
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'rentalRequests')
  );

  const unsubReports = onSnapshot(
    collection(db, 'reports'),
    (snap) => {
      onReports(
        snap.docs
          .map((d) => {
            const v = d.data();
            const createdAtMs =
              v.createdAt && typeof v.createdAt.toMillis === 'function'
                ? v.createdAt.toMillis()
                : Date.now();
            return {
              id: d.id,
              listingId: String(v.listingId || ''),
              listingTitle: String(v.listingTitle || ''),
              reporterId: String(v.reporterId || ''),
              reason: String(v.reason || ''),
              details: String(v.details || ''),
              status: v.status || 'Open',
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs)
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
  );

  return () => {
    unsubUsers();
    unsubRequests();
    unsubReports();
  };
}

export async function setUserBlocked(uid, blocked) {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      blocked,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function updateReportStatus(reportId, status) {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Live Site Settings & Categories (Firestore + localStorage Cache)
// ---------------------------------------------------------------------------
export function getCachedSiteSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SITE_SETTINGS_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...siteConfig, ...parsed };
      if (merged.contactEmail === 'hello@rentigo.campus') {
        merged.contactEmail = siteConfig.contactEmail;
      }
      return merged;
    }
  } catch {
    // Ignore parse error
  }
  return { ...siteConfig };
}

export function subscribeSiteSettings(onUpdate) {
  return onSnapshot(
    doc(db, 'settings', 'site'),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const rawEmail = String(d.contactEmail || siteConfig.contactEmail);
        const merged = {
          brandName: String(d.brandName || siteConfig.brandName),
          logoText: String(d.logoText || siteConfig.logoText),
          tagline: String(d.tagline || siteConfig.tagline),
          heroSubtitle: String(d.heroSubtitle || siteConfig.heroSubtitle),
          accentColor: String(d.accentColor || siteConfig.accentColor),
          contactEmail:
            rawEmail === 'hello@rentigo.campus'
              ? siteConfig.contactEmail
              : rawEmail,
          supportWhatsapp: String(d.supportWhatsapp || siteConfig.supportWhatsapp),
          footerText: String(d.footerText || siteConfig.footerText),
          requireApproval: Boolean(d.requireApproval),
        };
        try {
          localStorage.setItem(
            STORAGE_KEYS.SITE_SETTINGS_CACHE,
            JSON.stringify(merged)
          );
        } catch {
          // Ignore storage error
        }
        onUpdate(merged);
      }
    },
    () => {
      // Fall back quietly to config/siteConfig.js
    }
  );
}

export async function saveSiteSettings(settings) {
  const path = 'settings/site';
  const payload = {
    brandName: settings.brandName.trim(),
    logoText: settings.logoText.trim(),
    tagline: settings.tagline.trim(),
    heroSubtitle: settings.heroSubtitle.trim(),
    accentColor: settings.accentColor.trim(),
    contactEmail: settings.contactEmail.trim(),
    supportWhatsapp: settings.supportWhatsapp.trim(),
    footerText: settings.footerText.trim(),
    requireApproval: Boolean(settings.requireApproval),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'settings', 'site'), payload);
    try {
      localStorage.setItem(
        STORAGE_KEYS.SITE_SETTINGS_CACHE,
        JSON.stringify({ ...settings })
      );
    } catch {
      // Ignore storage error
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export function getCachedCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Ignore parse error
  }
  return [...defaultCategories];
}

export function subscribeCategories(onUpdate) {
  return onSnapshot(
    doc(db, 'settings', 'categories'),
    (snap) => {
      if (snap.exists()) {
        const items = snap.data().items;
        if (Array.isArray(items) && items.length > 0) {
          try {
            localStorage.setItem(
              STORAGE_KEYS.CATEGORIES_CACHE,
              JSON.stringify(items)
            );
          } catch {
            // Ignore
          }
          onUpdate(items);
        }
      }
    },
    () => {
      // Fall back to config/categories.js
    }
  );
}

export async function saveCategories(items) {
  const path = 'settings/categories';
  try {
    await setDoc(doc(db, 'settings', 'categories'), {
      items,
      updatedAt: serverTimestamp(),
    });
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES_CACHE, JSON.stringify(items));
    } catch {
      // Ignore
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ---------------------------------------------------------------------------
// Global Seed State & Seed Promotion (Firestore + localStorage Cache)
// ---------------------------------------------------------------------------
function normalizeIdArray(val) {
  if (!Array.isArray(val)) return [];
  return Array.from(
    new Set(val.filter((item) => typeof item === 'string' && item.trim().length > 0))
  ).slice(0, 50);
}

export function getCachedSeedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEED_STATE_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        deletedIds: normalizeIdArray(parsed.deletedIds),
        hiddenIds: normalizeIdArray(parsed.hiddenIds),
        featuredIds: normalizeIdArray(parsed.featuredIds),
        unfeaturedIds: normalizeIdArray(parsed.unfeaturedIds),
      };
    }
  } catch {
    // Ignore parse error
  }
  return { ...DEFAULT_SEED_STATE };
}

export function subscribeSeedState(onUpdate) {
  return onSnapshot(
    doc(db, 'settings', 'seedState'),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        const next = {
          deletedIds: normalizeIdArray(d.deletedIds),
          hiddenIds: normalizeIdArray(d.hiddenIds),
          featuredIds: normalizeIdArray(d.featuredIds),
          unfeaturedIds: normalizeIdArray(d.unfeaturedIds),
        };
        try {
          localStorage.setItem(
            STORAGE_KEYS.SEED_STATE_CACHE,
            JSON.stringify(next)
          );
        } catch {
          // Ignore storage error
        }
        onUpdate(next);
      } else {
        onUpdate({ ...DEFAULT_SEED_STATE });
      }
    },
    () => {
      // Keep cached fallback if offline
    }
  );
}

export async function saveSeedState(nextState) {
  const path = 'settings/seedState';
  const normalized = {
    deletedIds: normalizeIdArray(nextState.deletedIds),
    hiddenIds: normalizeIdArray(nextState.hiddenIds),
    featuredIds: normalizeIdArray(nextState.featuredIds),
    unfeaturedIds: normalizeIdArray(nextState.unfeaturedIds),
  };

  try {
    await setDoc(doc(db, 'settings', 'seedState'), {
      ...normalized,
      updatedAt: serverTimestamp(),
    });
    try {
      localStorage.setItem(
        STORAGE_KEYS.SEED_STATE_CACHE,
        JSON.stringify(normalized)
      );
    } catch {
      // Ignore storage error
    }
    return normalized;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function promoteSeedListing(seedListing, updates) {
  const path = `listings/${seedListing.id}`;
  try {
    await setDoc(doc(db, 'listings', seedListing.id), {
      id: seedListing.id,
      ownerId: seedListing.ownerId,
      ownerFirstName: seedListing.ownerFirstName,
      ownerName: seedListing.ownerName,
      ownerCollege: seedListing.ownerCollege,
      ownerPhotoUrl: (seedListing.ownerPhotoUrl || '').slice(0, 500),
      ownerRating: Number(seedListing.ownerRating ?? 5),
      title: updates.title ?? seedListing.title,
      description: updates.description ?? seedListing.description,
      category: updates.category ?? seedListing.category,
      photos: updates.photos ?? seedListing.photos,
      pricePerDay: Number(updates.pricePerDay ?? seedListing.pricePerDay),
      deposit: Number(updates.deposit ?? seedListing.deposit),
      condition: updates.condition ?? seedListing.condition,
      pickupLocation: updates.pickupLocation ?? seedListing.pickupLocation,
      ...sanitizeOptionalGeo({
        state: updates.state ?? seedListing.state,
        city: updates.city ?? seedListing.city,
        lat: updates.lat ?? seedListing.lat,
        lng: updates.lng ?? seedListing.lng,
      }),
      availableFrom: updates.availableFrom ?? seedListing.availableFrom,
      availableTo: updates.availableTo ?? seedListing.availableTo,
      status: updates.status ?? seedListing.status ?? 'Available',
      featured: Boolean(
        typeof updates.featured === 'boolean'
          ? updates.featured
          : seedListing.featured
      ),
      approvalStatus: updates.approvalStatus ?? seedListing.approvalStatus ?? 'Approved',
      bookedRanges: Array.isArray(seedListing.bookedRanges)
        ? seedListing.bookedRanges.slice(0, 50)
        : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function resetGlobalSeedData(promotedSeedIds = []) {
  const path = 'settings/seedState';
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'settings', 'seedState'), {
      deletedIds: [],
      hiddenIds: [],
      featuredIds: [],
      unfeaturedIds: [],
      updatedAt: serverTimestamp(),
    });
    for (const id of promotedSeedIds) {
      batch.delete(doc(db, 'listings', id));
    }
    await batch.commit();
    try {
      localStorage.setItem(
        STORAGE_KEYS.SEED_STATE_CACHE,
        JSON.stringify(DEFAULT_SEED_STATE)
      );
    } catch {
      // Ignore storage error
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ---------------------------------------------------------------------------
// Seed Listings Local Helpers
// ---------------------------------------------------------------------------
export function getSeedDataBaseline() {
  return seedListings;
}

export function readStorageJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage error
  }
}
