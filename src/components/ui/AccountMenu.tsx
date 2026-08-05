import { useEffect, useRef, useState } from 'react';
import { pulsar } from '@/lib/pulsar';

interface AccountMenuProps {
  email?: string | null;
  onOpenSettings?: () => void;
}

export function AccountMenu({ email, onOpenSettings }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={panelRef} className="relative shrink-0 self-end">
      <button
        type="button"
        onClick={() => {
          void pulsar.playPreset('chip');
          setOpen((v) => !v);
        }}
        className="px-2 py-1 text-label uppercase tracking-widest text-secondary"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        Account
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] border border-secondary/30 bg-surface p-3"
        >
          {email && (
            <p className="truncate text-[0.65rem] text-secondary" title={email}>
              {email}
            </p>
          )}
          {onOpenSettings && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void pulsar.playPreset('chip');
                setOpen(false);
                onOpenSettings();
              }}
              aria-label="Open settings"
              className="mt-2 w-full py-2 text-left text-body text-primary"
            >
              Settings
            </button>
          )}
        </div>
      )}
    </div>
  );
}
