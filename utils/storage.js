/**
 * LocalStorage utility for saving/loading configuration
 */

import { logger } from '../core/logger.js';

const CONTEXT = 'Storage';
const STORAGE_KEY = 'soroban_config';

/**
 * Load configuration from localStorage
 * @returns {Object|null}
 */
export function loadConfig() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const config = JSON.parse(data);
      logger.debug(CONTEXT, 'Config loaded:', config);
      return config;
    }
  } catch (error) {
    logger.error(CONTEXT, 'Failed to load config:', error);
  }
  return null;
}

/**
 * Save configuration to localStorage
 * @param {Object} config - Configuration object
 */
export function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    logger.debug(CONTEXT, 'Config saved:', config);
  } catch (error) {
    logger.error(CONTEXT, 'Failed to save config:', error);
  }
}

/**
 * Clear configuration from localStorage
 */
export function clearConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logger.debug(CONTEXT, 'Config cleared');
  } catch (error) {
    logger.error(CONTEXT, 'Failed to clear config:', error);
  }
}

/**
 * Get specific config value
 * @param {string} key - Config key
 * @param {any} defaultValue - Default value if not found
 * @returns {any}
 */
export function getConfigValue(key, defaultValue = null) {
  const config = loadConfig();
  return config && config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Set specific config value
 * @param {string} key - Config key
 * @param {any} value - Value to set
 */
export function setConfigValue(key, value) {
  const config = loadConfig() || {};
  config[key] = value;
  saveConfig(config);
}
