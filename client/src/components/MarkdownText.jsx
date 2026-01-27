import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

/**
 * MarkdownText Component
 * Reusable component for rendering markdown text consistently across the app
 */
export default function MarkdownText({
  children,
  className,
  variant = 'default', // 'default', 'compact', 'error', 'success'
  ...props
}) {
  if (!children) return null;

  const variantStyles = {
    default: 'text-foreground',
    compact: 'text-sm text-foreground',
    error: 'text-red-300',
    success: 'text-green-300',
  };

  return (
    <div className={cn('break-words', variantStyles[variant], className)} {...props}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>,
          ul: ({ children }) => <ul className="my-2 list-disc ml-4">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal ml-4">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          code: ({ inline, children }) => 
            inline ? (
              <code className="bg-muted/30 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
            ) : (
              <code className="block bg-muted/20 p-3 rounded overflow-x-auto my-2 text-sm font-mono">{children}</code>
            ),
          pre: ({ children }) => <pre className="bg-muted/20 p-3 rounded overflow-x-auto my-2">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border pl-4 italic my-2">{children}</blockquote>
          ),
        }}
      >
        {typeof children === 'string' ? children : String(children)}
      </ReactMarkdown>
    </div>
  );
}
