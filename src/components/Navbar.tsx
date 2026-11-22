import { useState } from 'react';
import { Menu, Moon, ShieldCheck, Sun, X, User as UserIcon } from 'lucide-react';
import { AppView, SiteSettings, UserProfile } from '../types/marketplace';

interface NavbarProps {
  siteSettings: SiteSettings;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAddListing: () => void;
  onOpenPermissions: () => void;
  missingPermissionsCount?: number;
  user: UserProfile | null;
  isAdmin: boolean;
  onSignIn: () => void;
  onOpenProfile: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  pendingIncomingCount: number;
}

export function Navbar({
  siteSettings,
  currentView,
  onNavigate,
  onOpenAddListing,
  onOpenPermissions,
  missingPermissionsCount = 0,
  user,
  isAdmin,
  onSignIn,
  onOpenProfile,
  darkMode,
  onToggleDarkMode,
  pendingIncomingCount,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (view: AppView) => {
    setMobileOpen(false);
    onNavigate(view);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F7F5]/95 dark:bg-[#101110]/95 backdrop-blur-sm border-b border-[#E4E4DE] dark:border-[#2C2F29]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Dynamic Site Logo Wordmark */}
        <button
          type="button"
          onClick={() => handleLink('home')}
          className="font-display text-xl font-bold tracking-tight text-[#141512] dark:text-[#F4F4F0] whitespace-nowrap shrink-0 cursor-pointer"
        >
          {siteSettings.logoText}
        </button>

        {/* Zone 2: Concise Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#5B5D54] dark:text-[#A3A69B]"
        >
          <button
            type="button"
            onClick={() => handleLink('home')}
            className={`py-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#141512] dark:hover:text-[#F4F4F0] ${
              currentView === 'home' || currentView === 'detail'
                ? 'text-[#141512] dark:text-[#F4F4F0] underline underline-offset-4'
                : ''
            }`}
          >
            Browse
          </button>

          <button
            type="button"
            onClick={() => handleLink('dashboard')}
            className={`py-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#141512] dark:hover:text-[#F4F4F0] ${
              currentView === 'dashboard'
                ? 'text-[#141512] dark:text-[#F4F4F0] underline underline-offset-4'
                : ''
            }`}
          >
            Dashboard
            {pendingIncomingCount > 0 ? ` (${pendingIncomingCount})` : ''}
          </button>

          <button
            type="button"
            onClick={() => handleLink('safety')}
            className={`py-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#141512] dark:hover:text-[#F4F4F0] ${
              currentView === 'safety'
                ? 'text-[#141512] dark:text-[#F4F4F0] underline underline-offset-4'
                : ''
            }`}
          >
            Safety
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenAddListing();
            }}
            className="py-2 whitespace-nowrap shrink-0 cursor-pointer text-[var(--accent)] hover:underline underline-offset-4"
          >
            Post Item
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleLink('admin')}
              className={`py-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-[#141512] dark:hover:text-[#F4F4F0] ${
                currentView === 'admin'
                  ? 'text-[var(--accent)] underline underline-offset-4 font-semibold'
                  : 'text-[var(--accent)]'
              }`}
            >
              Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Permissions + Theme Toggle + User Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenPermissions}
            title="Device & Contact Permissions"
            aria-label="Manage Location, Phone, Storage & Camera permissions"
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            {missingPermissionsCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)]"
              />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="hidden sm:inline-flex items-center gap-2.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-sm font-medium text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#222420] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.displayName}
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-[#5B5D54] dark:text-[#A3A69B]" />
              )}
              <span className="max-w-[120px] truncate">{user.firstName}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 rounded-xl transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign in with Google
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-[#E4E4DE] dark:border-[#2C2F29] bg-white dark:bg-[#191B18] text-[#141512] dark:text-[#F4F4F0] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Top-Right Corner Brand Logo */}
          <button
            type="button"
            onClick={() => handleLink('home')}
            title={`${siteSettings.brandName} Home`}
            aria-label={`${siteSettings.brandName} logo`}
            className="inline-flex items-center justify-center w-16 sm:w-20 h-10 sm:h-11 rounded-xl overflow-hidden border border-[#E4E4DE] dark:border-[#2C2F29] bg-[#FAF1ED] shadow-xs hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
          >
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-11-22_at_10.58.39_PM_ebcb51a4.jpeg"
              alt={siteSettings.brandName}
              className="w-full h-full object-cover object-[50%_53%] scale-[1.28]"
            />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5] dark:bg-[#101110] px-4 py-3">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleLink('home')}
              className="text-left px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#191B18] cursor-pointer"
            >
              Browse Items
            </button>
            <button
              type="button"
              onClick={() => handleLink('dashboard')}
              className="text-left px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#191B18] cursor-pointer"
            >
              Dashboard
              {pendingIncomingCount > 0 ? ` (${pendingIncomingCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => handleLink('safety')}
              className="text-left px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#191B18] cursor-pointer"
            >
              Campus Safety
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenAddListing();
              }}
              className="text-left px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[var(--accent)] hover:bg-[#EFEFEA] dark:hover:bg-[#191B18] cursor-pointer"
            >
              Post Item
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleLink('admin')}
                className="text-left px-3 py-3 min-h-[44px] rounded-xl text-sm font-semibold text-[var(--accent)] hover:bg-[#EFEFEA] dark:hover:bg-[#191B18] cursor-pointer"
              >
                Admin Panel
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenPermissions();
              }}
              className="text-left px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#141512] dark:text-[#F4F4F0] hover:bg-[#EFEFEA] dark:hover:bg-[#191B18] cursor-pointer"
            >
              Permissions (Location, Phone, Storage, Camera)
            </button>

            <div className="pt-2 mt-1 border-t border-[#E4E4DE] dark:border-[#2C2F29]">
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenProfile();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-[#141512] dark:text-[#F4F4F0] bg-white dark:bg-[#191B18] border border-[#E4E4DE] dark:border-[#2C2F29] cursor-pointer"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>{user.displayName} — Profile &amp; Contact</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onSignIn();
                  }}
                  className="w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 cursor-pointer"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
