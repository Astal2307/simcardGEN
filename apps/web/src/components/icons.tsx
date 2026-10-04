export const Coin = ({ s = 16, c = '#8A8F98' }: { s?: number; c?: string }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.5">
    <circle cx="8" cy="8" r="6.5" />
    <circle cx="8" cy="8" r="3" />
  </svg>
);

export const SimIcon = ({ w = 16, h = 18, sw = 2, stroke = 'currentColor' }: { w?: number; h?: number; sw?: number; stroke?: string }) => (
  <svg width={w} height={h} viewBox="0 0 20 22" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
    <path d="M2 2h11l5 5v13H2z" />
    <rect x="6" y="10" width="8" height="6" rx="1" />
  </svg>
);

export const Clock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const Plus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ECEDEF" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ECEDEF" strokeWidth="2.2" strokeLinecap="round">
    <path d="M5 12h14" />
  </svg>
);

export const Close = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ECEDEF" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5BC98A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const Gift = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ECEDEF" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="3.5" y="8" width="17" height="4.5" rx="1" />
    <path d="M5 12.5V20h14v-7.5M12 8v12" />
    <path d="M12 8c-1.2-3.2-5.5-4-5.5-1.5C6.5 8 9.5 8 12 8zM12 8c1.2-3.2 5.5-4 5.5-1.5C17.5 8 14.5 8 12 8z" />
  </svg>
);

export const Lock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7D828B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const TreeTabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="5" rx="1.5" />
    <rect x="3" y="16" width="6" height="5" rx="1.5" />
    <rect x="15" y="16" width="6" height="5" rx="1.5" />
    <path d="M12 8v4M6 16v-4h12v4" />
  </svg>
);

export const AlbumTabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" strokeDasharray="2.5 2.2" />
  </svg>
);

export const Chevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7D828B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flex: 'none' }}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const SpinTabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M9 5v14M15 5v14" />
  </svg>
);

export const AuctionTabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <g transform="rotate(-45 12 10)">
      <rect x="7" y="3" width="10" height="6" rx="1.5" />
      <path d="M12 9v11" />
    </g>
    <path d="M13 21h8" />
  </svg>
);

export const RatingTabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 20v-8M12 20V5M19 20v-5" />
  </svg>
);
