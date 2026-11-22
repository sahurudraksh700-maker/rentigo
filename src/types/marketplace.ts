export type Category = string;

export type ItemCondition = 'New' | 'Good' | 'Fair';

export type ListingStatus = 'Available' | 'Rented' | 'Paused';

export type ApprovalStatus = 'Approved' | 'Pending' | 'Rejected';

export type RequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'Returned'
  | 'Declined'
  | 'Cancelled';

export type ReportStatus = 'Open' | 'Dismissed' | 'Resolved';

export interface SiteSettings {
  brandName: string;
  logoText: string;
  tagline: string;
  heroSubtitle: string;
  accentColor: string;
  contactEmail: string;
  supportWhatsapp: string;
  footerText: string;
  requireApproval: boolean;
}

export interface BookedRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  requestId: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  firstName: string;
  college: string;
  photoUrl: string;
  rating: number;
  ratingCount: number;
  blocked: boolean;
  phone?: string;
  email?: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

export interface Listing {
  id: string;
  ownerId: string;
  ownerFirstName: string;
  ownerName: string;
  ownerCollege: string;
  ownerPhotoUrl: string;
  ownerRating: number;
  title: string;
  description: string;
  category: Category;
  photos: string[];
  pricePerDay: number;
  deposit: number;
  condition: ItemCondition;
  pickupLocation: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  availableFrom: string;
  availableTo: string;
  status: ListingStatus;
  featured: boolean;
  approvalStatus: ApprovalStatus;
  bookedRanges: BookedRange[];
  createdAtMs: number;
  ownerReviewCount?: number;
  isSeed?: boolean;
  seedOwnerPhone?: string;
}

export interface RentalRequest {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPhoto: string;
  pickupLocation: string;
  ownerId: string;
  ownerName: string;
  ownerCollege: string;
  ownerContact: string;
  renterId: string;
  renterName: string;
  renterCollege: string;
  renterPhotoUrl: string;
  startDate: string;
  endDate: string;
  days: number;
  pricePerDay: number;
  deposit: number;
  totalAmount: number;
  message: string;
  status: RequestStatus;
  createdAtMs: number;
  isSeed?: boolean;
}

export interface ListingReport {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAtMs: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface SeedState {
  deletedIds: string[];
  hiddenIds: string[];
  featuredIds: string[];
  unfeaturedIds: string[];
}

export interface ChatMessage {
  id: string;
  requestId: string;
  ownerId: string;
  renterId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAtMs: number;
  pending?: boolean;
}

export interface UserReview {
  id: string;
  requestId: string;
  listingId: string;
  listingTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoUrl: string;
  reviewerRole: 'renter' | 'owner';
  revieweeId: string;
  revieweeName: string;
  rating: number;
  comment: string;
  createdAtMs: number;
}

export interface SavedItem {
  id: string;
  userId: string;
  listingId: string;
  listingTitle: string;
  listingPhoto: string;
  pricePerDay: number;
  createdAtMs: number;
}

export type AppView = 'home' | 'detail' | 'dashboard' | 'safety' | 'admin';
