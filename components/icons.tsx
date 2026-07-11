/**
 * Hand-drawn flat icons — emoji render inconsistently across platforms and
 * neither 🏊 nor 🐟 says "Basel". The Wickelfisch (the fish-shaped swim bag
 * every Rhyschwummer tows) marks the exit; a swimmer marks the entry.
 */

export function SwimmerIcon({ className = "h-5 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 22" className={className} aria-hidden>
      <circle cx="20" cy="6" r="3.4" fill="#7dd3fc" />
      {/* body + leading arm */}
      <path
        d="M4 13 Q10 8 16 11 L26 8"
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* water */}
      <path
        d="M2 18 q3.5 -2.6 7 0 q3.5 2.6 7 0 q3.5 -2.6 7 0 q3.5 2.6 7 0"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function WickelfischIcon({ className = "h-5 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 20" className={className} aria-hidden>
      {/* tail */}
      <polygon points="26,10 33,3.5 33,16.5" fill="#fb7185" stroke="#881337" strokeWidth="1.4" strokeLinejoin="round" />
      {/* body */}
      <path
        d="M26 10 Q21 1.5 12 2.5 Q4 3.5 1.5 10 Q4 16.5 12 17.5 Q21 18.5 26 10 Z"
        fill="#fb7185"
        stroke="#881337"
        strokeWidth="1.4"
      />
      {/* roll-top folds at the nose */}
      <path d="M4.5 6.5 L4.5 13.5 M7.5 5 L7.5 15" stroke="#881337" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1.6" fill="#881337" />
    </svg>
  );
}

/** SVG-map variants, drawn into the 1000×620 viewBox at a marker point. */
export function MapSwimmer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 16},${y - 34}) scale(1.05)`} pointerEvents="none">
      <circle cx="20" cy="6" r="3.6" fill="#e0f2fe" stroke="#0c4a6e" strokeWidth="1" />
      <path d="M4 13 Q10 8 16 11 L26 8" fill="none" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M2 18 q3.5 -2.6 7 0 q3.5 2.6 7 0 q3.5 -2.6 7 0 q3.5 2.6 7 0"
        fill="none"
        stroke="#7dd3fc"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function MapWickelfisch({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 17},${y + 18})`} pointerEvents="none">
      <polygon points="26,10 33,3.5 33,16.5" fill="#fb7185" stroke="#4c0519" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M26 10 Q21 1.5 12 2.5 Q4 3.5 1.5 10 Q4 16.5 12 17.5 Q21 18.5 26 10 Z"
        fill="#fb7185"
        stroke="#4c0519"
        strokeWidth="1.6"
      />
      <path d="M4.5 6.5 L4.5 13.5 M7.5 5 L7.5 15" stroke="#4c0519" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="8" r="1.7" fill="#4c0519" />
    </g>
  );
}

/** iOS-style share: square with arrow rising out. */
export function ShareIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 7.5 H6.5 A2.5 2.5 0 0 0 4 10 v8.5 A2.5 2.5 0 0 0 6.5 21 h11 a2.5 2.5 0 0 0 2.5 -2.5 V10 a2.5 2.5 0 0 0 -2.5 -2.5 H16" />
      <path d="M12 14.5 V2.8 M8.3 6.2 L12 2.5 L15.7 6.2" />
    </svg>
  );
}

/** Vertical kebab "more" menu. */
export function MoreIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}
