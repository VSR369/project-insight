/**
 * Error Handler Utility
 * 
 * Provides consistent error handling patterns across the application.
 * Standardizes error logging, user-facing messages, error classification,
 * and structured logging with correlation IDs for production observability.
 */

import { toast } from 'sonner';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  tenantId?: string;
  providerId?: string;
  enrollmentId?: string;
  additionalData?: Record<string, unknown>;
}

export interface HandledError {
  correlationId: string;
  message: string;
  severity: ErrorSeverity;
  originalError: unknown;
  context: ErrorContext;
  timestamp: string;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId: string;
  message: string;
  context: {
    operation: string;
    component?: string;
    userId?: string;
    tenantId?: string;
    providerId?: string;
  };
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Correlation ID Management
// ============================================================================

/**
 * Generate a unique correlation ID for tracking requests/errors
 * Format: timestamp-randomHex (e.g., "1705484400000-a1b2c3d4")
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(16).substring(2, 10);
  return `${timestamp}-${randomPart}`;
}

// Session-level correlation ID for tracking user session
let sessionCorrelationId: string | null = null;

/**
 * Get or create a session-level correlation ID
 */
export function getSessionCorrelationId(): string {
  if (!sessionCorrelationId) {
    sessionCorrelationId = generateCorrelationId();
  }
  return sessionCorrelationId;
}

/**
 * Reset session correlation ID (e.g., on logout)
 */
export function resetSessionCorrelationId(): void {
  sessionCorrelationId = null;
}

// ============================================================================
// Structured Logging
// ============================================================================

/**
 * Create a structured log entry in JSON format for production log aggregation
 */
function createStructuredLogEntry(
  level: LogLevel,
  message: string,
  context: ErrorContext,
  correlationId: string,
  error?: unknown,
  metadata?: Record<string, unknown>
): StructuredLogEntry {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId,
    message,
    context: {
      operation: context.operation,
      component: context.component,
      userId: context.userId,
      tenantId: context.tenantId,
      providerId: context.providerId,
    },
  };

  if (error) {
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      entry.error = {
        message: String(error),
      };
    }
  }

  if (metadata || context.additionalData) {
    entry.metadata = { ...context.additionalData, ...metadata };
  }

  return entry;
}

/**
 * Log a structured entry to the console (development) or external service (production)
 * 
 * In production, this would send to a log aggregation service like:
 * - Datadog, Splunk, ELK Stack, CloudWatch, etc.
 */
function logStructured(entry: StructuredLogEntry): void {
  const isProduction = import.meta.env.PROD;
  
  if (isProduction) {
    // Production: Output as single-line JSON for log aggregation
    // Log aggregation services parse JSON logs automatically
    console.log(JSON.stringify(entry));
  } else {
    // Development: Pretty print with color coding
    const levelColors: Record<LogLevel, string> = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];
    
    console.group(`${color}[${entry.level}]${reset} ${entry.timestamp} | ${entry.correlationId}`);
    console.log('Message:', entry.message);
    console.log('Context:', entry.context);
    if (entry.error) {
      console.error('Error:', entry.error);
    }
    if (entry.metadata) {
      console.log('Metadata:', entry.metadata);
    }
    console.groupEnd();
  }
}

// ============================================================================
// Error Message Utilities
// ============================================================================

/**
 * Extract user-friendly message from error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
}

/**
 * Classify error severity based on error type and context
 */
export function classifyErrorSeverity(error: unknown, _operation: string): ErrorSeverity {
  const message = getErrorMessage(error).toLowerCase();
  
  // Critical errors - require immediate attention
  if (message.includes('authentication') || message.includes('unauthorized')) {
    return 'critical';
  }
  
  // Network/transient errors - usually recoverable
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return 'warning';
  }
  
  // Validation errors - user can fix
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return 'info';
  }
  
  // Default to error
  return 'error';
}

/**
 * Convert technical error message to user-friendly message
 */
