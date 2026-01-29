/**
 * Structured Logging Utility
 * Provides log levels, request ID correlation, and production-safe defaults
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

// Get log level from environment (default: INFO in production, DEBUG in development)
const getLogLevel = () => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel && LOG_LEVEL_NAMES.includes(envLevel)) {
    return LOG_LEVELS[envLevel];
  }
  return process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
};

const currentLogLevel = getLogLevel();

/**
 * Format log entry with structured data
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} meta - Additional metadata
 * @param {string} requestId - Request ID for correlation
 * @returns {object} Formatted log entry
 */
function formatLogEntry(level, message, meta = {}, requestId = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    ...meta,
  };

  if (requestId) {
    entry.requestId = requestId;
  }

  // Add environment context
  if (process.env.NODE_ENV) {
    entry.env = process.env.NODE_ENV;
  }

  // Add service context
  entry.service = 'pokedm-server';

  return entry;
}

/**
 * Write log entry (can be extended to write to file, external service, etc.)
 * @param {object} entry - Formatted log entry
 */
function writeLog(entry) {
  // In production, could send to logging service (Datadog, CloudWatch, etc.)
  // For now, use console with structured output
  const logMethod = entry.level === 'ERROR' ? console.error :
                    entry.level === 'WARN' ? console.warn :
                    entry.level === 'DEBUG' ? console.debug :
                    console.log;

  // Format for console output
  const prefix = `[${entry.timestamp}] [${entry.level}]`;
  if (entry.requestId) {
    logMethod(`${prefix} [${entry.requestId}]`, entry.message, entry);
  } else {
    logMethod(`${prefix}`, entry.message, entry);
  }
}

/**
 * Logger class
 */
class Logger {
  constructor(requestId = null) {
    this.requestId = requestId;
  }

  /**
   * Create a child logger with a specific request ID
   * @param {string} requestId - Request ID
   * @returns {Logger} New logger instance
   */
  child(requestId) {
    return new Logger(requestId);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const entry = formatLogEntry('DEBUG', message, meta, this.requestId);
      writeLog(entry);
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  info(message, meta = {}) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const entry = formatLogEntry('INFO', message, meta, this.requestId);
      writeLog(entry);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const entry = formatLogEntry('WARN', message, meta, this.requestId);
      writeLog(entry);
    }
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|object} error - Error object or metadata
   * @param {object} meta - Additional metadata
   */
  error(message, error = null, meta = {}) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const errorMeta = { ...meta };
      
      if (error instanceof Error) {
        errorMeta.error = {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        };
      } else if (error && typeof error === 'object') {
        Object.assign(errorMeta, error);
      }

      const entry = formatLogEntry('ERROR', message, errorMeta, this.requestId);
      writeLog(entry);
    }
  }
}

// Default logger instance (no request ID)
const defaultLogger = new Logger();

export default defaultLogger;
export { Logger, LOG_LEVELS, LOG_LEVEL_NAMES };
