import { useEffect, useState } from 'react';
import { onToast } from '../lib/store';

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  useEffect(() => onToast((text) => setMsg({ text, key: Date.now() })), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <div className="toast-wrap" aria-live="polite">
      {msg && (
        <div key={msg.key} className="toast">
          {msg.text}
        </div>
      )}
    </div>
  );
}
