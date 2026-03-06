import React from "react";
import { motion } from "motion/react";

interface LogoProps {
  size?: number;
  className?: string;
}

/* ============================================================
   ROBOT 1 — "Buddy" — Friendly floating bot (login & landing)
   Clean round body, glowing visor eyes, floating + arm wave
   ============================================================ */
export const Logo: React.FC<LogoProps> = ({ size = 64, className = "" }) => {
  const id = React.useId().replace(/:/g, "");
  const [hovered, setHovered] = React.useState(false);
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className={`inline-flex cursor-pointer ${className}`}
    >
      <svg width={size} height={size} viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`bg${id}`} x1="30" y1="50" x2="90" y2="130" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e8eef4" /><stop offset="100%" stopColor="#b8c8d8" />
          </linearGradient>
          <linearGradient id={`hd${id}`} x1="20" y1="8" x2="100" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0f4f8" /><stop offset="100%" stopColor="#c0cdd8" />
          </linearGradient>
          <linearGradient id={`vs${id}`} x1="32" y1="22" x2="88" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2a4560" /><stop offset="100%" stopColor="#0f1e2e" />
          </linearGradient>
          <radialGradient id={`ey${id}`} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#8ef5ec" /><stop offset="100%" stopColor="#34d399" />
          </radialGradient>
          <filter id={`gl${id}`}><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id={`sh${id}`}><feGaussianBlur stdDeviation="3" /></filter>
          <filter id={`cg${id}`}><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {/* Shadow */}
        <ellipse cx="60" cy="134" rx="22" ry="4" fill="#1e293b" opacity="0.12" filter={`url(#sh${id})`}>
          <animate attributeName="rx" values="22;17;22" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.12;0.06;0.12" dur="3s" repeatCount="indefinite" />
        </ellipse>

        {/* Float group */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="0,0;0,-5;0,0" dur="3s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />

          {/* Antenna */}
          <line x1="60" y1="1" x2="60" y2="14" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="1" r="4" fill="#5ce0d8" filter={`url(#gl${id})`}>
            <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="r" values="4;5;4" dur="1.8s" repeatCount="indefinite" />
          </circle>

          {/* Left arm */}
          {hovered ? (
            /* Waving Hi — arm raised up */
            <motion.g
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -20, 20, -20, 20, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: "34px", originY: "75px" }}
            >
              {/* Arm raised up-left */}
              <path d="M34 75 L18 52" stroke="#2c3e55" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M34 75 L18 52" stroke={`url(#bg${id})`} strokeWidth="6" strokeLinecap="round" fill="none" />
              {/* Hand circle */}
              <circle cx="18" cy="48" r="6" fill={`url(#bg${id})`} stroke="#2c3e55" strokeWidth="2" />
            </motion.g>
          ) : (
            /* Resting — arm at side */
            <g>
              <animateTransform attributeName="transform" type="rotate" values="0 38 80;5 38 80;0 38 80" dur="3s" repeatCount="indefinite" />
              <path d="M38 80 L22 96" stroke="#2c3e55" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M38 80 L22 96" stroke={`url(#bg${id})`} strokeWidth="6" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="98" r="5" fill={`url(#bg${id})`} stroke="#2c3e55" strokeWidth="2" />
            </g>
          )}
          {/* Right arm — resting */}
          <g>
            <animateTransform attributeName="transform" type="rotate" values="0 82 80;-5 82 80;0 82 80" dur="3s" repeatCount="indefinite" begin="0.3s" />
            <path d="M82 80 L98 96" stroke="#2c3e55" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M82 80 L98 96" stroke={`url(#bg${id})`} strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="100" cy="98" r="5" fill={`url(#bg${id})`} stroke="#2c3e55" strokeWidth="2" />
          </g>

          {/* Body */}
          <rect x="34" y="68" width="52" height="50" rx="22" fill={`url(#bg${id})`} stroke="#2c3e55" strokeWidth="2.5" />
          {/* Body highlight */}
          <ellipse cx="50" cy="78" rx="8" ry="16" fill="white" opacity="0.15" transform="rotate(-8 50 78)" />
          {/* Belly light */}
          <circle cx="60" cy="95" r="6" fill="none" stroke="#5ce0d8" strokeWidth="1.5" opacity="0.4" filter={`url(#cg${id})`}>
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="60" cy="95" r="2.5" fill="#5ce0d8" opacity="0.5">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Legs */}
          <rect x="42" y="112" width="12" height="14" rx="6" fill={`url(#bg${id})`} stroke="#2c3e55" strokeWidth="2" />
          <rect x="66" y="112" width="12" height="14" rx="6" fill={`url(#bg${id})`} stroke="#2c3e55" strokeWidth="2" />

          {/* Neck */}
          <rect x="52" y="64" width="16" height="8" rx="4" fill="#c0cdd8" stroke="#2c3e55" strokeWidth="1.5" />

          {/* Head */}
          <rect x="22" y="12" width="76" height="56" rx="26" fill={`url(#hd${id})`} stroke="#2c3e55" strokeWidth="2.5" />
          {/* Head highlight */}
          <path d="M44 14c6-2 24-2 32 0" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
          <ellipse cx="40" cy="22" rx="4" ry="8" fill="white" opacity="0.18" transform="rotate(-15 40 22)" />

          {/* Ears */}
          <rect x="14" y="32" width="12" height="20" rx="6" fill="#d8e0e8" stroke="#2c3e55" strokeWidth="2" />
          <rect x="94" y="32" width="12" height="20" rx="6" fill="#d8e0e8" stroke="#2c3e55" strokeWidth="2" />
          {/* Ear lights */}
          <circle cx="20" cy="42" r="2.5" fill="#5ce0d8" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="42" r="2.5" fill="#5ce0d8" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" begin="1s" />
          </circle>

          {/* Visor */}
          <rect x="30" y="24" width="60" height="36" rx="16" fill={`url(#vs${id})`} stroke="#2c3e55" strokeWidth="1.5" />
          {/* Visor reflection */}
          <path d="M42 28c4-1 28-1 36 0" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />

          {/* Eyes — proper circles with glow */}
          <circle cx="45" cy="42" r="8" fill={`url(#ey${id})`} filter={`url(#gl${id})`}>
            <animate attributeName="r" values="8;8.5;8" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="75" cy="42" r="8" fill={`url(#ey${id})`} filter={`url(#gl${id})`}>
            <animate attributeName="r" values="8;8.5;8" dur="2s" repeatCount="indefinite" begin="0.3s" />
          </circle>
          {/* Pupils */}
          <circle cx="46" cy="41" r="3.5" fill="#0f1e2e">
            <animate attributeName="cx" values="46;47;46;45;46" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="76" cy="41" r="3.5" fill="#0f1e2e">
            <animate attributeName="cx" values="76;77;76;75;76" dur="4s" repeatCount="indefinite" />
          </circle>
          {/* Eye reflections */}
          <circle cx="43" cy="39" r="2" fill="white" opacity="0.7" />
          <circle cx="73" cy="39" r="2" fill="white" opacity="0.7" />
          <circle cx="48" cy="44" r="1" fill="white" opacity="0.35" />
          <circle cx="78" cy="44" r="1" fill="white" opacity="0.35" />

          {/* Smile */}
          <path d="M50 54c0 0 5 5 10 5s10-5 10-5" stroke="#5ce0d8" strokeWidth="2.2" strokeLinecap="round" fill="none" filter={`url(#cg${id})`}>
            <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          </path>

          {/* Cheek blush */}
          <circle cx="34" cy="48" r="4" fill="#f0a0b0" opacity="0.12" />
          <circle cx="86" cy="48" r="4" fill="#f0a0b0" opacity="0.12" />
        </g>
      </svg>
    </motion.div>
  );
};

