import { formatPhoneHref, type HotlineEntry } from '@/lib/crisis/hotlines';
import { openSupportLink } from '@/lib/crisis/openSupportLink';

interface HotlineListProps {
  hotlines: HotlineEntry[];
  onLineTapped?: (hotlineId: string) => void;
}

export function HotlineList({ hotlines, onLineTapped }: HotlineListProps) {
  if (hotlines.length === 0) {
    return (
      <p className="text-body text-secondary">
        No helplines are configured. If you are in immediate danger, call emergency
        services where you live.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {hotlines.map((line) => (
        <li
          key={line.id}
          className="border border-secondary/25 bg-surface/80 px-3 py-3"
        >
          <p className="text-body font-medium text-primary">{line.label}</p>
          <p className="mt-1 text-[0.72rem] leading-relaxed text-secondary">
            {line.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {line.phone && (
              <button
                type="button"
                onClick={() => {
                  onLineTapped?.(line.id);
                  void openSupportLink(formatPhoneHref(line.phone!));
                }}
                className="border border-secondary/40 px-3 py-2 text-[0.68rem] uppercase tracking-[0.1em] text-primary"
              >
                Call {line.phone}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onLineTapped?.(line.id);
                void openSupportLink(line.url);
              }}
              className="border border-secondary/40 px-3 py-2 text-[0.68rem] uppercase tracking-[0.1em] text-secondary"
            >
              More info
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