export function getUserFacingMessage(technicalMessage: string, operation: string): string {
  const lowerMessage = technicalMessage.toLowerCase();
  
  // RLS / row-level security policy errors
  if (lowerMessage.includes('row-level security') || lowerMessage.includes('row level security') || lowerMessage.includes('rls')) {
    return 'Permission denied: your account does not have the required access level for this action. Please contact a supervisor.';
  }
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return 'Connection failed. Please check your internet and try again.';
  }
  
  // Timeout errors
  if (lowerMessage.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }
  
  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('not authenticated')) {
    return 'Your session has expired. Please log in again.';
  }
  
  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  
  // Duplicate/conflict errors
  if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
    return 'This record already exists. Please use a different value.';
  }
  
  // Not found errors
  if (lowerMessage.includes('not found')) {
    return `The requested ${operation.toLowerCase()} could not be found.`;
  }
  
  // Business validation errors - pass through as they're usually user-friendly
  if (lowerMessage.includes('violation') || lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return technicalMessage;
  }
  
  // Internal infrastructure errors (e.g. pg_net missing secrets)
  if (lowerMessage.includes('http_request_queue') || lowerMessage.includes('net.http_post')) {
    return 'A background process could not be dispatched. The save may have succeeded — please refresh and verify. Contact support if the issue persists.';
  }

  // Constraint errors
  if (lowerMessage.includes('constraint') || lowerMessage.includes('unique') || lowerMessage.includes('foreign key') || lowerMessage.includes('check constraint')) {
    return 'A data constraint prevented this action. Please check your input and try again.';
  }
  
  // Default message
  return `Failed to ${operation.toLowerCase()}. Please try again or contact support.`;
}

// ============================================================================
// Error Handling Functions
// ============================================================================

/**
 * Map error severity to log level
 */
function severityToLogLevel(severity: ErrorSeverity): LogLevel {
  const mapping: Record<ErrorSeverity, LogLevel> = {
    info: 'INFO',
    warning: 'WARN',
    error: 'ERROR',
    critical: 'ERROR',
  };
  return mapping[severity];
}

/**
 * Handle mutation errors with consistent logging and user feedback
 * 
 * @param error - The error that occurred
 * @param context - Context about where the error happened
 * @param showToast - Whether to show a toast notification (default: true)
 * @returns The handled error object for further processing
 */
export function handleMutationError(
  error: unknown,
  context: ErrorContext,
  showToast = true
): HandledError {
  const correlationId = generateCorrelationId();
  const message = getErrorMessage(error);
  const severity = classifyErrorSeverity(error, context.operation);
  
  const handledError: HandledError = {
    correlationId,
    message,
    severity,
    originalError: error,
    context,
    timestamp: new Date().toISOString(),
  };
  
  // Create and log structured entry
  const logEntry = createStructuredLogEntry(
    severityToLogLevel(severity),
    message,
    context,
    correlationId,
    error
  );
  logStructured(logEntry);
  
  // Show user-facing toast if requested
  if (showToast) {
    const userMessage = getUserFacingMessage(message, context.operation);
    
    switch (severity) {
      case 'critical':
      case 'error':
        toast.error(userMessage);
        break;
      case 'warning':
        toast.warning(userMessage);
        break;
      case 'info':
        toast.info(userMessage);
        break;
    }
  }
  
  return handledError;
}

/**
 * Handle query errors (read operations)
 */
export function handleQueryError(
  error: unknown,
  context: ErrorContext,
  showToast = false
): HandledError {
  // Query errors are typically less disruptive, so we log but don't always toast
  return handleMutationError(error, context, showToast);
}

/**
 * Wrap an async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  showToast = true
): Promise<{ data: T | null; error: HandledError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const handledError = handleMutationError(error, context, showToast);
    return { data: null, error: handledError };
  }
}

// ============================================================================
// Logging Utilities
// ============================================================================

/**
 * Log an info-level message with structured format
 */
export function logInfo(
  message: string,
  context: ErrorContext,
  metadata?: Record<string, unknown>
): void {
  const correlationId = generateCorrelationId();
  const entry = createStructuredLogEntry('INFO', message, context, correlationId, undefined, metadata);
  logStructured(entry);
}

/**
 * Log a debug-level message with structured format
 */
export function logDebug(
  message: string,
  context: ErrorContext,
  metadata?: Record<string, unknown>
): void {
  // Only log debug in development
  if (import.meta.env.PROD) return;
  
  const correlationId = generateCorrelationId();
  const entry = createStructuredLogEntry('DEBUG', message, context, correlationId, undefined, metadata);
  logStructured(entry);
}

/**
 * Log a warning-level message with structured format
 */
export function logWarning(
  message: string,
  context: ErrorContext,
  metadata?: Record<string, unknown>
): void {
  const correlationId = generateCorrelationId();
  const entry = createStructuredLogEntry('WARN', message, context, correlationId, undefined, metadata);
  logStructured(entry);
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Log audit event for critical operations
 * 
 * Audit logs are always structured and include user context for compliance.
 */
export function logAuditEvent(
  action: string,
  details: Record<string, unknown>,
  userId?: string
): void {
  const correlationId = generateCorrelationId();
  const sessionId = getSessionCorrelationId();
  
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    correlationId,
    message: `AUDIT: ${action}`,
    context: {
      operation: action,
      userId,
    },
    metadata: {
      ...details,
      sessionCorrelationId: sessionId,
      auditEvent: true,
    },
  };
  
  logStructured(entry);
}
