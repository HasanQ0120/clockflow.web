export default function Shield({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3l11 4.2v8.3c0 6.2-4.5 10.8-11 13.5C9.5 26.3 5 21.7 5 15.5V7.2L16 3z" fill="#00ff88" />
      <path d="M10.8 16.2l3.6 3.6 6.8-7.2" fill="none" stroke="#050a05" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
