import React from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  generateCorrelationId, 
  getSessionCorrelationId,
  logAuditEvent 
} from "@/lib/errorHandler";

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback component */
  fallback?: React.ReactNode;
  /** Component/feature name for context */
  componentName?: string;
  /** Callback when error is caught */
  onError?: (error: unknown, errorInfo: React.ErrorInfo, correlationId: string) => void;
  /** Show retry button (default: true) */
  showRetry?: boolean;
  /** Show home navigation (default: true) */
  showHomeLink?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
  errorInfo?: React.ErrorInfo;
  correlationId?: string;
  retryCount: number;
  copied: boolean;
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { 
    hasError: false, 
    retryCount: 0,
    copied: false,
  };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { 
      hasError: true, 
      error,
      correlationId: generateCorrelationId(),
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const correlationId = this.state.correlationId || generateCorrelationId();
    const sessionId = getSessionCorrelationId();
    
    // Log structured error with correlation ID
    logAuditEvent('ERROR_BOUNDARY_CAUGHT', {
      correlationId,
      sessionCorrelationId: sessionId,
      componentName: this.props.componentName || 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'UnknownError',
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Update state with error info
    this.setState({ errorInfo, correlationId });

    // Call optional error callback
    this.props.onError?.(error, errorInfo, correlationId);
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    logAuditEvent('ERROR_BOUNDARY_RETRY', {
      correlationId: this.state.correlationId,
      componentName: this.props.componentName || 'Unknown',
      retryCount: newRetryCount,
    });

    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: newRetryCount,
      copied: false,
    });
  };

  handleGoHome = () => {
    logAuditEvent('ERROR_BOUNDARY_NAVIGATE_HOME', {
      correlationId: this.state.correlationId,
      componentName: this.props.componentName || 'Unknown',
    });
    
    window.location.href = '/';
  };

  handleCopyErrorInfo = async () => {
    const errorReport = this.generateErrorReport();
    
    try {
      await navigator.clipboard.writeText(errorReport);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      console.error('Failed to copy to clipboard');
    }
  };

  generateErrorReport(): string {
    const { error, errorInfo, correlationId } = this.state;
    const sessionId = getSessionCorrelationId();
    
    return JSON.stringify({
      correlationId,
      sessionCorrelationId: sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      componentName: this.props.componentName || 'Unknown',
      error: {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      componentStack: errorInfo?.componentStack,
    }, null, 2);
  }

  render() {
    const { showRetry = true, showHomeLink = true, fallback } = this.props;
    const { hasError, error, correlationId, retryCount, copied } = this.state;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      const maxRetries = 3;
      const canRetry = retryCount < maxRetries;

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-lg border border-destructive/20 bg-card p-6 shadow-lg">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-foreground">
                  Something went wrong
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  An unexpected error occurred. Our team has been notified.
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div className="mt-4 space-y-3">
              {/* Correlation ID */}
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Error ID
                  </span>
                  <p className="font-mono text-sm text-foreground">
                    {correlationId}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleCopyErrorInfo}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Error Message */}
              <div className="rounded-md bg-destructive/5 p-3">
                <span className="text-xs font-medium text-destructive">
                  Error Message
                </span>
                <pre className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
                  {errorMessage}
                </pre>
              </div>

              {/* Retry Count Warning */}
              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {showRetry && canRetry && (
                <Button
                  onClick={this.handleRetry}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
              
              {showRetry && !canRetry && (
                <p className="flex-1 text-center text-sm text-muted-foreground">
                  Maximum retries reached
                </p>
              )}
              
              {showHomeLink && (
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Button>
              )}
            </div>

            {/* Help Text */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              If this issue persists, please contact support with the Error ID above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Functional Error Boundary Wrapper (for hooks support)
// ============================================================================

interface ErrorBoundaryWithRetryProps extends Omit<ErrorBoundaryProps, 'children'> {
  children: React.ReactNode | ((props: { reset: () => void }) => React.ReactNode);
}

/**
 * Error boundary wrapper that provides reset functionality via render props
 */
export function ErrorBoundaryWithRetry({ 
  children, 
  ...props 
}: ErrorBoundaryWithRetryProps) {
  const [resetKey, setResetKey] = React.useState(0);

  const handleReset = React.useCallback(() => {
    setResetKey(prev => prev + 1);
  }, []);

  return (
    <ErrorBoundary key={resetKey} {...props}>
      {typeof children === 'function' 
        ? children({ reset: handleReset }) 
        : children
      }
    </ErrorBoundary>
  );
}

// ============================================================================
// Feature-Specific Error Boundary
// ============================================================================

interface FeatureErrorBoundaryProps {
  children: React.ReactNode;
  featureName: string;
  /** Compact mode for inline components */
  compact?: boolean;
}

/**
 * Lightweight error boundary for feature sections
 */
export function FeatureErrorBoundary({ 
  children, 
  featureName,
  compact = false,
}: FeatureErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);
  const [correlationId, setCorrelationId] = React.useState<string | null>(null);

  if (hasError) {
    if (compact) {
      return (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Failed to load {featureName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHasError(false)}
            className="mt-2"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-destructive/20 bg-card p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <h3 className="font-medium">Failed to load {featureName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Error ID: {correlationId}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHasError(false)}
              className="mt-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      componentName={featureName}
      onError={(error, _errorInfo, corrId) => {
        setCorrelationId(corrId);
        setHasError(true);
      }}
      fallback={<></>} // Handled by parent state
    >
      {children}
    </ErrorBoundary>
  );
}
