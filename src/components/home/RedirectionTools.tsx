import { motion } from 'framer-motion';

interface RedirectionToolsProps {
  onLogSlip: () => void;
  onOpenScience: () => void;
}

export function RedirectionTools({
  onLogSlip,
  onOpenScience,
}: RedirectionToolsProps) {
  return (
    <motion.section
      className="border border-secondary/20 bg-surface/30 backdrop-blur-sm p-4 rounded-lg flex flex-col gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28, duration: 0.35 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-label uppercase text-secondary tracking-widest font-semibold">Redirection & Insights</p>
      </div>

      <div className="flex flex-col divide-y divide-secondary/15">
        <button
          type="button"
          onClick={onLogSlip}
          className="group w-full py-3 text-left flex items-center justify-between hover:bg-surface/10 transition-colors"
        >
          <div className="flex-1 pr-2">
            <p className="text-body font-medium text-primary group-hover:text-tertiary transition-colors">Log a slip</p>
            <p className="text-[0.7rem] text-secondary mt-0.5">Voluntary slip reflections & private voice notes</p>
          </div>
          <span className="text-secondary/60 group-hover:text-tertiary transition-colors text-sm pr-1">→</span>
        </button>

        <button
          type="button"
          onClick={onOpenScience}
          className="group w-full py-3 text-left flex items-center justify-between hover:bg-surface/10 transition-colors"
        >
          <div className="flex-1 pr-2">
            <p className="text-body font-medium text-primary group-hover:text-tertiary transition-colors">Science of Urges</p>
            <p className="text-[0.7rem] text-secondary mt-0.5">Learn why urges pass and calibration mechanics</p>
          </div>
          <span className="text-secondary/60 group-hover:text-tertiary transition-colors text-sm pr-1">→</span>
        </button>
      </div>
    </motion.section>
  );
}
