import React, { useState } from 'react';
import { cn } from '../lib/utils';

/**
 * JsonViewer - Read-only JSON viewer with expand/collapse and copy features
 */
export default function JsonViewer({ data, maxDepth = 3 }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className={cn(
          'absolute top-2 right-2 px-2 py-1 text-xs rounded',
          'bg-input border border-border',
          'text-foreground',
          'hover:bg-muted/20 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background'
        )}
        aria-label="Copy JSON to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre
        className={cn(
          'p-3 rounded-md overflow-x-auto',
          'bg-muted/10 border border-border',
          'text-xs font-mono text-foreground',
          'max-h-96 overflow-y-auto'
        )}
      >
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
}
