import { useState, FormEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  ShieldAlert,
  Star,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import {
  Listing,
  ListingReport,
  RentalRequest,
  RequestStatus,
  SiteSettings,
  UserProfile,
} from '../types/marketplace';
import { formatINR, formatShortDate } from '../utils/dateUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { ResilientImage } from './ResilientImage';

type AdminTab =
  | 'overview'
  | 'listings'
  | 'add-product'
  | 'users'
  | 'requests'
  | 'reports'
  | 'categories'
  | 'settings';

interface AdminPanelProps {
  currentUser: UserProfile | null;
  isAuthorizedAdmin: boolean;
  onSignIn: () => void;
  onBackToSite: () => void;
  listings: Listing[];
  users: UserProfile[];
  allRequests: RentalRequest[];
  reports: ListingReport[];
  categories: string[];
  siteSettings: SiteSettings;
  onOpenAddProduct: () => void;
  onEditListing: (listing: Listing) => void;
  onDeleteListing: (listing: Listing) => Promise<void>;
  onToggleHideListing: (listing: Listing) => Promise<void>;
  onBulkHideListings?: (listings: Listing[], hide: boolean) => Promise<void>;
  onBulkDeleteListings?: (listings: Listing[]) => Promise<void>;
  onToggleFeaturedListing: (listing: Listing) => Promise<void>;
  onApproveRejectListing: (
    listing: Listing,
    decision: 'Approved' | 'Rejected'
  ) => Promise<void>;
  onToggleBlockUser: (user: UserProfile) => Promise<void>;
  onCancelAnyRequest: (request: RentalRequest) => Promise<void>;
  onDismissReport: (report: ListingReport) => Promise<void>;
  onHideReportedListing: (report: ListingReport) => Promise<void>;
  onDeleteReportedListing: (report: ListingReport) => Promise<void>;
  onSaveCategories: (items: string[]) => Promise<void>;
  onSaveSiteSettings: (settings: SiteSettings) => Promise<void>;
  onResetDemoData: () => Promise<void> | void;
}

const ACCENT_PRESETS = [
  { label: 'Cobalt Blue', value: '#2563EB' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Indigo', value: '#4F46E5' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Crimson', value: '#DC2626' },
];

export function AdminPanel({
  currentUser,
  isAuthorizedAdmin,
  onSignIn,
  onBackToSite,
  listings,
  users,
  allRequests,
  reports,
  categories,
  siteSettings,
  onOpenAddProduct,
  onEditListing,
  onDeleteListing,
  onToggleHideListing,
  onBulkHideListings,
  onBulkDeleteListings,
  onToggleFeaturedListing,
  onApproveRejectListing,
  onToggleBlockUser,
  onCancelAnyRequest,
  onDismissReport,
  onHideReportedListing,
  onDeleteReportedListing,
  onSaveCategories,
  onSaveSiteSettings,
  onResetDemoData,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [listingSearch, setListingSearch] = useState('');
  const [listingFilter, setListingFilter] = useState<
    'all' | 'pending' | 'featured' | 'hidden'
  >('all');
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<
    'All' | RequestStatus
  >('All');

  // Categories Editor Local State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingIndex, setRenamingIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Site Settings Form State
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Confirmation Dialog State
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    danger: boolean;
    action: () => Promise<void> | void;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Access Gate
  if (!currentUser) {
    return (
      <section className="py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-8">
            <ShieldAlert
              className="w-10 h-10 mx-auto text-[var(--accent)] mb-3"
              aria-hidden="true"
            />
            <h1 className="font-display text-2xl font-bold text-[#141512] dark:text-[#F4F4F0]">
              Admin Sign-In Required
            </h1>
            <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B]">
              Sign in with an authorized owner Google account listed in{' '}
              <code className="font-mono text-xs">config/adminEmails.js</code>{' '}
              to open the Admin Panel.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={onSignIn}
                className="w-full px-5 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 cursor-pointer"
              >
                Sign in with Google
              </button>
              <button
                type="button"
                onClick={onBackToSite}
                className="w-full px-5 py-2.5 min-h-[40px] rounded-xl text-sm font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
              >
                Return to Marketplace
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <section className="py-16">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white dark:bg-[#191B18] border border-red-200 dark:border-red-900/60 rounded-2xl p-8">
            <ShieldAlert
              className="w-10 h-10 mx-auto text-red-600 dark:text-red-400 mb-3"
              aria-hidden="true"
            />
            <h1 className="font-display text-2xl font-bold text-[#141512] dark:text-[#F4F4F0]">
              Access denied
            </h1>
            <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B]">
              The account{' '}
              <span className="font-mono text-xs text-[#141512] dark:text-[#F4F4F0]">
                {currentUser.email || currentUser.displayName}
              </span>{' '}
              is not listed in{' '}
              <code className="font-mono text-xs">config/adminEmails.js</code>.
            </p>
            <button
              type="button"
              onClick={onBackToSite}
              className="mt-6 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 cursor-pointer"
            >
              Back to Marketplace
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Metrics for Overview
  const activeRentalsCount = allRequests.filter(
    (r) => r.status === 'Accepted'
  ).length;
  const pendingRequestsCount = allRequests.filter(
    (r) => r.status === 'Pending'
  ).length;
  const openReportsCount = reports.filter((r) => r.status === 'Open').length;

  const filteredListings = listings.filter((item) => {
    const q = listingSearch.trim().toLowerCase();
    if (q) {
      const hay = `${item.title} ${item.ownerName} ${item.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (listingFilter === 'pending') return item.approvalStatus === 'Pending';
    if (listingFilter === 'featured') return item.featured;
    if (listingFilter === 'hidden') return item.status === 'Paused';
    return true;
  });

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return `${u.displayName} ${u.college} ${u.uid}`.toLowerCase().includes(q);
  });

  const filteredRequests = allRequests.filter((r) =>
    requestStatusFilter === 'All' ? true : r.status === requestStatusFilter
  );

  const openConfirm = (config: {
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    action: () => Promise<void> | void;
  }) => {
    setConfirmState({
      open: true,
      title: config.title,
      description: config.description,
      confirmLabel: config.confirmLabel,
      danger: config.danger ?? true,
      action: config.action,
    });
  };

  const countActiveRequestsForListing = (listingId: string) =>
    allRequests.filter(
      (r) =>
        r.listingId === listingId &&
        (r.status === 'Pending' || r.status === 'Accepted')
    ).length;

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = newCategoryName.trim();
    if (cleaned.length < 2 || cleaned.length > 50) return;
    if (categories.some((c) => c.toLowerCase() === cleaned.toLowerCase())) {
      return;
    }
    await onSaveCategories([...categories, cleaned]);
    setNewCategoryName('');
  };

  const handleMoveCategory = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await onSaveCategories(next);
  };

  const handleSaveRenameCategory = async (index: number) => {
    const cleaned = renameValue.trim();
    if (cleaned.length < 2 || cleaned.length > 50) return;
    const next = [...categories];
    next[index] = cleaned;
    await onSaveCategories(next);
    setRenamingIndex(null);
    setRenameValue('');
  };

  const handleSaveSettingsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onSaveSiteSettings(settingsForm);
    } finally {
      setSavingSettings(false);
    }
  };

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'listings', label: `Listings (${listings.length})` },
    { id: 'add-product', label: 'Add Product' },
    { id: 'users', label: `Users (${users.length})` },
    { id: 'requests', label: `Requests (${allRequests.length})` },
    {
      id: 'reports',
      label: `Reports${openReportsCount > 0 ? ` (${openReportsCount})` : ''}`,
    },
    { id: 'categories', label: 'Categories' },
    { id: 'settings', label: 'Site Settings' },
  ];

  return (
    <section className="py-8 lg:py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <button
              type="button"
              onClick={onBackToSite}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Back to {siteSettings.brandName}</span>
            </button>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#141512] dark:text-[#F4F4F0]">
              Owner Admin Console
            </h1>
            <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B] mt-0.5">
              Signed in as {currentUser.email}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAddProduct}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[40px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Official Product</span>
          </button>
        </div>

        {/* Admin Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Admin sections"
          className="flex items-center gap-1.5 p-1 bg-[#EFEFEA] dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-xl overflow-x-auto mb-8"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (tab.id === 'settings') {
                    setSettingsForm(siteSettings);
                  }
                  setActiveTab(tab.id);
                }}
                className={`px-3.5 py-2 min-h-[38px] rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#222420] text-[#141512] dark:text-[#F4F4F0] shadow-xs'
                    : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Users', value: users.length },
                { label: 'Total Listings', value: listings.length },
                { label: 'Active Rentals', value: activeRentalsCount },
                { label: 'Pending Requests', value: pendingRequestsCount },
                { label: 'Open Reports', value: openReportsCount },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-5"
                >
                  <div className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                    {stat.label}
                  </div>
                  <div className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  Demo Seed Data Controls
                </h2>
                <p className="mt-1 text-sm text-[#5B5D54] dark:text-[#A3A69B]">
                  Restore all 12 default campus starter listings globally for
                  every visitor and clear demo bookings and seed requests.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openConfirm({
                    title: 'Reset Demo Data?',
                    description:
                      'This restores all 12 default starter listings globally for all visitors and clears demo bookings and seed requests.',
                    confirmLabel: 'Reset Demo Data',
                    danger: true,
                    action: () => onResetDemoData(),
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-sm font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Reset demo data</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE LISTINGS */}
        {activeTab === 'listings' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <input
                type="search"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Search listings by title, owner, or category..."
                className="flex-1 max-w-md px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
              />
              <select
                value={listingFilter}
                onChange={(e) =>
                  setListingFilter(
                    e.target.value as 'all' | 'pending' | 'featured' | 'hidden'
                  )
                }
                className="px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
              >
                <option value="all">All Listings</option>
                <option value="pending">Pending Approval</option>
                <option value="featured">Featured Only</option>
                <option value="hidden">Hidden / Paused</option>
              </select>
            </div>

            {(() => {
              const selectedSet = new Set(selectedListingIds);
              const selectedItems = filteredListings.filter((item) =>
                selectedSet.has(item.id)
              );
              const allVisibleSelected =
                filteredListings.length > 0 &&
                selectedItems.length === filteredListings.length;

              return (
                <>
                  {selectedItems.length > 0 && (
                    <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-xs font-medium text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                        {selectedItems.length} item
                        {selectedItems.length === 1 ? '' : 's'} selected
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {onBulkHideListings && (
                          <>
                            <button
                              type="button"
                              onClick={async () => {
                                await onBulkHideListings(selectedItems, true);
                                setSelectedListingIds([]);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] cursor-pointer"
                            >
                              <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Hide Selected</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await onBulkHideListings(selectedItems, false);
                                setSelectedListingIds([]);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Unhide Selected</span>
                            </button>
                          </>
                        )}

                        {onBulkDeleteListings && (
                          <button
                            type="button"
                            onClick={() => {
                              const totalActive = selectedItems.reduce(
                                (sum, item) =>
                                  sum + countActiveRequestsForListing(item.id),
                                0
                              );
                              openConfirm({
                                title: `Remove ${selectedItems.length} Selected Item${selectedItems.length === 1 ? '' : 's'}?`,
                                description:
                                  totalActive > 0
                                    ? `Warning: ${totalActive} active or pending rental request(s) exist across the selected items. Removing them deletes them globally for all visitors.`
                                    : `Remove ${selectedItems.length} selected item${selectedItems.length === 1 ? '' : 's'} globally for all visitors?`,
                                confirmLabel: 'Remove Selected',
                                danger: true,
                                action: async () => {
                                  await onBulkDeleteListings(selectedItems);
                                  setSelectedListingIds([]);
                                },
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Remove Selected</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedListingIds([])}
                          className="px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[#E4E4DE] dark:border-[#2C2F29] text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                            <th className="py-3.5 pl-4 pr-2 w-10">
                              <input
                                type="checkbox"
                                aria-label="Select all visible listings"
                                checked={allVisibleSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedListingIds(
                                      filteredListings.map((item) => item.id)
                                    );
                                  } else {
                                    setSelectedListingIds([]);
                                  }
                                }}
                                className="w-4 h-4 rounded cursor-pointer"
                              />
                            </th>
                            <th className="py-3.5 px-4 font-medium">Item</th>
                            <th className="py-3.5 px-4 font-medium">Owner</th>
                            <th className="py-3.5 px-4 font-medium">Rate</th>
                            <th className="py-3.5 px-4 font-medium">Status</th>
                            <th className="py-3.5 px-4 font-medium text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E4DE] dark:divide-[#2C2F29]">
                          {filteredListings.map((item) => {
                            const activeCount = countActiveRequestsForListing(
                              item.id
                            );
                            const isSelected = selectedSet.has(item.id);
                            return (
                              <tr key={item.id}>
                                <td className="py-3.5 pl-4 pr-2 align-middle">
                                  <input
                                    type="checkbox"
                                    aria-label={`Select ${item.title}`}
                                    checked={isSelected}
                                    onChange={(e) => {
                                      setSelectedListingIds((prev) =>
                                        e.target.checked
                                          ? [...prev, item.id]
                                          : prev.filter((id) => id !== item.id)
                                      );
                                    }}
                                    className="w-4 h-4 rounded cursor-pointer"
                                  />
                                </td>
                                <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-9 rounded-lg overflow-hidden bg-[#EFEFEA] dark:bg-[#222420] shrink-0">
                                <ResilientImage
                                  src={item.photos[0]}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-[#141512] dark:text-[#F4F4F0] truncate max-w-[240px]">
                                  {item.title}
                                </div>
                                <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                                  {item.category}
                                  {item.featured ? ' · Featured' : ''}
                                  {item.isSeed ? ' · Demo' : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                            {item.ownerName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-[#141512] dark:text-[#F4F4F0]">
                            ₹{formatINR(item.pricePerDay)}/day
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <div className="text-[#141512] dark:text-[#F4F4F0] font-medium">
                              {item.status}
                            </div>
                            <div className="text-[#5B5D54] dark:text-[#A3A69B]">
                              {item.approvalStatus}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {item.approvalStatus === 'Pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onApproveRejectListing(item, 'Approved')
                                    }
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onApproveRejectListing(item, 'Rejected')
                                    }
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                title={
                                  item.featured
                                    ? 'Remove Featured'
                                    : 'Mark Featured'
                                }
                                onClick={() => onToggleFeaturedListing(item)}
                                className={`p-2 rounded-lg border cursor-pointer ${
                                  item.featured
                                    ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                    : 'border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B]'
                                }`}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title={
                                  item.status === 'Paused'
                                    ? 'Unhide Listing'
                                    : 'Hide Listing'
                                }
                                onClick={() => onToggleHideListing(item)}
                                className="p-2 rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
                              >
                                {item.status === 'Paused' ? (
                                  <Eye className="w-3.5 h-3.5" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                title="Edit Listing"
                                onClick={() => onEditListing(item)}
                                className="p-2 rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title="Delete Listing"
                                onClick={() =>
                                  openConfirm({
                                    title: 'Delete Listing?',
                                    description:
                                      activeCount > 0
                                        ? `Warning: "${item.title}" currently has ${activeCount} active or pending rental request(s). Deleting it removes the item permanently.`
                                        : `Delete "${item.title}" permanently from the marketplace?`,
                                    confirmLabel: 'Delete Listing',
                                    danger: true,
                                    action: () => onDeleteListing(item),
                                  })
                                }
                                className="p-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredListings.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 text-center text-sm text-[#5B5D54] dark:text-[#A3A69B]"
                        >
                          No listings match the current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 3: ADD PRODUCT (ADMIN) */}
        {activeTab === 'add-product' && (
          <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-8 text-center max-w-xl">
            <h2 className="font-display text-xl font-bold text-[#141512] dark:text-[#F4F4F0]">
              Add Official {siteSettings.brandName} Product
            </h2>
            <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B]">
              Publish an item directly on behalf of {siteSettings.brandName}{' '}
              with up to 4 photos, campus pickup details, and automatic
              approval.
            </p>
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Open Product Form</span>
            </button>
          </div>
        )}

        {/* TAB 4: MANAGE USERS */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name or college..."
              className="w-full max-w-md px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
            />

            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E4E4DE] dark:border-[#2C2F29] text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                      <th className="py-3.5 px-4 font-medium">Student</th>
                      <th className="py-3.5 px-4 font-medium">College</th>
                      <th className="py-3.5 px-4 font-medium">Status</th>
                      <th className="py-3.5 px-4 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E4DE] dark:divide-[#2C2F29]">
                    {filteredUsers.map((u) => {
                      const isSelf = u.uid === currentUser.uid;
                      return (
                        <tr key={u.uid}>
                          <td className="py-3.5 px-4 font-medium text-[#141512] dark:text-[#F4F4F0]">
                            {u.displayName}
                            {isSelf ? ' (You)' : ''}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                            {u.college}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <span
                              className={`font-medium ${
                                u.blocked
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {u.blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() =>
                                  openConfirm({
                                    title: u.blocked
                                      ? `Unblock ${u.displayName}?`
                                      : `Block ${u.displayName}?`,
                                    description: u.blocked
                                      ? 'This student will regain permission to post listings and submit rental requests.'
                                      : 'Blocked users cannot post new listings or submit rental requests on the marketplace.',
                                    confirmLabel: u.blocked
                                      ? 'Unblock User'
                                      : 'Block User',
                                    danger: !u.blocked,
                                    action: () => onToggleBlockUser(u),
                                  })
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                                  u.blocked
                                    ? 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'
                                    : 'border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400'
                                }`}
                              >
                                {u.blocked ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Unblock</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Block</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-10 text-center text-sm text-[#5B5D54] dark:text-[#A3A69B]"
                        >
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MANAGE REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-5">
            <select
              value={requestStatusFilter}
              onChange={(e) =>
                setRequestStatusFilter(e.target.value as 'All' | RequestStatus)
              }
              className="px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
            >
              <option value="All">All Request Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="Returned">Returned</option>
              <option value="Declined">Declined</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="space-y-3">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#141512] dark:text-[#F4F4F0]">
                        {req.status}
                      </span>
                      <span className="font-mono text-[#5B5D54] dark:text-[#A3A69B] tabular-nums">
                        {formatShortDate(req.startDate)} –{' '}
                        {formatShortDate(req.endDate)}
                      </span>
                      <span className="font-mono text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                        ₹{formatINR(req.totalAmount)}
                      </span>
                    </div>
                    <div className="font-display font-semibold text-[#141512] dark:text-[#F4F4F0]">
                      {req.listingTitle}
                    </div>
                    <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                      Renter: {req.renterName} → Owner: {req.ownerName}
                    </div>
                  </div>

                  {(req.status === 'Pending' || req.status === 'Accepted') && (
                    <button
                      type="button"
                      onClick={() =>
                        openConfirm({
                          title: 'Cancel Rental Request?',
                          description: `Cancel the ${req.status.toLowerCase()} booking for "${req.listingTitle}" between ${req.renterName} and ${req.ownerName}?`,
                          confirmLabel: 'Cancel Request',
                          danger: true,
                          action: () => onCancelAnyRequest(req),
                        })
                      }
                      className="px-4 py-2 min-h-[38px] rounded-xl text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 self-start sm:self-auto cursor-pointer"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              ))}
              {filteredRequests.length === 0 && (
                <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-10 text-center text-sm text-[#5B5D54] dark:text-[#A3A69B]">
                  No rental requests in this filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-10 text-center text-sm text-[#5B5D54] dark:text-[#A3A69B]">
                No listing reports submitted yet.
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                      Status:{' '}
                      <span className="text-[#141512] dark:text-[#F4F4F0]">
                        {report.status}
                      </span>{' '}
                      · {report.reason}
                    </div>
                    <div className="font-display text-base font-semibold text-[#141512] dark:text-[#F4F4F0]">
                      {report.listingTitle}
                    </div>
                    <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                      {report.details}
                    </p>
                  </div>

                  {report.status === 'Open' && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onDismissReport(report)}
                        className="px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => onHideReportedListing(report)}
                        className="px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                      >
                        Hide Listing
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openConfirm({
                            title: 'Delete Reported Listing?',
                            description: `Permanently delete "${report.listingTitle}" and resolve this report?`,
                            confirmLabel: 'Delete Listing',
                            danger: true,
                            action: () => onDeleteReportedListing(report),
                          })
                        }
                        className="px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                      >
                        Delete Listing
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 7: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="max-w-xl space-y-6">
            <form onSubmit={handleAddCategory} className="flex gap-2.5">
              <input
                type="text"
                maxLength={50}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name (e.g., Musical Instruments)"
                className="flex-1 px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 whitespace-nowrap cursor-pointer"
              >
                Add Category
              </button>
            </form>

            <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl divide-y divide-[#E4E4DE] dark:divide-[#2C2F29]">
              {categories.map((cat, idx) => (
                <div
                  key={`${cat}-${idx}`}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  {renamingIndex === idx ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRenameCategory(idx)}
                        className="p-2 rounded-lg bg-emerald-600 text-white cursor-pointer"
                        aria-label="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingIndex(null)}
                        className="p-2 rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] cursor-pointer"
                        aria-label="Cancel rename"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-[#141512] dark:text-[#F4F4F0]">
                        {cat}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveCategory(idx, -1)}
                          aria-label={`Move ${cat} up`}
                          className="p-2 rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === categories.length - 1}
                          onClick={() => handleMoveCategory(idx, 1)}
                          aria-label={`Move ${cat} down`}
                          className="p-2 rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingIndex(idx);
                            setRenameValue(cat);
                          }}
                          aria-label={`Rename ${cat}`}
                          className="p-2 rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              openConfirm({
                                title: `Remove "${cat}" category?`,
                                description:
                                  'Existing items keep their text label, and new listings will use the updated category list.',
                                confirmLabel: 'Remove',
                                danger: true,
                                action: () =>
                                  onSaveCategories(
                                    categories.filter((_, i) => i !== idx)
                                  ),
                              })
                            }
                            aria-label={`Remove ${cat}`}
                            className="p-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: SITE SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettingsSubmit}
            className="max-w-2xl bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-6 space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Site Name
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={settingsForm.brandName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      brandName: e.target.value,
                      logoText: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Support WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={30}
                  value={settingsForm.supportWhatsapp}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      supportWhatsapp: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 min-h-[42px] font-mono text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Hero Headline / Tagline
              </label>
              <input
                type="text"
                required
                minLength={4}
                maxLength={140}
                value={settingsForm.tagline}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, tagline: e.target.value })
                }
                className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Hero Description Text
              </label>
              <textarea
                rows={3}
                required
                minLength={10}
                maxLength={300}
                value={settingsForm.heroSubtitle}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    heroSubtitle: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={settingsForm.contactEmail}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      contactEmail: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      title={preset.label}
                      onClick={() =>
                        setSettingsForm({
                          ...settingsForm,
                          accentColor: preset.value,
                        })
                      }
                      style={{ backgroundColor: preset.value }}
                      className={`w-8 h-8 rounded-lg border-2 cursor-pointer ${
                        settingsForm.accentColor.toLowerCase() ===
                        preset.value.toLowerCase()
                          ? 'border-[#141512] dark:border-white scale-105'
                          : 'border-transparent'
                      }`}
                    />
                  ))}
                  <input
                    type="text"
                    value={settingsForm.accentColor}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        accentColor: e.target.value,
                      })
                    }
                    className="w-24 px-2.5 py-1.5 font-mono text-xs rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">
                Footer Text
              </label>
              <input
                type="text"
                required
                minLength={4}
                maxLength={160}
                value={settingsForm.footerText}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    footerText: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110]"
              />
            </div>

            {/* Moderation Toggle */}
            <div className="pt-2 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  Require admin approval before listings go live
                </div>
                <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                  When enabled, student-submitted items wait in Manage Listings
                  until you approve them.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settingsForm.requireApproval}
                onClick={() =>
                  setSettingsForm({
                    ...settingsForm,
                    requireApproval: !settingsForm.requireApproval,
                  })
                }
                className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0 ${
                  settingsForm.requireApproval
                    ? 'bg-[var(--accent)]'
                    : 'bg-[#D4D4CE] dark:bg-[#2C2F29]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    settingsForm.requireApproval
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                {savingSettings ? 'Saving Live Settings...' : 'Save Site Settings'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmState?.open)}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        confirmLabel={confirmState?.confirmLabel}
        danger={confirmState?.danger}
        busy={confirmBusy}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;
          setConfirmBusy(true);
          try {
            await confirmState.action();
            setConfirmState(null);
          } finally {
            setConfirmBusy(false);
          }
        }}
      />
    </section>
  );
}
