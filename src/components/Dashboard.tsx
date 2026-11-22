import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Edit3,
  Heart,
  Lock,
  MessageSquare,
  Pause,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  ChatMessage,
  Listing,
  RentalRequest,
  SavedItem,
  UserProfile,
  UserReview,
} from '../types/marketplace';
import { formatINR, formatShortDate } from '../utils/dateUtils';
import {
  computeUserRatingSummary,
  readStorageJson,
  sendChatMessage,
  STORAGE_KEYS,
  subscribeChatMessages,
  writeStorageJson,
} from '../services/db.js';
import { ConfirmDialog } from './ConfirmDialog';
import { ResilientImage } from './ResilientImage';
import { ReviewModal } from './ReviewModal';

type DashboardTab =
  | 'listings'
  | 'received'
  | 'rentals'
  | 'saved'
  | 'messages';

interface DashboardProps {
  user: UserProfile | null;
  myListings: Listing[];
  incomingRequests: RentalRequest[];
  myRentals: RentalRequest[];
  onSignIn: () => void;
  onOpenAddListing: () => void;
  onEditListing: (listing: Listing) => void;
  onTogglePauseListing: (listing: Listing) => Promise<void>;
  onDeleteListing: (listing: Listing) => Promise<void>;
  onSelectListingById: (listingId: string) => void;
  onRespondToRequest: (
    request: RentalRequest,
    decision: 'Accepted' | 'Declined'
  ) => Promise<void>;
  onMarkReturned: (request: RentalRequest) => Promise<void>;
  onCancelRequest: (request: RentalRequest) => Promise<void>;
  onSimulateSeedApproval?: (request: RentalRequest) => void;
  onCopyContact: (phone: string) => void;
  onNotifyError?: (message: string) => void;
  reviews?: UserReview[];
  onSubmitReview?: (
    request: RentalRequest,
    payload: { rating: number; comment: string }
  ) => Promise<void>;
  savedItems?: SavedItem[];
  allListings?: Listing[];
  onRemoveSavedItem?: (savedItem: SavedItem) => Promise<void>;
  onBrowseMarketplace?: () => void;
}

const STARTER_PROMPTS = [
  'Hi! What time and campus spot works best for pickup?',
  'Is everything included and working properly?',
  'Can we inspect the item together before handing over the deposit?',
];

