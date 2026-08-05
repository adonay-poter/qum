import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BilingualLockup } from '@/design-system/identity/BilingualLockup';
import { QRCodeSVG } from './QRCodeSVG';

export function DesktopGuardScreen() {
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('http://localhost:5006/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.href);
    }
  }, []);

  const handleCopyLink = async () => {
    const urlToCopy = typeof window !== 'undefined' ? window.location.href : appUrl;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(urlToCopy);
      } else {
        // Fallback for non-secure contexts or older browsers
        const textarea = document.createElement('textarea');
        textarea.value = urlToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-x-hidden bg-neutral px-6 py-10 text-primary selection:bg-tertiary selection:text-neutral">
      {/* Background subtle noise & radial ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-tertiary/10 via-neutral/90 to-neutral" />

      {/* Film grid decorative lines */}
      <div className="pointer-events-none absolute inset-0 opacity-15">
        <div className="h-full w-full bg-[linear-gradient(to_right,#857F72_1px,transparent_1px),linear-gradient(to_bottom,#857F72_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Top Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex w-full max-w-3xl items-center justify-between border-b border-secondary/20 pb-6"
      >
        <BilingualLockup size="md" />

        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tertiary" />
          </span>
          <span className="font-mono text-label uppercase tracking-widest text-secondary">
            MOBILE DEVICE ONLY
          </span>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <main className="relative z-10 my-auto flex w-full max-w-3xl flex-col items-center justify-center text-center py-8">
        {/* Brave Announcement Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="max-w-2xl font-mono text-3xl font-bold uppercase tracking-tight text-primary sm:text-4xl md:text-5xl"
        >
          CANNOT VIEW ON <span className="text-tertiary">DESKTOP</span> FOR NOW.
        </motion.h1>

        {/* Description / Phone Recommendation */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-6 max-w-xl font-mono text-body text-secondary leading-relaxed"
        >
          QUM is handcrafted specifically for mobile devices as an intimate, pocket-held urge surfing companion.
          Please open this app on your phone camera or copy the link below.
        </motion.p>

        {/* Dynamic QR Code Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mt-10 flex flex-col items-center gap-4"
        >
          <div className="group relative p-3">
            <QRCodeSVG value={appUrl} size={210} />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="h-2 w-2 rounded-full bg-tertiary animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary font-semibold">
              SCAN WITH YOUR PHONE CAMERA
            </span>
          </div>

          <p className="font-mono text-[11px] text-secondary tracking-wider max-w-md break-all">
            URL: <span className="text-primary">{appUrl}</span>
          </p>
        </motion.div>

        {/* Action Button: Copy Link */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-8 flex flex-col items-center"
        >
          <button
            onClick={handleCopyLink}
            type="button"
            className="group relative inline-flex items-center justify-center gap-3 rounded-md bg-tertiary px-8 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-neutral transition-all hover:bg-tertiary/90 active:scale-[0.98] shadow-lg shadow-tertiary/20"
          >
            <span>{copied ? '✓ LINK COPIED TO CLIPBOARD' : 'COPY MOBILE LINK'}</span>
          </button>
        </motion.div>
      </main>

      {/* Clean Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.65 }}
        className="relative z-10 flex w-full max-w-3xl items-center justify-center border-t border-secondary/20 pt-6 text-center"
      >
        <p className="font-mono text-label uppercase tracking-widest text-secondary">
          QUM — STAND. HALT. OFFLINE-FIRST URGE RECOVERY
        </p>
      </motion.footer>
    </div>
  );
}
