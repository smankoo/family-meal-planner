import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console and analytics
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Track error in analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default elegant error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--surface-bg)' }}>
          <div className="max-w-md w-full modal-container p-8 text-center">

            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, #ef4444 15%, var(--surface-secondary))' }}>
              <AlertTriangle size={32} className="text-red-500" />
            </div>

            {/* Title */}
            <h1 className="heading-card text-xl mb-4">
              Something went wrong
            </h1>

            {/* Message */}
            <p className="text-body mb-8">
              The app encountered an unexpected error. This is usually temporary and can be fixed by refreshing the page.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="btn-retry-modal"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn-close-modal"
              >
                <Home size={16} />
                Try Again
              </button>
            </div>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-sm font-semibold text-primary-500 cursor-pointer hover:text-primary-700">
                  Error Details (Development)
                </summary>
                <div className="mt-4 error-detail-box">
                  <pre className="text-xs text-primary-600 overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
