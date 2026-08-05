import { useState } from 'react';

interface TextInputVerifierProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  taskPrompt?: string;
}

export function TextInputVerifier({ onSubmit, disabled, taskPrompt }: TextInputVerifierProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed.length < 15) return;
    onSubmit(trimmed);
  };

  return (
    <div className="mt-qum-lg flex flex-col gap-qum-md">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        disabled={disabled}
        placeholder={
          taskPrompt && /\b(list|name|animals|countries|objects)\b/i.test(taskPrompt)
            ? 'One item per line or comma-separated (e.g. shark, whale, dolphin…)'
            : 'Type your proof here (min 15 characters)…'
        }
        className="w-full resize-none border border-secondary/40 bg-surface p-qum-md text-body text-primary outline-none focus:border-tertiary disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || value.trim().length < 15}
        className="bg-tertiary px-5 py-3 text-body font-semibold text-on-primary disabled:opacity-40"
      >
        Submit proof
      </button>
    </div>
  );
}