function formatMessageTime(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Dashboard({
  user,
  myListings,
  incomingRequests,
  myRentals,
  onSignIn,
  onOpenAddListing,
  onEditListing,
  onTogglePauseListing,
  onDeleteListing,
  onSelectListingById,
  onRespondToRequest,
  onMarkReturned,
  onCancelRequest,
  onSimulateSeedApproval,
  onCopyContact,
  onNotifyError,
  reviews = [],
  onSubmitReview,
  savedItems = [],
  allListings = [],
  onRemoveSavedItem,
  onBrowseMarketplace,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('listings');
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    request: RentalRequest;
    role: 'renter' | 'owner';
  } | null>(null);

  // Real-Time Chat State
  const [selectedChatRequestId, setSelectedChatRequestId] = useState<
    string | null
  >(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [messagesByRequest, setMessagesByRequest] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [seenMap, setSeenMap] = useState<Record<string, number>>(() =>
    readStorageJson(STORAGE_KEYS.CHAT_SEEN, {})
  );
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  // Combine all requests where current user is either owner or renter
  const allThreads = useMemo(() => {
    const map = new Map<string, RentalRequest>();
    for (const r of incomingRequests) map.set(r.id, r);
    for (const r of myRentals) {
      if (!map.has(r.id)) map.set(r.id, r);
    }
    return Array.from(map.values()).sort((a, b) => {
      const aMsgs = messagesByRequest[a.id];
      const bMsgs = messagesByRequest[b.id];
      const aTime =
        aMsgs && aMsgs.length > 0
          ? aMsgs[aMsgs.length - 1].createdAtMs
          : a.createdAtMs;
      const bTime =
        bMsgs && bMsgs.length > 0
          ? bMsgs[bMsgs.length - 1].createdAtMs
          : b.createdAtMs;
      return bTime - aTime;
    });
  }, [incomingRequests, myRentals, messagesByRequest]);

  const activeThreadId = useMemo(() => {
    if (
      selectedChatRequestId &&
      allThreads.some((t) => t.id === selectedChatRequestId)
    ) {
      return selectedChatRequestId;
    }
    return allThreads[0]?.id || null;
  }, [selectedChatRequestId, allThreads]);

  const activeChatRequest = useMemo(
    () => allThreads.find((t) => t.id === activeThreadId) || null,
    [allThreads, activeThreadId]
  );

  // Keep real-time Firestore listeners attached for live threads
  const subscribedThreadKey = useMemo(() => {
    const realThreads = [...incomingRequests, ...myRentals]
      .filter((r) => !r.isSeed)
      .slice(0, 25);
    if (
      activeChatRequest &&
      !activeChatRequest.isSeed &&
      !realThreads.some((r) => r.id === activeChatRequest.id)
    ) {
      realThreads.unshift(activeChatRequest);
    }
    return realThreads.map((r) => r.id).join('|');
  }, [incomingRequests, myRentals, activeChatRequest]);

  useEffect(() => {
    if (!user) {
      setMessagesByRequest({});
      return;
    }

    const candidates = [...incomingRequests, ...myRentals].filter(
      (r) => !r.isSeed
    );
    const deduped = Array.from(
      new Map(candidates.map((r) => [r.id, r])).values()
    ).slice(0, 25);
    if (
      activeChatRequest &&
      !activeChatRequest.isSeed &&
      !deduped.some((r) => r.id === activeChatRequest.id)
    ) {
      deduped.unshift(activeChatRequest);
    }

    const unsubscribers = deduped.map((req) =>
      subscribeChatMessages(
        req,
        user.uid,
        (msgs: ChatMessage[]) => {
          setMessagesByRequest((prev) => ({
            ...prev,
            [req.id]: msgs,
          }));
        },
        () => {
          // Handled via handleFirestoreError in db.js
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user?.uid, subscribedThreadKey]);

  const activeMessages = useMemo(() => {
    if (!activeChatRequest) return [];
    return messagesByRequest[activeChatRequest.id] || [];
  }, [activeChatRequest, messagesByRequest]);

  // Mark active thread messages as seen when user is viewing Messages tab
  useEffect(() => {
    if (
      !user ||
      activeTab !== 'messages' ||
      !activeChatRequest ||
      activeMessages.length === 0
    ) {
      return;
    }
    const latestMs = activeMessages[activeMessages.length - 1].createdAtMs;
    const seenKey = `${user.uid}_${activeChatRequest.id}`;
    if ((seenMap[seenKey] || 0) < latestMs) {
      const next = { ...seenMap, [seenKey]: latestMs };
      setSeenMap(next);
      writeStorageJson(STORAGE_KEYS.CHAT_SEEN, next);
    }
  }, [user, activeTab, activeChatRequest, activeMessages, seenMap]);

  // Auto-scroll chat feed to latest message
  useEffect(() => {
    if (activeTab !== 'messages') return;
    const el = messagesScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [activeTab, activeChatRequest?.id, activeMessages.length]);

  const getUnreadCount = (reqId: string): number => {
    if (!user) return 0;
    const msgs = messagesByRequest[reqId] || [];
    const lastSeen = seenMap[`${user.uid}_${reqId}`] || 0;
    return msgs.filter(
      (m) => m.senderId !== user.uid && m.createdAtMs > lastSeen
    ).length;
  };

  const totalUnreadMessages = useMemo(() => {
    if (!user) return 0;
    return allThreads.reduce((sum, req) => {
      const msgs = messagesByRequest[req.id] || [];
      const lastSeen = seenMap[`${user.uid}_${req.id}`] || 0;
      const count = msgs.filter(
        (m) => m.senderId !== user.uid && m.createdAtMs > lastSeen
      ).length;
      return sum + count;
    }, 0);
  }, [user, allThreads, messagesByRequest, seenMap]);

  const openChatForRequest = (requestId: string) => {
    setSelectedChatRequestId(requestId);
    setMobileChatOpen(true);
    setActiveTab('messages');
  };

  const handleSendChat = async (e: FormEvent, overrideText?: string) => {
    e.preventDefault();
    if (!user || !activeChatRequest || activeChatRequest.isSeed || user.blocked) {
      return;
    }
    const textToSend = (overrideText ?? chatInput).trim();
    if (!textToSend || sendingChat) return;

    setSendingChat(true);
    if (!overrideText) setChatInput('');
    try {
      await sendChatMessage(user, activeChatRequest, textToSend);
    } catch (err) {
      if (!overrideText) setChatInput(textToSend);
      let msg = 'Could not send message. Please try again.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          msg = parsed?.error || err.message;
        } catch {
          msg = err.message;
        }
      }
      if (onNotifyError) onNotifyError(msg);
    } finally {
      setSendingChat(false);
    }
  };

  const myRatingSummary = useMemo(
    () =>
      user
        ? computeUserRatingSummary(reviews, user.uid)
        : { average: null, count: 0, userReviews: [] },
    [reviews, user]
  );

  if (!user) {
    return (
      <section className="py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-8">
            <h1 className="font-display text-2xl font-bold text-[#141512] dark:text-[#F4F4F0]">
              Sign in to view your dashboard
            </h1>
            <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B]">
              Manage your campus listings, chat directly with classmates, accept
              or decline rental requests, and track your borrowed items.
            </p>
            <button
              type="button"
              onClick={onSignIn}
              className="mt-6 px-6 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </section>
    );
  }

  const pendingIncoming = incomingRequests.filter(
    (r) => r.status === 'Pending'
  ).length;

  const activeRequestCountForTarget = deleteTarget
    ? incomingRequests.filter(
        (r) =>
          r.listingId === deleteTarget.id &&
          (r.status === 'Pending' || r.status === 'Accepted')
      ).length
    : 0;

  const statusBadgeStyle = (status: RentalRequest['status']) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
      case 'Accepted':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'Returned':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';
    }
  };

  return (
    <section className="py-8 lg:py-12">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#141512] dark:text-[#F4F4F0]">
              Campus Dashboard
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-sm text-[#5B5D54] dark:text-[#A3A69B]">
              <span>
                {user.displayName} · {user.college}
              </span>
              {myRatingSummary.count > 0 && myRatingSummary.average !== null ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                  <Star
                    className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                  <span className="font-mono font-semibold">
                    {myRatingSummary.average.toFixed(1)}
                  </span>
                  <span>
                    ({myRatingSummary.count}{' '}
                    {myRatingSummary.count === 1 ? 'review' : 'reviews'})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs text-[#8C8E85] bg-[#EFEFEA] dark:bg-[#222420] border border-[#E4E4DE] dark:border-[#2C2F29]">
                  <Star className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>No reviews yet</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddListing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Post New Item</span>
          </button>
        </div>

        {/* Blocked User Banner */}
        {user.blocked && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-sm text-red-800 dark:text-red-200">
            Your account is currently restricted by the campus administrator.
            You cannot post new listings, send rental requests, or send chat
            messages.
          </div>
        )}

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Dashboard sections"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFEFEA] dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-xl mb-8"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'listings'}
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'listings'
                ? 'bg-white dark:bg-[#222420] text-[#141512] dark:text-[#F4F4F0] shadow-xs'
                : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
            }`}
          >
            My Listings ({myListings.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'received'}
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'received'
                ? 'bg-white dark:bg-[#222420] text-[#141512] dark:text-[#F4F4F0] shadow-xs'
                : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
            }`}
          >
            Requests Received ({incomingRequests.length})
            {pendingIncoming > 0 ? ` · ${pendingIncoming} new` : ''}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rentals'}
            onClick={() => setActiveTab('rentals')}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'rentals'
                ? 'bg-white dark:bg-[#222420] text-[#141512] dark:text-[#F4F4F0] shadow-xs'
                : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
            }`}
          >
            My Rentals ({myRentals.length})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'saved'}
            onClick={() => setActiveTab('saved')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-white dark:bg-[#222420] text-[#141512] dark:text-[#F4F4F0] shadow-xs'
                : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${savedItems.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`}
              aria-hidden="true"
            />
            <span>Saved Items ({savedItems.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'messages'}
            onClick={() => setActiveTab('messages')}
            className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-[#222420] text-[#141512] dark:text-[#F4F4F0] shadow-xs'
                : 'text-[#5B5D54] dark:text-[#A3A69B] hover:text-[#141512] dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            <span>Messages ({allThreads.length})</span>
            {totalUnreadMessages > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-mono font-semibold text-white bg-[var(--accent)]">
                {totalUnreadMessages}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: My Listings */}
        {activeTab === 'listings' && (
          <div>
            {myListings.length === 0 ? (
              <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-10 text-center">
                <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  You haven’t listed any items yet
                </h2>
                <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B] max-w-md mx-auto">
                  Got a camera, projector, formal blazer, or calculator sitting
                  in your hostel room? List it in under two minutes and earn
                  from classmates.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddListing}
                  className="mt-5 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Post Your First Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {myListings.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => onSelectListingById(item.id)}
                        className="w-24 h-20 rounded-xl overflow-hidden bg-[#EFEFEA] dark:bg-[#222420] shrink-0 cursor-pointer"
                      >
                        <ResilientImage
                          src={item.photos[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                          {item.category} · {item.status}
                          {item.approvalStatus !== 'Approved'
                            ? ` · ${item.approvalStatus} approval`
                            : ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectListingById(item.id)}
                          className="mt-1 text-left font-display text-base font-semibold text-[#141512] dark:text-[#F4F4F0] hover:text-[var(--accent)] line-clamp-1 cursor-pointer"
                        >
                          {item.title}
                        </button>
                        <div className="mt-1 font-mono text-xs text-[#5B5D54] dark:text-[#A3A69B] tabular-nums">
                          ₹{formatINR(item.pricePerDay)}/day · ₹
                          {formatINR(item.deposit)} deposit
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onEditListing(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] text-xs font-medium text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={async () => {
                            setBusyId(item.id);
                            try {
                              await onTogglePauseListing(item);
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border border-[#E4E4DE] dark:border-[#2C2F29] text-xs font-medium text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] cursor-pointer"
                        >
                          {item.status === 'Paused' ? (
                            <>
                              <Play className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Resume</span>
                            </>
                          ) : (
                            <>
                              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Pause</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Requests Received */}
        {activeTab === 'received' && (
          <div>
            {incomingRequests.length === 0 ? (
              <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-10 text-center">
                <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  No rental requests received yet
                </h2>
                <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B] max-w-md mx-auto">
                  When classmates request to rent one of your posted items,
                  their dates and message will appear here. You can chat with
                  them in-app before deciding to accept.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {incomingRequests.map((req) => {
                  const msgCount = (messagesByRequest[req.id] || []).length;
                  const unreadCount = getUnreadCount(req.id);
                  return (
                    <div
                      key={req.id}
                      className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-16 rounded-xl overflow-hidden bg-[#EFEFEA] dark:bg-[#222420] shrink-0">
                          <ResilientImage
                            src={req.listingPhoto}
                            alt={req.listingTitle}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 text-xs font-medium rounded-lg border ${statusBadgeStyle(req.status)}`}
                            >
                              {req.status}
                            </span>
                            <span className="font-mono text-xs text-[#5B5D54] dark:text-[#A3A69B] tabular-nums">
                              {formatShortDate(req.startDate)} –{' '}
                              {formatShortDate(req.endDate)} ({req.days}{' '}
                              {req.days === 1 ? 'day' : 'days'})
                            </span>
                          </div>

                          <div className="font-display text-base font-semibold text-[#141512] dark:text-[#F4F4F0]">
                            {req.listingTitle}
                          </div>

                          <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                            Requested by{' '}
                            <span className="font-semibold text-[#141512] dark:text-[#F4F4F0]">
                              {req.renterName}
                            </span>{' '}
                            · {req.renterCollege} ·{' '}
                            <span className="font-mono tabular-nums">
                              ₹{formatINR(req.totalAmount)} total
                            </span>
                          </div>

                          {req.message && (
                            <p className="mt-1.5 text-xs text-[#141512] dark:text-[#F4F4F0] bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-lg px-3 py-2">
                              “{req.message}”
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openChatForRequest(req.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-[var(--accent)] border border-[var(--accent)]/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                        >
                          <MessageSquare
                            className="w-4 h-4"
                            aria-hidden="true"
                          />
                          <span>
                            Chat with Renter
                            {msgCount > 0 ? ` (${msgCount})` : ''}
                          </span>
                          {unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                          )}
                        </button>

                        {req.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === req.id}
                              onClick={async () => {
                                setBusyId(req.id);
                                try {
                                  await onRespondToRequest(req, 'Accepted');
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" aria-hidden="true" />
                              <span>Accept &amp; Share Contact</span>
                            </button>
                            <button
                              type="button"
                              disabled={busyId === req.id}
                              onClick={async () => {
                                setBusyId(req.id);
                                try {
                                  await onRespondToRequest(req, 'Declined');
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-medium text-[#141512] dark:text-[#F4F4F0] border border-[#E4E4DE] dark:border-[#2C2F29] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                              <span>Decline</span>
                            </button>
                          </>
                        )}

                        {req.status === 'Accepted' && (
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            onClick={async () => {
                              setBusyId(req.id);
                              try {
                                await onMarkReturned(req);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" aria-hidden="true" />
                            <span>Mark Item Returned</span>
                          </button>
                        )}

                        {req.status === 'Returned' &&
                          !req.isSeed &&
                          (() => {
                            const existingReview = reviews.find(
                              (r) =>
                                r.requestId === req.id &&
                                r.reviewerId === user.uid
                            );
                            if (existingReview) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                                  <Star
                                    className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                    aria-hidden="true"
                                  />
                                  <span>
                                    Reviewed · {existingReview.rating}/5
                                  </span>
                                </span>
                              );
                            }
                            if (!onSubmitReview) return null;
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  setReviewTarget({
                                    request: req,
                                    role: 'owner',
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
                              >
                                <Star className="w-4 h-4" aria-hidden="true" />
                                <span>Leave a Review</span>
                              </button>
                            );
                          })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: My Rentals */}
        {activeTab === 'rentals' && (
          <div>
            {myRentals.length === 0 ? (
              <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-10 text-center">
                <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  No rental requests sent yet
                </h2>
                <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B] max-w-md mx-auto">
                  Browse cameras, projectors, cycles, and formal wear from
                  classmates and send a request for the dates you need.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRentals.map((req) => {
                  const msgCount = (messagesByRequest[req.id] || []).length;
                  const unreadCount = getUnreadCount(req.id);
                  return (
                    <div
                      key={req.id}
                      className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <button
                            type="button"
                            onClick={() => onSelectListingById(req.listingId)}
                            className="w-20 h-16 rounded-xl overflow-hidden bg-[#EFEFEA] dark:bg-[#222420] shrink-0 cursor-pointer"
                          >
                            <ResilientImage
                              src={req.listingPhoto}
                              alt={req.listingTitle}
                              className="w-full h-full object-cover"
                            />
                          </button>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 text-xs font-medium rounded-lg border ${statusBadgeStyle(req.status)}`}
                              >
                                {req.status}
                              </span>
                              <span className="font-mono text-xs text-[#5B5D54] dark:text-[#A3A69B] tabular-nums">
                                {formatShortDate(req.startDate)} –{' '}
                                {formatShortDate(req.endDate)} ({req.days}{' '}
                                {req.days === 1 ? 'day' : 'days'})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectListingById(req.listingId)}
                              className="text-left font-display text-base font-semibold text-[#141512] dark:text-[#F4F4F0] hover:text-[var(--accent)] cursor-pointer"
                            >
                              {req.listingTitle}
                            </button>

                            <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                              Owner: {req.ownerName} ({req.ownerCollege}) ·
                              Pickup: {req.pickupLocation}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono text-base font-semibold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                              ₹{formatINR(req.totalAmount)}
                            </div>
                            <div className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                              incl. ₹{formatINR(req.deposit)} deposit
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openChatForRequest(req.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-semibold text-[var(--accent)] border border-[var(--accent)]/40 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                          >
                            <MessageSquare
                              className="w-3.5 h-3.5"
                              aria-hidden="true"
                            />
                            <span>
                              Chat with Owner
                              {msgCount > 0 ? ` (${msgCount})` : ''}
                            </span>
                            {unreadCount > 0 && (
                              <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                            )}
                          </button>

                          {req.status === 'Pending' && (
                            <div className="flex items-center gap-2">
                              {req.isSeed && onSimulateSeedApproval && (
                                <button
                                  type="button"
                                  onClick={() => onSimulateSeedApproval(req)}
                                  className="px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium text-[var(--accent)] border border-[var(--accent)]/40 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                                >
                                  Simulate Owner Accept
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={busyId === req.id}
                                onClick={async () => {
                                  setBusyId(req.id);
                                  try {
                                    await onCancelRequest(req);
                                  } finally {
                                    setBusyId(null);
                                  }
                                }}
                                className="px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                              >
                                Cancel Request
                              </button>
                            </div>
                          )}

                          {req.status === 'Returned' &&
                            !req.isSeed &&
                            (() => {
                              const existingReview = reviews.find(
                                (r) =>
                                  r.requestId === req.id &&
                                  r.reviewerId === user.uid
                              );
                              if (existingReview) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] rounded-xl text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
                                    <Star
                                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                      aria-hidden="true"
                                    />
                                    <span>
                                      Reviewed · {existingReview.rating}/5
                                    </span>
                                  </span>
                                );
                              }
                              if (!onSubmitReview) return null;
                              return (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReviewTarget({
                                      request: req,
                                      role: 'renter',
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-xl text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                  <Star
                                    className="w-3.5 h-3.5"
                                    aria-hidden="true"
                                  />
                                  <span>Leave a Review</span>
                                </button>
                              );
                            })()}
                        </div>
                      </div>

                      {req.status === 'Accepted' && req.ownerContact && (
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-sm text-emerald-900 dark:text-emerald-200">
                            <Phone
                              className="w-4 h-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>
                              Request accepted! Owner WhatsApp/Phone:{' '}
                              <strong className="font-mono">
                                {req.ownerContact}
                              </strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onCopyContact(req.ownerContact)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-[#191B18] border border-emerald-300 dark:border-emerald-700 text-xs font-medium text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer self-start sm:self-auto"
                          >
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copy Number</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Saved Items / Wishlist */}
        {activeTab === 'saved' && (
          <div>
            {savedItems.length === 0 ? (
              <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-10 text-center">
                <Heart
                  className="w-8 h-8 mx-auto text-[#8C8E85] mb-3"
                  aria-hidden="true"
                />
                <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  Your wishlist is empty
                </h2>
                <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B] max-w-md mx-auto">
                  Tap the heart icon on any camera, projector, cycle, or outfit
                  to bookmark it here and compare dates later.
                </p>
                {onBrowseMarketplace && (
                  <button
                    type="button"
                    onClick={onBrowseMarketplace}
                    className="mt-5 px-5 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Browse Campus Items
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedItems.map((saved) => {
                  const liveListing = allListings.find(
                    (l) => l.id === saved.listingId
                  );
                  const displayTitle = liveListing?.title || saved.listingTitle;
                  const displayPhoto =
                    liveListing?.photos[0] || saved.listingPhoto;
                  const displayPrice =
                    liveListing?.pricePerDay ?? saved.pricePerDay;
                  const isRemoved = !liveListing;
                  const statusLabel = liveListing
                    ? liveListing.status
                    : 'No longer listed';
                  const statusBadge = !liveListing
                    ? 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
                    : liveListing.status === 'Available'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60'
                      : liveListing.status === 'Rented'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700';

                  return (
                    <article
                      key={saved.id}
                      className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-[4/3] bg-[#EFEFEA] dark:bg-[#222420] border-b border-[#E4E4DE] dark:border-[#2C2F29]">
                          <ResilientImage
                            src={displayPhoto}
                            alt={displayTitle}
                            fallbackTitle={displayTitle}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-medium rounded-lg border ${statusBadge}`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <div className="p-5 space-y-2">
                          {liveListing && (
                            <div className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B]">
                              {liveListing.category} · {liveListing.condition}
                              {liveListing.featured ? ' · Featured' : ''}
                            </div>
                          )}

                          <h3 className="font-display text-base font-semibold text-[#141512] dark:text-[#F4F4F0] line-clamp-2">
                            {displayTitle}
                          </h3>

                          <div className="flex items-baseline justify-between gap-2 pt-1">
                            <div className="font-mono text-base font-semibold text-[#141512] dark:text-[#F4F4F0] tabular-nums">
                              ₹{formatINR(displayPrice)}
                              <span className="text-xs font-sans font-normal text-[#5B5D54] dark:text-[#A3A69B]">
                                /day
                              </span>
                            </div>
                            {liveListing && (
                              <div className="font-mono text-xs text-[#5B5D54] dark:text-[#A3A69B] tabular-nums">
                                ₹{formatINR(liveListing.deposit)} deposit
                              </div>
                            )}
                          </div>

                          {liveListing && (
                            <div className="flex items-center justify-between gap-2 text-xs text-[#5B5D54] dark:text-[#A3A69B] pt-1">
                              <span className="truncate">
                                {liveListing.ownerFirstName} ·{' '}
                                {liveListing.ownerCollege}
                              </span>
                              {((liveListing.ownerReviewCount ?? 0) > 0 ||
                                liveListing.isSeed) &&
                                liveListing.ownerRating > 0 && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[#141512] dark:text-[#F4F4F0] shrink-0">
                                    <Star
                                      className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                      aria-hidden="true"
                                    />
                                    <span>
                                      {liveListing.ownerRating.toFixed(1)}
                                    </span>
                                  </span>
                                )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="px-5 py-3.5 border-t border-[#E4E4DE] dark:border-[#2C2F29] flex items-center justify-between gap-2.5">
                        {!isRemoved ? (
                          <button
                            type="button"
                            onClick={() => onSelectListingById(saved.listingId)}
                            className="flex-1 px-4 py-2 min-h-[38px] rounded-xl text-xs font-semibold text-white bg-[var(--accent)] hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            View Item
                          </button>
                        ) : (
                          <span className="text-xs text-[#8C8E85]">
                            Listing unavailable
                          </span>
                        )}

                        {onRemoveSavedItem && (
                          <button
                            type="button"
                            disabled={busyId === `saved_${saved.id}`}
                            onClick={async () => {
                              setBusyId(`saved_${saved.id}`);
                              try {
                                await onRemoveSavedItem(saved);
                              } finally {
                                setBusyId(null);
                              }
                            }}
                            aria-label={`Remove ${displayTitle} from saved items`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-medium text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            <Heart
                              className="w-3.5 h-3.5 fill-rose-500 text-rose-500"
                              aria-hidden="true"
                            />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Real-Time Messages Inbox */}
        {activeTab === 'messages' && (
          <div>
            {allThreads.length === 0 ? (
              <div className="bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl p-10 text-center">
                <MessageSquare
                  className="w-8 h-8 mx-auto text-[#8C8E85] mb-3"
                  aria-hidden="true"
                />
                <h2 className="font-display text-lg font-semibold text-[#141512] dark:text-[#F4F4F0]">
                  No conversations yet
                </h2>
                <p className="mt-2 text-sm text-[#5B5D54] dark:text-[#A3A69B] max-w-md mx-auto">
                  When you send a rental request or receive one on your items, a
                  real-time chat thread opens automatically so you can coordinate
                  pickup details without sharing phone numbers right away.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Conversation List */}
                <div
                  className={`lg:col-span-4 bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden flex flex-col ${
                    mobileChatOpen ? 'hidden lg:flex' : 'flex'
                  }`}
                >
                  <div className="px-4 py-3.5 border-b border-[#E4E4DE] dark:border-[#2C2F29] flex items-center justify-between">
                    <h2 className="font-display text-sm font-semibold text-[#141512] dark:text-[#F4F4F0]">
                      Conversations ({allThreads.length})
                    </h2>
                    <span className="text-[11px] text-[#5B5D54] dark:text-[#A3A69B]">
                      Live sync
                    </span>
                  </div>

                  <div className="divide-y divide-[#E4E4DE] dark:divide-[#2C2F29] max-h-[540px] overflow-y-auto">
                    {allThreads.map((thread) => {
                      const isOwner = thread.ownerId === user.uid;
                      const otherName = isOwner
                        ? thread.renterName
                        : thread.ownerName;
                      const msgs = messagesByRequest[thread.id] || [];
                      const lastMsg =
                        msgs.length > 0 ? msgs[msgs.length - 1] : null;
                      const unread = getUnreadCount(thread.id);
                      const isSelected = activeChatRequest?.id === thread.id;

                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => {
                            setSelectedChatRequestId(thread.id);
                            setMobileChatOpen(true);
                          }}
                          className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-[#EFEFEA]/80 dark:bg-[#222420]'
                              : 'hover:bg-[#F7F7F5] dark:hover:bg-[#141513]'
                          }`}
                        >
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#EFEFEA] dark:bg-[#222420] shrink-0">
                            <ResilientImage
                              src={thread.listingPhoto}
                              alt={thread.listingTitle}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#141512] dark:text-[#F4F4F0] truncate">
                                {otherName}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {lastMsg && (
                                  <span className="text-[10px] font-mono text-[#8C8E85]">
                                    {formatMessageTime(lastMsg.createdAtMs)}
                                  </span>
                                )}
                                {unread > 0 && (
                                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold text-white bg-[var(--accent)]">
                                    {unread}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-xs font-medium text-[#5B5D54] dark:text-[#A3A69B] truncate mt-0.5">
                              {thread.listingTitle}
                            </div>

                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#EFEFEA] dark:bg-[#2A2D27] text-[#5B5D54] dark:text-[#A3A69B]">
                                {isOwner ? 'Renter' : 'Owner'}
                              </span>
                              <span className="text-[11px] text-[#8C8E85] truncate">
                                {lastMsg
                                  ? `${lastMsg.senderId === user.uid ? 'You: ' : ''}${lastMsg.text}`
                                  : thread.message
                                    ? `“${thread.message}”`
                                    : `${thread.status} · ${formatShortDate(thread.startDate)}`}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Real-Time Chat Panel */}
                <div
                  className={`lg:col-span-8 bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] rounded-2xl overflow-hidden flex flex-col min-h-[520px] ${
                    mobileChatOpen ? 'flex' : 'hidden lg:flex'
                  }`}
                >
                  {activeChatRequest ? (
                    <>
                      {/* Chat Header */}
                      <div className="px-4 sm:px-5 py-3.5 border-b border-[#E4E4DE] dark:border-[#2C2F29] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => setMobileChatOpen(false)}
                            aria-label="Back to conversations"
                            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] cursor-pointer"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onSelectListingById(activeChatRequest.listingId)
                            }
                            className="w-11 h-11 rounded-xl overflow-hidden bg-[#EFEFEA] dark:bg-[#222420] shrink-0 cursor-pointer"
                          >
                            <ResilientImage
                              src={activeChatRequest.listingPhoto}
                              alt={activeChatRequest.listingTitle}
                              className="w-full h-full object-cover"
                            />
                          </button>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-sm sm:text-base font-semibold text-[#141512] dark:text-[#F4F4F0] truncate">
                                {activeChatRequest.ownerId === user.uid
                                  ? activeChatRequest.renterName
                                  : activeChatRequest.ownerName}
                              </span>
                              <span
                                className={`px-2 py-0.5 text-[11px] font-medium rounded-md border ${statusBadgeStyle(activeChatRequest.status)}`}
                              >
                                {activeChatRequest.status}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                onSelectListingById(activeChatRequest.listingId)
                              }
                              className="text-xs text-[#5B5D54] dark:text-[#A3A69B] hover:text-[var(--accent)] truncate block text-left cursor-pointer"
                            >
                              {activeChatRequest.listingTitle} ·{' '}
                              {formatShortDate(activeChatRequest.startDate)} –{' '}
                              {formatShortDate(activeChatRequest.endDate)}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeChatRequest.ownerId === user.uid &&
                            activeChatRequest.status === 'Pending' &&
                            !activeChatRequest.isSeed && (
                              <button
                                type="button"
                                disabled={busyId === activeChatRequest.id}
                                onClick={async () => {
                                  setBusyId(activeChatRequest.id);
                                  try {
                                    await onRespondToRequest(
                                      activeChatRequest,
                                      'Accepted'
                                    );
                                  } finally {
                                    setBusyId(null);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                              >
                                <Check
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
                                <span>Accept &amp; Share Contact</span>
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={() =>
                              onSelectListingById(activeChatRequest.listingId)
                            }
                            className="px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-medium border border-[#E4E4DE] dark:border-[#2C2F29] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] cursor-pointer"
                          >
                            View Item
                          </button>
                        </div>
                      </div>

                      {/* Privacy & Context Strip */}
                      <div className="px-4 sm:px-5 py-2.5 bg-[#F7F7F5] dark:bg-[#141513] border-b border-[#E4E4DE] dark:border-[#2C2F29] flex items-center gap-2 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                        <Lock
                          className="w-3.5 h-3.5 text-[var(--accent)] shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          In-app campus chat · Discuss pickup timing &amp; item
                          details privately without sharing your WhatsApp number
                          until you accept.
                        </span>
                      </div>

                      {/* Messages Scroll Area */}
                      <div
                        ref={messagesScrollRef}
                        className="flex-1 p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[380px] min-h-[280px]"
                      >
                        <div className="mx-auto max-w-md text-center px-3 py-2 rounded-xl bg-[#F7F7F5] dark:bg-[#141513] border border-[#E4E4DE] dark:border-[#2C2F29] text-[11px] text-[#5B5D54] dark:text-[#A3A69B]">
                          Pickup spot:{' '}
                          <strong className="text-[#141512] dark:text-[#F4F4F0]">
                            {activeChatRequest.pickupLocation}
                          </strong>{' '}
                          · Total:{' '}
                          <span className="font-mono">
                            ₹{formatINR(activeChatRequest.totalAmount)}
                          </span>
                          {activeChatRequest.message && (
                            <div className="mt-1 italic text-[#141512] dark:text-[#F4F4F0]">
                              Initial request note: “{activeChatRequest.message}”
                            </div>
                          )}
                        </div>

                        {activeChatRequest.isSeed ? (
                          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 text-center max-w-md mx-auto mt-4">
                            This is a starter demo listing, so there isn’t a
                            live classmate account on the other end. Send a
                            request on any real student-posted item to chat in
                            real time!
                          </div>
                        ) : activeMessages.length === 0 ? (
                          <div className="pt-4 text-center space-y-3">
                            <p className="text-xs text-[#5B5D54] dark:text-[#A3A69B]">
                              No messages yet. Start the conversation below or
                              pick a quick question:
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {STARTER_PROMPTS.map((prompt) => (
                                <button
                                  key={prompt}
                                  type="button"
                                  disabled={sendingChat || user.blocked}
                                  onClick={(e) => handleSendChat(e, prompt)}
                                  className="px-3 py-1.5 rounded-xl text-xs border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#141513] text-[#141512] dark:text-[#F4F4F0] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                                >
                                  {prompt}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          activeMessages.map((msg) => {
                            const isMine = msg.senderId === user.uid;
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${
                                  isMine ? 'items-end' : 'items-start'
                                }`}
                              >
                                <div
                                  className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                                    isMine
                                      ? 'bg-[var(--accent)] text-white rounded-br-sm'
                                      : 'bg-[#EFEFEA] dark:bg-[#222420] text-[#141512] dark:text-[#F4F4F0] rounded-bl-sm'
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap">
                                    {msg.text}
                                  </p>
                                </div>
                                <div className="mt-1 px-1 flex items-center gap-1.5 text-[10px] text-[#8C8E85]">
                                  <span>
                                    {isMine
                                      ? 'You'
                                      : msg.senderName.split(' ')[0]}
                                  </span>
                                  <span>·</span>
                                  <span className="font-mono">
                                    {msg.pending
                                      ? 'Sending...'
                                      : formatMessageTime(msg.createdAtMs)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Message Composer */}
                      <form
                        onSubmit={(e) => handleSendChat(e)}
                        className="p-3.5 sm:p-4 border-t border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5]/70 dark:bg-[#141513]/70 flex items-center gap-2.5"
                      >
                        <input
                          type="text"
                          maxLength={1000}
                          disabled={
                            sendingChat ||
                            user.blocked ||
                            Boolean(activeChatRequest.isSeed)
                          }
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder={
                            activeChatRequest.isSeed
                              ? 'Chat is enabled on real student listings'
                              : user.blocked
                                ? 'Messaging disabled while account is restricted'
                                : 'Write a message about pickup, condition, or timing...'
                          }
                          aria-label="Chat message"
                          className="flex-1 px-4 py-2.5 min-h-[44px] text-sm rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] placeholder:text-[#8C8E85] disabled:opacity-60"
                        />
                        <button
                          type="submit"
                          disabled={
                            sendingChat ||
                            !chatInput.trim() ||
                            user.blocked ||
                            Boolean(activeChatRequest.isSeed)
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold text-white bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0 cursor-pointer"
                        >
                          <Send className="w-4 h-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Send</span>
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#5B5D54] dark:text-[#A3A69B]">
                      Select a conversation to start messaging.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Delete Listing (with active request warning!) */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Listing?"
        description={
          deleteTarget
            ? activeRequestCountForTarget > 0
              ? `Warning: "${deleteTarget.title}" currently has ${activeRequestCountForTarget} active or pending rental request(s). Deleting it cannot be undone.`
              : `Delete "${deleteTarget.title}" permanently from your listings?`
            : ''
        }
        confirmLabel="Delete Listing"
        danger
        busy={Boolean(deleteTarget && busyId === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setBusyId(deleteTarget.id);
          try {
            await onDeleteListing(deleteTarget);
            setDeleteTarget(null);
          } finally {
            setBusyId(null);
          }
        }}
      />

      {reviewTarget && onSubmitReview && (
        <ReviewModal
          request={reviewTarget.request}
          reviewerRole={reviewTarget.role}
          onClose={() => setReviewTarget(null)}
          onSubmit={(payload) => onSubmitReview(reviewTarget.request, payload)}
        />
      )}
    </section>
  );
}