/* ============================================================
   ROBOT 2 — "Scout" — Header compact robot head
   Tilts on hover, antenna blinks
   ============================================================ */
export const LogoMark: React.FC<LogoProps> = ({ size = 20, className = "" }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <motion.div
      whileHover={{ scale: 1.15, rotate: [0, -6, 6, -3, 0] }}
      transition={{ type: "spring", stiffness: 400, damping: 12 }}
      className={`inline-flex cursor-pointer ${className}`}
    >
      <svg width={size} height={size} viewBox="0 0 48 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`mh${id}`} x1="6" y1="8" x2="42" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0f4f8" /><stop offset="100%" stopColor="#b8c8d4" />
          </linearGradient>
          <linearGradient id={`mv${id}`} x1="10" y1="14" x2="38" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2a4560" /><stop offset="100%" stopColor="#0f1e2e" />
          </linearGradient>
          <radialGradient id={`me${id}`} cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#8ef5ec" /><stop offset="100%" stopColor="#34d399" />
          </radialGradient>
          <filter id={`mg${id}`}><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {/* Antenna */}
        <line x1="24" y1="2" x2="24" y2="10" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="24" cy="2" r="2.5" fill="#5ce0d8" filter={`url(#mg${id})`}>
          <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="r" values="2.5;3;2.5" dur="1.5s" repeatCount="indefinite" />
        </circle>

        {/* Head */}
        <rect x="4" y="10" width="40" height="34" rx="16" fill={`url(#mh${id})`} stroke="#2c3e55" strokeWidth="2" />
        <ellipse cx="17" cy="18" rx="3" ry="5" fill="white" opacity="0.2" transform="rotate(-12 17 18)" />

        {/* Ears */}
        <rect x="0" y="22" width="6" height="12" rx="3" fill="#d8e0e8" stroke="#2c3e55" strokeWidth="1.5" />
        <rect x="42" y="22" width="6" height="12" rx="3" fill="#d8e0e8" stroke="#2c3e55" strokeWidth="1.5" />
        <circle cx="3" cy="28" r="1.2" fill="#5ce0d8" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="45" cy="28" r="1.2" fill="#5ce0d8" opacity="0.6">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="1s" />
        </circle>

        {/* Visor */}
        <rect x="9" y="17" width="30" height="20" rx="9" fill={`url(#mv${id})`} stroke="#2c3e55" strokeWidth="1" />

        {/* Eyes - proper circles */}
        <circle cx="18" cy="27" r="4" fill={`url(#me${id})`} filter={`url(#mg${id})`}>
          <animate attributeName="r" values="4;4.3;4" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="30" cy="27" r="4" fill={`url(#me${id})`} filter={`url(#mg${id})`}>
          <animate attributeName="r" values="4;4.3;4" dur="2s" repeatCount="indefinite" begin="0.3s" />
        </circle>
        {/* Pupils */}
        <circle cx="18.5" cy="26.5" r="1.8" fill="#0f1e2e" />
        <circle cx="30.5" cy="26.5" r="1.8" fill="#0f1e2e" />
        {/* Reflections */}
        <circle cx="17" cy="25.5" r="1" fill="white" opacity="0.7" />
        <circle cx="29" cy="25.5" r="1" fill="white" opacity="0.7" />

        {/* Smile */}
        <path d="M20 33c0 0 2 2.5 4 2.5s4-2.5 4-2.5" stroke="#5ce0d8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    </motion.div>
  );
};

