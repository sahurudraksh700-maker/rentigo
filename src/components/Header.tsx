import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onStartProject: () => void;
}

const NAV_ITEMS = [
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Work', href: '#work' },
  { label: 'Process', href: '#process' },
  { label: 'Pricing', href: '#pricing' },
];

export function Header({ onStartProject }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F8F8F6]/95 backdrop-blur-sm border-b border-[#E2E2DC]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className="font-display text-lg font-bold tracking-tight text-[#111210] whitespace-nowrap shrink-0"
        >
          Meridian
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#575852]"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-[#111210] underline-offset-4 hover:underline transition-colors duration-150 whitespace-nowrap shrink-0 py-2"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onStartProject}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 min-h-[40px] text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-[#1D4ED8] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Start a Project
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E2E2DC] bg-white text-[#111210] hover:bg-[#F0F0EC] transition-colors duration-150 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E2DC] bg-[#F8F8F6] px-4 py-4">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="px-3 py-3 text-base font-medium text-[#111210] rounded-lg hover:bg-[#ECECE7] transition-colors duration-150"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onStartProject();
              }}
              className="mt-2 w-full px-5 py-3 min-h-[44px] text-sm font-medium text-white bg-[#1E40AF] rounded-lg hover:bg-[#1D4ED8] transition-colors duration-150 cursor-pointer"
            >
              Start a Project
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
