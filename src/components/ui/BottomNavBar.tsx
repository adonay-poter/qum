import { motion } from 'framer-motion';
import { pulsar } from '@/lib/pulsar';

interface BottomNavBarProps {
  activeTab: 'home' | 'dashboard';
  onChangeTab: (tab: 'home' | 'dashboard') => void;
}

export function BottomNavBar({ activeTab, onChangeTab }: BottomNavBarProps) {
  const handleTabClick = (tab: 'home' | 'dashboard') => {
    if (activeTab === tab) return;
    void pulsar.playPreset('chip');
    onChangeTab(tab);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-secondary/20 shadow-[0_-4px_24px_rgba(0,0,0,0.2)]"
      style={{ paddingBottom: 'var(--qum-safe-bottom)' }}
    >
      <nav 
        className="flex items-center justify-around h-[64px]"
      >
        {/* Home Tab */}
        <button
          type="button"
          onClick={() => handleTabClick('home')}
          className={`relative flex flex-col items-center justify-center w-full h-full transition-colors duration-250 select-none ${
            activeTab === 'home' ? 'text-tertiary font-semibold bg-surface/30' : 'text-secondary hover:text-primary'
          }`}
        >
          {activeTab === 'home' && (
            <motion.span
              layoutId="nav-active-line"
              className="absolute top-0 left-0 right-0 h-[1.5px] bg-tertiary/50"
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            />
          )}

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.75"
            stroke="currentColor"
            className="w-[20px] h-[20px]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          <span className="text-[0.58rem] uppercase tracking-[0.15em] mt-1 font-mono">Home</span>
        </button>

        {/* Dashboard Tab */}
        <button
          type="button"
          onClick={() => handleTabClick('dashboard')}
          className={`relative flex flex-col items-center justify-center w-full h-full transition-colors duration-250 select-none ${
            activeTab === 'dashboard' ? 'text-tertiary font-semibold bg-surface/30' : 'text-secondary hover:text-primary'
          }`}
        >
          {activeTab === 'dashboard' && (
            <motion.span
              layoutId="nav-active-line"
              className="absolute top-0 left-0 right-0 h-[1.5px] bg-tertiary/50"
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            />
          )}

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.75"
            stroke="currentColor"
            className="w-[20px] h-[20px]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 18.375v-5.25ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125v-9.75ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
          <span className="text-[0.58rem] uppercase tracking-[0.15em] mt-1 font-mono">Analytics</span>
        </button>
      </nav>
    </div>
  );
}