/* ============================================================
   ROBOT 3 — "Orb" — Spherical bot for LivePreview empty state
   Round body, single big eye, orbiting ring, gentle spin
   ============================================================ */
export const RobotOrb: React.FC<LogoProps> = ({ size = 80, className = "" }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      whileHover={{ scale: 1.1, rotate: 10 }}
      className={`inline-flex cursor-pointer ${className}`}
    >
      <svg width={size} height={size} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={`ob${id}`} cx="45%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#f0f3f7" /><stop offset="100%" stopColor="#a8b8c8" />
          </radialGradient>
          <linearGradient id={`ov${id}`} x1="30" y1="28" x2="70" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3d5570" /><stop offset="100%" stopColor="#1b2c3d" />
          </linearGradient>
          <filter id={`og${id}`}><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id={`os${id}`}><feGaussianBlur stdDeviation="4" /></filter>
        </defs>

        {/* Shadow */}
        <ellipse cx="50" cy="104" rx="20" ry="4" fill="#1e293b" opacity="0.1" filter={`url(#os${id})`}>
          <animate attributeName="rx" values="20;15;20" dur="3s" repeatCount="indefinite" />
        </ellipse>

        {/* Orbiting ring */}
        <ellipse cx="50" cy="50" rx="42" ry="10" stroke="#5ce0d8" strokeWidth="1.5" fill="none" opacity="0.3" transform="rotate(-20 50 50)">
          <animateTransform attributeName="transform" type="rotate" values="-20 50 50;340 50 50" dur="8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite" />
        </ellipse>
        {/* Orbiting dot */}
        <circle cx="50" cy="50" r="3" fill="#5ce0d8" filter={`url(#og${id})`}>
          <animateMotion dur="8s" repeatCount="indefinite" path="M0,0 A42,10 -20 1 1 0,-0.01" />
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Main sphere */}
        <circle cx="50" cy="50" r="34" fill={`url(#ob${id})`} stroke="#2c3e55" strokeWidth="2.5" />
        {/* Highlight */}
        <ellipse cx="40" cy="36" rx="8" ry="12" fill="white" opacity="0.2" transform="rotate(-20 40 36)" />

        {/* Visor */}
        <rect x="28" y="32" width="44" height="30" rx="14" fill={`url(#ov${id})`} stroke="#2c3e55" strokeWidth="1.5" />

        {/* Single big eye */}
        <circle cx="50" cy="46" r="10" fill="#1b2c3d" />
        <circle cx="50" cy="46" r="7" fill="#5ce0d8" filter={`url(#og${id})`}>
          <animate attributeName="r" values="7;7.8;7" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="46" r="3.5" fill="#1b2c3d" />
        <circle cx="47" cy="43" r="2" fill="white" opacity="0.6" />
        <circle cx="53" cy="48" r="1" fill="white" opacity="0.3" />

        {/* Little antenna nubs */}
        <circle cx="36" cy="22" r="3" fill="#dce3ea" stroke="#2c3e55" strokeWidth="1.5" />
        <circle cx="64" cy="22" r="3" fill="#dce3ea" stroke="#2c3e55" strokeWidth="1.5" />
        <line x1="36" y1="25" x2="40" y2="33" stroke="#2c3e55" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="64" y1="25" x2="60" y2="33" stroke="#2c3e55" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="36" cy="22" r="1.5" fill="#5ce0d8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="64" cy="22" r="1.5" fill="#5ce0d8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" repeatCount="indefinite" begin="0.9s" />
        </circle>
      </svg>
    </motion.div>
  );
};

