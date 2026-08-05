import { useState, useEffect } from 'react';
import { isNativeApp } from '@/lib/platform/native';

export function useDesktopGuard() {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (isNativeApp()) return false;
    if (typeof window === 'undefined') return false;

    const width = window.innerWidth;
    const isFinePointer =
      window.matchMedia?.('(pointer: fine)').matches && !('ontouchstart' in window);

    return width >= 768 || (isFinePointer && width >= 640);
  });

  useEffect(() => {
    if (isNativeApp()) return;

    const checkDesktop = () => {
      const width = window.innerWidth;
      const isFinePointer =
        window.matchMedia?.('(pointer: fine)').matches && !('ontouchstart' in window);
      setIsDesktop(width >= 768 || (isFinePointer && width >= 640));
    };

    checkDesktop();

    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return { isDesktop };
}
