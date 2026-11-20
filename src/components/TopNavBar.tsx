import { ArrowRight } from 'lucide-react';
import { CloakFlowMark } from './CloakFlowMark';

export type PageId = 'home' | 'production' | 'about' | 'settings';

export const NAV_TABS: Array<{ id: PageId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'production', label: 'Production' },
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
];

interface TopNavBarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  airGapMode: boolean;
  userName: string;
}

export function TopNavBar({
  activePage,
  onNavigate,
  airGapMode,
  userName,
}: TopNavBarProps) {
  const cleanName = userName.trim();
  const statusText = airGapMode
    ? cleanName
      ? `Offline on your device · ${cleanName}`
      : 'Offline on your device'
    : cleanName
      ? `Ready on your device · ${cleanName}`
      : 'Ready on your device';

  return (
    <header
      style={{
        backgroundColor: 'var(--cf-header-bg)',
        borderColor: 'var(--cf-border)',
      }}
      className="sticky top-0 z-50 border-b backdrop-blur-md"
    >
      <div className="max-w-[1440px] w-[92%] mx-auto min-h-16 py-2 flex items-center justify-between gap-4">
        {/* Left: Brand Mark (28x28) + CloakFlow • Ready on your device */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1 shrink-0"
          >
            <CloakFlowMark size={28} />
            <span
              style={{ color: 'var(--cf-text)' }}
              className="font-display text-lg font-bold tracking-tight"
            >
              CloakFlow
            </span>
          </button>

          <span
            style={{ color: 'var(--cf-text-muted)' }}
            className="hidden sm:inline text-xs select-none"
            aria-hidden="true"
          >
            •
          </span>

          <span
            data-testid="header-status-pill"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap truncate max-w-[260px]"
            style={{
              color: airGapMode
                ? 'var(--cf-amber-text)'
                : 'var(--cf-emerald-text)',
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                airGapMode ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              aria-hidden="true"
            />
            <span className="truncate">{statusText}</span>
          </span>
        </div>

        {/* Center Navigation Tabs (Desktop) */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-1"
        >
          {NAV_TABS.map((tab) => {
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`nav-tab-${tab.id}`}
                style={{
                  color: isActive ? 'var(--cf-text)' : 'var(--cf-text-muted)',
                }}
                className="relative px-4 py-2 text-sm font-medium transition-colors hover:opacity-100 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md"
              >
                <span>{tab.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: 'var(--cf-emerald)' }}
                    className="absolute inset-x-3 bottom-0 h-[2px] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right CTA Button */}
        <button
          type="button"
          onClick={() => onNavigate('production')}
          data-testid="header-open-production-btn"
          style={{
            backgroundColor: 'var(--cf-surface-raised)',
            borderColor: 'var(--cf-border-strong)',
            color: 'var(--cf-text)',
            boxShadow: 'var(--cf-specular)',
          }}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold border rounded-md px-3.5 sm:px-4 py-2 transition-all duration-100 active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:border-emerald-500/70"
        >
          <span>Open Production</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile Navigation Tabs */}
      <nav
        aria-label="Mobile navigation"
        style={{ borderColor: 'var(--cf-border)' }}
        className="md:hidden border-t px-4 py-1.5 flex items-center justify-around gap-1"
      >
        {NAV_TABS.map((tab) => {
          const isActive = activePage === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`mobile-nav-tab-${tab.id}`}
              style={{
                color: isActive ? 'var(--cf-text)' : 'var(--cf-text-muted)',
              }}
              className="relative px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{tab.label}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{ backgroundColor: 'var(--cf-emerald)' }}
                  className="absolute inset-x-2 bottom-0 h-[2px] rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
