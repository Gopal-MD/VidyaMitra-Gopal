import { motion } from 'framer-motion';

/**
 * VidyaMitra brand logo mark — matches reference image exactly.
 *
 * Left arm  — straight diagonal from upper-left down to the node
 * Right arm — sweeps from upper-right, bows outward to the right,
 *             curves back down to the same node (like a reversed-arc stroke)
 * Node      — filled circle where both arms converge
 *
 * 3D effect: metallic gradient + depth extrusion + brushed highlight
 * Shine: sweeps along each arm once on mount / refresh only
 */

interface VidyaMitraLogoProps {
  size?: number;
  className?: string;
}

const VidyaMitraLogo = ({ size = 36, className = '' }: VidyaMitraLogoProps) => {
  const p = 'vml';

  return (
    <motion.svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
      style={{ width: size, height: size, overflow: 'visible' }}
    >
      <defs>
        {/* Metallic diagonal gradient — light upper-left → dark lower-right */}
        <linearGradient id={`${p}-m`} x1="10" y1="5" x2="88" y2="93" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#f0e8ff" />
          <stop offset="15%"  stopColor="#c084fc" />
          <stop offset="42%"  stopColor="#7c3aed" />
          <stop offset="70%"  stopColor="#5b21b6" />
          <stop offset="100%" stopColor="#2e1065" />
        </linearGradient>

        {/* Brushed-metal highlight streak */}
        <linearGradient id={`${p}-h`} x1="10" y1="5" x2="46" y2="93" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.62)" />
          <stop offset="40%"  stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
        </linearGradient>

        {/* Radial gradient for convergence dot */}
        <radialGradient id={`${p}-d`} cx="36%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#f5f3ff" />
          <stop offset="38%"  stopColor="#a855f7" />
          <stop offset="100%" stopColor="#3b0764" />
        </radialGradient>

        {/* 3D inner-shadow filter */}
        <filter id={`${p}-f`} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="2.5" dy="3.5" stdDeviation="2.5" floodColor="#1e0533" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* ── Extrusion / depth layer ─────────────────────────────────────── */}
      <g transform="translate(3.5, 4.5)" opacity="0.42">
        <path d="M 15 8 L 46 90"                    stroke="#1a0040" strokeWidth="17" strokeLinecap="round" />
        <path d="M 82 8 C 112 30, 108 68, 46 90"    stroke="#1a0040" strokeWidth="17" strokeLinecap="round" />
        <circle cx="46" cy="90" r="13" fill="#1a0040" />
      </g>

      {/* ── Main metallic strokes ───────────────────────────────────────── */}
      <path d="M 15 8 L 46 90"
        stroke={`url(#${p}-m)`} strokeWidth="15" strokeLinecap="round"
        filter={`url(#${p}-f)`} />
      <path d="M 82 8 C 112 30, 108 68, 46 90"
        stroke={`url(#${p}-m)`} strokeWidth="15" strokeLinecap="round"
        filter={`url(#${p}-f)`} />

      {/* ── Brushed-metal highlight streaks ────────────────────────────── */}
      <path d="M 15 8 L 46 90"                 stroke={`url(#${p}-h)`} strokeWidth="5.5" strokeLinecap="round" opacity="0.85" />
      <path d="M 82 8 C 112 30, 108 68, 46 90" stroke={`url(#${p}-h)`} strokeWidth="5.5" strokeLinecap="round" opacity="0.55" />

      {/* ── Convergence dot with specular highlight ─────────────────────── */}
      <circle cx="46" cy="90" r="11" fill={`url(#${p}-d)`} filter={`url(#${p}-f)`} />
      <circle cx="43" cy="86" r="3.5" fill="rgba(255,255,255,0.52)" />

      {/* ── Shine sweep on left arm — once per mount / refresh ──────────── */}
      <motion.path
        d="M 15 8 L 46 90"
        stroke="rgba(255,255,255,0.85)" strokeWidth="6" strokeLinecap="round"
        initial={{ pathLength: 0.18, pathOffset: -0.18, opacity: 0 }}
        animate={{ pathOffset: 1.22, opacity: [0, 0.85, 0] }}
        transition={{ duration: 0.88, ease: 'easeInOut', delay: 0.38 }}
      />

      {/* ── Shine sweep on right arm — staggered ────────────────────────── */}
      <motion.path
        d="M 82 8 C 112 30, 108 68, 46 90"
        stroke="rgba(255,255,255,0.75)" strokeWidth="6" strokeLinecap="round"
        initial={{ pathLength: 0.15, pathOffset: -0.15, opacity: 0 }}
        animate={{ pathOffset: 1.18, opacity: [0, 0.75, 0] }}
        transition={{ duration: 0.88, ease: 'easeInOut', delay: 0.56 }}
      />
    </motion.svg>
  );
};

export default VidyaMitraLogo;
