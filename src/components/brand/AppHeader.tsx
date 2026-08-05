import { CompactLockup } from '@/design-system/identity';
import { AccountMenu } from '@/components/ui/AccountMenu';

interface AppHeaderProps {
  email?: string | null;
  onOpenSettings?: () => void;
}

/** In-app top bar: compact lockup + account. */
export function AppHeader({ email, onOpenSettings }: AppHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <CompactLockup size="sm" />
      <AccountMenu email={email} onOpenSettings={onOpenSettings} />
    </div>
  );
}
