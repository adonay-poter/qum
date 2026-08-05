/** e.g. "2 hours ago", "yesterday" — for pledge timestamps in UI. */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';

  const diffSec = Math.round((then - now) / 1000);
  const absSec = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (absSec < 60) return rtf.format(diffSec, 'second');
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (absSec < 604800) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (absSec < 2592000) return rtf.format(Math.round(diffSec / 604800), 'week');
  return rtf.format(Math.round(diffSec / 2592000), 'month');
}
