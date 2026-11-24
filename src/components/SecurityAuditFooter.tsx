import { CloakFlowMark } from './CloakFlowMark';
import type { PageId } from './TopNavBar';

interface SecurityAuditFooterProps {
  onNavigate?: (page: PageId) => void;
}

export function SecurityAuditFooter({ onNavigate }: SecurityAuditFooterProps) {
  return (
    <footer
      style={{ borderColor: 'var(--cf-border)' }}
      className="max-w-[1440px] w-[92%] mx-auto py-8 border-t"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate?.('home')}
          className="inline-flex items-center gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
        >
          <CloakFlowMark size={28} />
          <span
            style={{ color: 'var(--cf-text-muted)' }}
            className="font-mono text-xs uppercase tracking-widest"
          >
            CLOAKFLOW // PRIVATE BY DESIGN
          </span>
        </button>

        <p
          style={{ color: 'var(--cf-text-muted)' }}
          className="text-sm font-medium"
        >
          Your words stay yours.
        </p>
      </div>
    </footer>
  );
}
