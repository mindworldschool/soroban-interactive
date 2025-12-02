/**
 * Simple logger utility
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor() {
    this.level = LOG_LEVELS.DEBUG;
  }

  setLevel(level) {
    this.level = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  }

  debug(context, message, ...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] [${context}]`, message, ...args);
    }
  }

  info(context, message, ...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info(`[INFO] [${context}]`, message, ...args);
    }
  }

  warn(context, message, ...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] [${context}]`, message, ...args);
    }
  }

  error(context, message, ...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] [${context}]`, message, ...args);
    }
  }
}

export const logger = new Logger();
