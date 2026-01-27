import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import MarkdownText from './MarkdownText';

/**
 * DiagnosticsDrawer Component
 * Displays detailed error diagnostics in a modal drawer
 * Includes copy-to-clipboard functionality
 */
export default function DiagnosticsDrawer({ isOpen, onClose, diagnostics }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button when drawer opens
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // Trap focus within drawer
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const diagnosticsJson = JSON.stringify(diagnostics, null, 2);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticsJson);
      // Could show a toast notification here
      alert('Diagnostics copied to clipboard');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = diagnosticsJson;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Diagnostics copied to clipboard');
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        alert('Failed to copy. Please select and copy manually.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-title"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        ref={drawerRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px 8px 0 0',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            id="diagnostics-title"
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
            }}
          >
            Error Diagnostics
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close diagnostics drawer"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem',
              lineHeight: '1',
              color: '#6b7280',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#374151')}
            onMouseLeave={(e) => (e.target.style.color = '#6b7280')}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '1rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Request Details</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'monospace' }}>
              {diagnostics.requestId && (
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong>Request ID:</strong> {diagnostics.requestId}
                </div>
              )}
              {diagnostics.timestamp && (
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong>Timestamp:</strong> {new Date(diagnostics.timestamp).toLocaleString()}
                </div>
              )}
              {diagnostics.endpoint && (
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong>Endpoint:</strong> {diagnostics.method || 'POST'} {diagnostics.endpoint}
                </div>
              )}
              {diagnostics.statusCode && (
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong>Status Code:</strong> {diagnostics.statusCode}
                </div>
              )}
            </div>
          </div>

          {diagnostics.error && (
            <div className="mb-4">
              <div className="mb-2 font-medium text-foreground">Error Message</div>
              <MarkdownText variant="error" className="text-sm">
                {diagnostics.error}
              </MarkdownText>
            </div>
          )}

          {diagnostics.details && (
            <div className="mb-4">
              <div className="mb-2 font-medium text-foreground">Details</div>
              <MarkdownText variant="compact" className="text-muted">
                {diagnostics.details}
              </MarkdownText>
            </div>
          )}

          {diagnostics.stack && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Stack Trace</div>
              <pre
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  backgroundColor: '#f9fafb',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {diagnostics.stack}
              </pre>
            </div>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ marginBottom: '0.5rem', fontWeight: '500' }}>Full Diagnostics JSON</div>
            <pre
              role="textbox"
              aria-readonly="true"
              aria-label="Full diagnostics JSON"
              style={{
                fontSize: '0.75rem',
                color: '#374151',
                backgroundColor: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '4px',
                overflowX: 'auto',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              {diagnosticsJson}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleCopyToClipboard}
            aria-label="Copy diagnostics to clipboard"
            style={{
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#1565c0')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#1976d2')}
          >
            Copy to Clipboard
          </button>
          <button
            onClick={onClose}
            aria-label="Close diagnostics"
            style={{
              backgroundColor: 'transparent',
              color: '#374151',
              border: '1px solid #d1d5db',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#f9fafb')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
