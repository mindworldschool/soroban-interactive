/**
 * Configuration manager for Soroban
 */

import { logger } from './logger.js';
import { loadConfig, saveConfig } from '../utils/storage.js';

const CONTEXT = 'Config';

export class Config {
  constructor() {
    // Default configuration
    this.defaults = {
      digitCount: 13,
      showDigits: false,
      beadWidth: 32,
      beadHeight: 36,
      gapFromBar: 1,
      barY: 96,
      snapDistance: 15,
      animationDuration: 150
    };

    // Current configuration
    this.current = { ...this.defaults };

    // Load saved configuration
    this.load();
  }

  /**
   * Load configuration from localStorage
   */
  load() {
    const saved = loadConfig();
    if (saved) {
      this.current = { ...this.defaults, ...saved };
      logger.debug(CONTEXT, 'Configuration loaded from storage');
    } else {
      logger.debug(CONTEXT, 'Using default configuration');
    }
  }

  /**
   * Save configuration to localStorage
   */
  save() {
    saveConfig(this.current);
    logger.debug(CONTEXT, 'Configuration saved to storage');
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @returns {any}
   */
  get(key) {
    return this.current[key];
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Value to set
   */
  set(key, value) {
    this.current[key] = value;
    this.save();
    logger.debug(CONTEXT, `Config updated: ${key} = ${value}`);
  }

  /**
   * Get all configuration
   * @returns {Object}
   */
  getAll() {
    return { ...this.current };
  }

  /**
   * Update multiple configuration values
   * @param {Object} updates - Key-value pairs to update
   */
  update(updates) {
    this.current = { ...this.current, ...updates };
    this.save();
    logger.debug(CONTEXT, 'Configuration updated:', updates);
  }

  /**
   * Reset to default configuration
   */
  reset() {
    this.current = { ...this.defaults };
    this.save();
    logger.debug(CONTEXT, 'Configuration reset to defaults');
  }
}

// Export singleton instance
export const config = new Config();
