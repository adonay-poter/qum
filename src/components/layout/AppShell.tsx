import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

/** Full-viewport shell — safe-area padding + no double-scroll on mobile WebView */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="qum-app-shell flex w-full flex-col overflow-hidden bg-neutral">
      {children}
    </div>
  );
}

export function AppMain({ children, scroll = false }: AppShellProps & { scroll?: boolean }) {
  return (
    <main
      className={`min-h-0 flex-1 ${scroll ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'}`}
    >
      {children}
    </main>
  );
}
