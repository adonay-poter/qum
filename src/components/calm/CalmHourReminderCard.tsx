interface CalmHourReminderCardProps {
  onOpen: () => void;
  onDismiss: () => void;
}

export function CalmHourReminderCard({ onOpen, onDismiss }: CalmHourReminderCardProps) {
  return (
    <div className="mb-3 flex items-center gap-2 border border-secondary/25 bg-surface/80 px-3 py-2.5">
      <button
        type="button"
        onClick={onOpen}
        className="flex-1 text-left text-body text-primary"
      >
        Your calm-hour check-in is ready.
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 px-2 py-1 text-label uppercase text-secondary"
        aria-label="Dismiss calm-hour reminder"
      >
        ×
      </button>
    </div>
  );
}
