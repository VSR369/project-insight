/**
 * Error Handler Utility
 * 
 * Provides consistent error handling patterns across the application.
 * Standardizes error logging, user-facing messages, and error classification.
 */

import { toast } from 'sonner';

// Error classification types
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  operation: string;
  component?: string;
  userId?: string;
  providerId?: string;
  additionalData?: Record<string, unknown>;
}

export interface HandledError {
  message: string;
  severity: ErrorSeverity;
  originalError: unknown;
  context: ErrorContext;
  timestamp: string;
}

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
  const message = getErrorMessage(error);
  const severity = classifyErrorSeverity(error, context.operation);
  
  const handledError: HandledError = {
    message,
    severity,
    originalError: error,
    context,
    timestamp: new Date().toISOString(),
  };
  
  // Log to console with structured format (avoid console.log in production)
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${context.operation}]`, {
      message,
      severity,
      ...context,
    });
  }
  
  // Show user-facing toast if requested
  if (showToast) {
    const userMessage = getUserFacingMessage(message, context.operation);
    
    switch (severity) {
      case 'critical':
        toast.error(userMessage);
        break;
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
 * Convert technical error message to user-friendly message
 */
export function getUserFacingMessage(technicalMessage: string, operation: string): string {
  const lowerMessage = technicalMessage.toLowerCase();
  
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
  
  // Validation errors - pass through as they're usually user-friendly
  if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerMessage.includes('required')) {
    return technicalMessage;
  }
  
  // Default message
  return `Failed to ${operation.toLowerCase()}. Please try again or contact support.`;
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

/**
 * Log audit event for critical operations
 * 
 * This is a placeholder for future audit logging implementation.
 * Currently logs to console; can be extended to log to database/external service.
 */
export function logAuditEvent(
  action: string,
  details: Record<string, unknown>,
  userId?: string
): void {
  const auditEntry = {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  };
  
  // In production, this would send to an audit log service
  if (process.env.NODE_ENV !== 'production') {
    console.info('[AUDIT]', auditEntry);
  }
}
