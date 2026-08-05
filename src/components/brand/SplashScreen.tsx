import { motion } from 'framer-motion';
import { BilingualLockup } from '@/design-system/identity';
const APP_VERSION = '0.1.0';

interface SplashScreenProps {
  status: 'booting' | 'ready';
}

export function SplashScreen({ status }: SplashScreenProps) {
  const version = APP_VERSION;

  return (
    <div className="qum-app-shell flex flex-col bg-neutral px-6">
      <p className="text-center text-[0.65rem] uppercase tracking-[0.2em] text-secondary">
        {status === 'ready' ? `Offline ready · v${version}` : `Booting · v${version}`}
      </p>

      <div className="flex flex-1 flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <BilingualLockup size="lg" />
        </motion.div>
      </div>

      <p className="text-center font-mono text-[0.62rem] uppercase tracking-[0.35em] text-secondary/70">
        Stand <span className="text-secondary/40">────</span> Halt
      </p>
    </div>
  );
}
