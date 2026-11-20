import { CheckCircle2, XCircle } from 'lucide-react';
import { CornerCrosshairs } from './CornerCrosshairs';

interface ComparisonRow {
  feature: string;
  regularCloud: string;
  cloakflowHybrid: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Where your passwords & names go',
    regularCloud: 'Sent to external servers',
    cloakflowHybrid: 'Locked on your laptop',
  },
  {
    feature: 'Speed for quick grammar & summaries',
    regularCloud: '2–4s cloud wait',
    cloakflowHybrid: 'Instant (<150ms) on-device',
  },
  {
    feature: 'Works without Wi-Fi',
    regularCloud: 'Fails completely',
    cloakflowHybrid: 'Full Offline Mode',
  },
  {
    feature: 'Proof of privacy',
    regularCloud: 'Blind trust',
    cloakflowHybrid: 'Live "0 Secrets Shared" receipt',
  },
];

export function EngineeringPillarsSection() {
  return (
    <section
      id="sec-why-safe"
      className="py-20 lg:py-24 max-w-[1440px] w-[92%] mx-auto border-t border-zinc-800/90"
    >
      <div className="max-w-3xl mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">
          04 · WHY CLOAKFLOW WINS
        </p>
        <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#FAFAFA]">
          Built for everyday privacy.
        </h2>
        <p className="mt-4 text-lg text-zinc-300 leading-relaxed">
          See how keeping sensitive details on your laptop compares to pasting
          raw text straight into standard cloud AI tools.
        </p>
      </div>

      {/* High-Contrast Hardware Spec Comparison Matrix */}
      <div className="relative border border-zinc-800/90 bg-[#121215]/95 rounded-md">
        <CornerCrosshairs />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/90 bg-[#09090B]">
                <th className="py-5 px-6 sm:px-8 font-mono text-xs uppercase tracking-wider text-zinc-300 font-semibold w-[40%]">
                  What Matters
                </th>
                <th className="py-5 px-6 sm:px-8 font-display text-base font-semibold text-zinc-300 w-[30%]">
                  Regular Cloud AI
                </th>
                <th className="py-5 px-6 sm:px-8 font-display text-base font-semibold text-emerald-400 bg-emerald-500/5 border-l border-zinc-800/90 w-[30%]">
                  CloakFlow Hybrid AI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/90">
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.feature}
                  className="hover:bg-zinc-900/40 transition-colors"
                >
                  <td className="py-5 px-6 sm:px-8 text-base font-medium text-zinc-100">
                    {row.feature}
                  </td>
                  <td className="py-5 px-6 sm:px-8 text-sm sm:text-base text-zinc-300">
                    <span className="inline-flex items-center gap-2.5">
                      <XCircle
                        className="w-4 h-4 text-rose-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{row.regularCloud}</span>
                    </span>
                  </td>
                  <td className="py-5 px-6 sm:px-8 text-sm sm:text-base font-medium text-emerald-300 bg-emerald-500/5 border-l border-zinc-800/90">
                    <span className="inline-flex items-center gap-2.5">
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{row.cloakflowHybrid}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
