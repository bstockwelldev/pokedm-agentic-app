/**
 * Error Handler Middleware
 * Centralized error handling with consistent error responses
 */

import logger from '../lib/logger.js';
import { isRateLimitError, isModelNotFoundError } from '../lib/retryUtils.js';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Error handler middleware
 * Must be registered after all routes
 * @param {Error} err - Error object
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next middleware
 */
export function errorHandler(err, req, res, next) {
  const requestLogger = req.logger || logger.child(req.requestId);

  // Handle AppError
  if (err instanceof AppError) {
    requestLogger.warn('Application error', {
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
    });

    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    requestLogger.warn('Validation error', {
      errors: err.errors,
    });

    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle rate limit errors
  const rateLimitInfo = isRateLimitError(err);
  if (rateLimitInfo) {
    requestLogger.warn('Rate limit error', {
      retryAfter: rateLimitInfo.retryAfter,
    });

    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: rateLimitInfo.retryAfter
        ? `Please retry in ${Math.ceil(rateLimitInfo.retryAfter)} seconds.`
        : 'Please try again later.',
      retryAfter: rateLimitInfo.retryAfter,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle model not found errors
  if (isModelNotFoundError(err)) {
    requestLogger.warn('Model not found error', {
      message: err.message,
    });

    return res.status(400).json({
      error: 'Model not found',
      message: 'The specified model is not available or not supported.',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle unknown errors
  requestLogger.error('Unhandled error', err, {
    endpoint: req.path,
    method: req.method,
  });

  const statusCode = err.statusCode || 500;
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred'
    : err.message;

  res.status(statusCode).json({
    error: 'Internal server error',
    message: errorMessage,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.message,
    }),
  });
}

export default errorHandler;
