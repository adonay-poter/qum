import type { ReactNode } from 'react';

interface PageProps {
  children: ReactNode;
  session?: boolean;
}

export function Page({ children, session = false }: PageProps) {
  return (
    <div
      className={`h-full overflow-y-auto overscroll-contain px-4 ${
        session ? 'qum-session-pt pb-8' : 'pt-4'
      }`}
      style={
        session
          ? undefined
          : { paddingBottom: 'calc(64px + var(--qum-safe-bottom, 0px) + 1.5rem)' }
      }
    >
      {children}
    </div>
  );
}
