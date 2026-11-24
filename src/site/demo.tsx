import type { ReactNode } from 'react';
import { TokenVault, restoreSegments, sanitize, type Segment } from '../services/tokenizer';

/** Every demo on the page is produced by the real tokenizer, not typed by hand. */
function build(text: string, reply: string) {
  const vault = new TokenVault();
  const s = sanitize(text, vault);
  return { original: text, segments: s.segments, sanitized: s.sanitized, entries: s.entries, vault, reply, restoredReply: restoreSegments(reply, vault) };
}

export const FIREWALL = build(
  'Contact Sarah at sarah@example.com about account 48291.',
  "Thanks for flagging this. I'll email [PERSON_1] at [EMAIL_1] today and review account [ID_1] for recent changes.",
);

export const PROBLEM = build(
  'Draft a reply to Sarah Chen at sarah.chen@northwind.com about invoice 90417 for $48,200. Her direct line is +1 (415) 555-0132 and the billing key is sk_live_51Hx9a2.',
  '',
);

/** The original text with each sensitive value picked out. */
export function OriginalText({ demo, mark }: { demo: typeof FIREWALL; mark: 'exposed' | 'found' | 'none' }): ReactNode {
  return demo.segments.map((s: Segment, i: number) => {
    if (!s.token) return <span key={i}>{s.text}</span>;
    const value = demo.vault.get(s.token)!.value;
    return mark === 'none' ? <span key={i}>{value}</span> : <mark key={i} className={mark}>{value}</mark>;
  });
}

export function SanitizedText({ demo }: { demo: typeof FIREWALL }): ReactNode {
  return demo.segments.map((s: Segment, i: number) => (s.token ? <code key={i} className="tok">{s.text}</code> : <span key={i}>{s.text}</span>));
}

/** A model reply that still contains placeholders. */
export function ReplyWithTokens({ text }: { text: string }): ReactNode {
  return text.split(/(\[[A-Z_]+_\d+\])/g).map((p, i) => (/^\[[A-Z_]+_\d+\]$/.test(p) ? <code key={i} className="tok">{p}</code> : <span key={i}>{p}</span>));
}