/* ============================================================
   ROBOT 4 — "Chip" — Tiny waving bot for chat widget
   Square-ish, one arm waves, bouncy
   ============================================================ */
export const RobotChat: React.FC<LogoProps> = ({ size = 24, className = "" }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <motion.div
      whileHover={{ scale: 1.2, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={`inline-flex ${className}`}
    >
      <svg width={size} height={size} viewBox="0 0 40 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`ch${id}`} x1="5" y1="5" x2="35" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#eef1f5" /><stop offset="100%" stopColor="#bcc8d4" />
          </linearGradient>
          <filter id={`cg${id}`}><feGaussianBlur stdDeviation="1" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>

        {/* Body */}
        <rect x="8" y="22" width="24" height="18" rx="9" fill={`url(#ch${id})`} stroke="#2c3e55" strokeWidth="1.8" />

        {/* Left arm (waving!) */}
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0 12 28;-20 12 28;0 12 28;10 12 28;0 12 28" dur="1.5s" repeatCount="indefinite" />
          <path d="M10 28c-4 1-8 4-8 7c0 2 2 3 3 2c2-1 4-4 5-6" fill={`url(#ch${id})`} stroke="#2c3e55" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        {/* Right arm */}
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0 28 28;5 28 28;0 28 28" dur="2s" repeatCount="indefinite" />
          <path d="M30 28c4 1 8 4 8 7c0 2-2 3-3 2c-2-1-4-4-5-6" fill={`url(#ch${id})`} stroke="#2c3e55" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Head */}
        <rect x="6" y="2" width="28" height="22" rx="10" fill={`url(#ch${id})`} stroke="#2c3e55" strokeWidth="1.8" />

        {/* Antenna */}
        <line x1="20" y1="0" x2="20" y2="3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="0" r="1.8" fill="#5ce0d8" filter={`url(#cg${id})`}>
          <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
        </circle>

        {/* Visor */}
        <rect x="10" y="7" width="20" height="13" rx="6" fill="#2c3e55" />

        {/* Eyes */}
        <circle cx="16" cy="13" r="2.5" fill="#5ce0d8" filter={`url(#cg${id})`}>
          <animate attributeName="r" values="2.5;2.8;2.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="24" cy="13" r="2.5" fill="#5ce0d8" filter={`url(#cg${id})`}>
          <animate attributeName="r" values="2.5;2.8;2.5" dur="2s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        <circle cx="16" cy="13" r="1" fill="#1b2c3d" />
        <circle cx="24" cy="13" r="1" fill="#1b2c3d" />
      </svg>
    </motion.div>
  );
};
