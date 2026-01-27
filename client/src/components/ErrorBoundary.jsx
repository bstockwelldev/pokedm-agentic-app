import React from 'react';

/**
 * ErrorBoundary Component
 * Catches React rendering errors and displays a user-friendly error message
 * Must be a class component (React limitation for error boundaries)
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (and potentially error reporting service)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
            }}
          >
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#dc2626',
              }}
            >
              Something went wrong
            </h1>
            <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
              The application encountered an unexpected error. You can try reloading the page or
              resetting the error boundary.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: '#374151',
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#dc2626' }}>Error:</strong>
                    <pre
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                      }}
                    >
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong style={{ color: '#dc2626' }}>Stack Trace:</strong>
                      <pre
                        style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginTop: '0.25rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'monospace',
                          maxHeight: '200px',
                          overflowY: 'auto',
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                aria-label="Reload application"
                style={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#1565c0')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#1976d2')}
              >
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                aria-label="Reset error boundary"
                style={{
                  backgroundColor: 'transparent',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f9fafb')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
