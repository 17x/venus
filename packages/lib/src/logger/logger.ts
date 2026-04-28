/**
 * Enumerates logger levels from most to least verbose.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Defines one structured log entry payload.
 */
export interface LogEntry {
  /** Stores the log level for filtering. */
  readonly level: LogLevel
  /** Stores the free-form log message. */
  readonly message: string
  /** Stores optional structured metadata. */
  readonly meta?: unknown
}

/**
 * Defines a sink callback that consumes a log entry.
 */
export type LogSink = (entry: LogEntry) => void

/**
 * Defines runtime logger operations.
 */
export interface Logger {
  /** Emits a debug-level log entry. */
  debug(message: string, meta?: unknown): void
  /** Emits an info-level log entry. */
  info(message: string, meta?: unknown): void
  /** Emits a warn-level log entry. */
  warn(message: string, meta?: unknown): void
  /** Emits an error-level log entry. */
  error(message: string, meta?: unknown): void
}

/**
 * Defines options that configure logger level and sink behavior.
 */
export interface CreateLoggerOptions {
  /** Stores the minimum enabled log level. */
  level?: LogLevel
  /** Stores the sink that receives emitted entries. */
  sink?: LogSink
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

/**
 * Creates a logger with level-based filtering and pluggable sinks.
 */
export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const minLevel = options.level ?? 'info'
  const sink = options.sink ?? ((entry: LogEntry) => {
    const method = entry.level === 'debug'
      ? 'debug'
      : entry.level === 'info'
        ? 'info'
        : entry.level === 'warn'
          ? 'warn'
          : 'error'
    // Forward to console by default so local diagnostics remain visible.
    console[method](entry.message, entry.meta)
  })

  /**
   * Emits one log entry when the level threshold allows it.
   */
  const emit = (level: LogLevel, message: string, meta?: unknown): void => {
    // Skip logs below threshold to keep hot paths quiet in production surfaces.
    if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[minLevel]) {
      return
    }

    sink({
      level,
      message,
      meta,
    })
  }

  return {
    debug: (message, meta) => {
      emit('debug', message, meta)
    },
    info: (message, meta) => {
      emit('info', message, meta)
    },
    warn: (message, meta) => {
      emit('warn', message, meta)
    },
    error: (message, meta) => {
      emit('error', message, meta)
    },
  }
}

