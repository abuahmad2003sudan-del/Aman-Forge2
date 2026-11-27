import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CodeEditor({ file, value, dirty, onChange }) {
  const [copied, setCopied] = useState(false);
  const lines = (value || '').split('\n').length;

  async function copy() {
    await navigator.clipboard.writeText(value || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#0b0b0e]">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5">
        <span className="code-font truncate text-[10.5px] text-muted-foreground" dir="ltr">
          {file.path} · {lines} سطر{dirty ? ' · معدّل' : ''}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          {copied ? 'تم النسخ' : 'نسخ'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label={`تحرير ${file.path}`}
        dir="ltr"
        className="code-font min-h-0 flex-1 resize-none bg-transparent px-3 py-3 text-[11.5px] leading-[1.7] text-foreground/90 tabular-nums focus:outline-none"
      />
    </div>
  );
}