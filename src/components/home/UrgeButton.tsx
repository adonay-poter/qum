import { motion, useReducedMotion } from 'framer-motion';

export type UrgeButtonSize = 'default' | 'compact';

interface UrgeButtonProps {
  onTrigger: () => void;
  disabled?: boolean;
  size?: UrgeButtonSize;
}

const SIZES = {
  default: {
    button: 'h-[15rem] w-[15rem] min-h-[13rem] min-w-[13rem]',
    glow: 'h-[17.5rem] w-[17.5rem]',
    ripple: 'h-64 w-64',
    surf: 'text-[2.1rem]',
  },
  compact: {
    button: 'h-[13rem] w-[13rem] min-h-[12rem] min-w-[12rem]',
    glow: 'h-[15rem] w-[15rem]',
    ripple: 'h-56 w-56',
    surf: 'text-[1.85rem]',
  },
} as const;

export function UrgeButton({ onTrigger, disabled, size = 'default' }: UrgeButtonProps) {
  const reduceMotion = useReducedMotion();
  const tokens = SIZES[size];

  return (
    <div 
      className="relative flex items-center justify-center select-none"
      style={{ perspective: '1000px' }}
    >
      {/* Soft blurry ambient breathing glow halo behind the tilted button */}
      <span
        aria-hidden
        className={`pointer-events-none absolute ${tokens.glow} animate-urge-glow rounded-full bg-tertiary/15 blur-2xl`}
        style={{ transform: 'translateZ(-50px)' }}
      />

      {/* 3D Tilted Container */}
      <div
        className="relative transition-transform duration-300"
        style={{ 
          transform: 'rotateX(14deg) rotateY(-7deg) rotateZ(1deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
          
          {/* STATIC SOCKET BASE SHADOW (Represents the recessed hole/socket in the background) */}
          <span 
            className="absolute inset-0.5 rounded-full bg-black/90 blur-lg pointer-events-none" 
            style={{ transform: 'translateZ(-36px)' }} 
          />

          {/* THE 3D VISUAL CAP CONTAINER (A div that preserves 3D transforms across all browsers) */}
          <motion.div
            className={`group relative z-10 flex ${tokens.button} shrink-0 flex-col items-center justify-center rounded-full bg-transparent text-on-primary font-mono select-none`}
            style={{
              z: 32, // Default raised Z position in 3D perspective space (raised higher for pronounced sides)
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
            }}
            whileTap={reduceMotion || disabled ? undefined : {
              z: 8, // Compress down towards the base when tapped (longer mechanical travel!)
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          >
            {/* THE 3D CYLINDER SIDES (Stacked inside the button cap so they move in perfect sync!) */}
            <span className="absolute inset-0 rounded-full bg-[#BD480B] pointer-events-none" style={{ transform: 'translateZ(-2px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#B33D02] pointer-events-none" style={{ transform: 'translateZ(-4px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#A93302] pointer-events-none" style={{ transform: 'translateZ(-6px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#9F2A01] pointer-events-none" style={{ transform: 'translateZ(-8px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#952101] pointer-events-none" style={{ transform: 'translateZ(-10px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#8B1900] pointer-events-none" style={{ transform: 'translateZ(-12px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#811200] pointer-events-none" style={{ transform: 'translateZ(-14px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#770C00] pointer-events-none" style={{ transform: 'translateZ(-16px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#6D0700] pointer-events-none" style={{ transform: 'translateZ(-18px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#630300] pointer-events-none" style={{ transform: 'translateZ(-20px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#590000] pointer-events-none" style={{ transform: 'translateZ(-22px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#4F0000] pointer-events-none" style={{ transform: 'translateZ(-24px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#450000] pointer-events-none" style={{ transform: 'translateZ(-26px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#3B0000] pointer-events-none" style={{ transform: 'translateZ(-28px)' }} />
            <span className="absolute inset-0 rounded-full bg-[#310000] pointer-events-none" style={{ transform: 'translateZ(-30px)' }} />

            {/* Dark base shadow layer at the bottom of the cylinder */}
            <span 
              className="absolute inset-0 rounded-full bg-black/75 blur-[4px] pointer-events-none transition-opacity duration-200 group-active:opacity-80" 
              style={{ transform: 'translateZ(-32px)' }} 
            />

            {/* THE TOP FACE OF THE CAP (Slightly inset to expose the physical 3D side edge and lip) */}
            <span 
              className="absolute inset-[3px] rounded-full border border-white/20 bg-gradient-to-b from-tertiary to-[#BD480B] pointer-events-none transition-all duration-200 shadow-[inset_0_4px_8px_rgba(255,255,255,0.45)] group-hover:shadow-[inset_0_6px_10px_rgba(255,255,255,0.55)] group-active:shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]"
              style={{ transform: 'translateZ(0px)' }}
            />

            {/* Internal Bezel ring highlight for premium metal finish */}
            <span 
              className="absolute inset-[3.5px] rounded-full border border-white/10 pointer-events-none"
              style={{ transform: 'translateZ(1px)' }}
            />

            {/* ANCHORED 3D TEXT LABELS (Positioned with tight Z-offsets to prevent parallax sliding) */}
            <span 
              className="text-label uppercase tracking-[0.25em] text-on-primary/80 font-semibold select-none pointer-events-none"
              style={{ transform: 'translateZ(4px)' }}
            >
              Urge
            </span>
            <span 
              className={`mt-1 font-bold leading-none tracking-tight ${tokens.surf} select-none pointer-events-none`}
              style={{ transform: 'translateZ(8px)' }}
            >
              SURF
            </span>

            {/* TRANSPARENT NATIVE BUTTON OVERLAY (Bypasses WebKit/Blink 3D button flattening bugs!) */}
            <button
              type="button"
              disabled={disabled}
              onClick={onTrigger}
              aria-label="Start an urge wave"
              className="absolute inset-0 z-20 rounded-full bg-transparent border-none outline-none cursor-pointer disabled:cursor-not-allowed"
              style={{ transform: 'translateZ(12px)' }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
