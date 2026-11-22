import { AppView, SiteSettings } from '../types/marketplace';

interface FooterProps {
  siteSettings: SiteSettings;
  isAdmin: boolean;
  onNavigate: (view: AppView) => void;
}

export function Footer({ siteSettings, isAdmin, onNavigate }: FooterProps) {
  return (
    <footer className="relative z-10 border-t border-[#E4E4DE] dark:border-[#2C2F29] bg-[#F7F7F5]/85 dark:bg-[#101110]/85 backdrop-blur-xs py-8">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#5B5D54] dark:text-[#A3A69B]">
        <div className="space-y-1">
          <div>
            <span className="font-display text-sm font-bold text-[#141512] dark:text-[#F4F4F0]">
              {siteSettings.brandName}
            </span>{' '}
            · {siteSettings.footerText}
          </div>
          <div>
            Support:{' '}
            <a
              href={`mailto:${siteSettings.contactEmail}`}
              className="hover:underline text-[#141512] dark:text-[#F4F4F0]"
            >
              {siteSettings.contactEmail}
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            Browse
          </button>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('safety')}
            className="hover:text-[#141512] dark:hover:text-white cursor-pointer"
          >
            Safety Tips
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="hover:text-[#141512] dark:hover:text-white font-medium text-[var(--accent)] cursor-pointer"
            >
              Admin Panel
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
