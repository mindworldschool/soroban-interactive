/**
 * Event bus for component communication
 */

import { logger } from './logger.js';

const CONTEXT = 'EventBus';

export class EventBus {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to event
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} - Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(callback);
    logger.debug(CONTEXT, `Subscribed to event: ${eventName}`);

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to event (one-time)
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function
   */
  once(eventName, callback) {
    const onceWrapper = (...args) => {
      callback(...args);
      this.off(eventName, onceWrapper);
    };

    this.on(eventName, onceWrapper);
  }

  /**
   * Unsubscribe from event
   * @param {string} eventName - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(eventName, callback) {
    if (!this.events[eventName]) return;

    this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    logger.debug(CONTEXT, `Unsubscribed from event: ${eventName}`);
  }

  /**
   * Emit event
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   */
  emit(eventName, data) {
    if (!this.events[eventName]) return;

    logger.debug(CONTEXT, `Emitting event: ${eventName}`, data);

    this.events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error(CONTEXT, `Error in event handler for ${eventName}:`, error);
      }
    });
  }

  /**
   * Clear all event listeners
   * @param {string} eventName - Event name (optional, clears all if not provided)
   */
  clear(eventName) {
    if (eventName) {
      delete this.events[eventName];
      logger.debug(CONTEXT, `Cleared event: ${eventName}`);
    } else {
      this.events = {};
      logger.debug(CONTEXT, 'Cleared all events');
    }
  }

  /**
   * Get list of events
   * @returns {string[]}
   */
  getEvents() {
    return Object.keys(this.events);
  }

  /**
   * Get subscriber count for event
   * @param {string} eventName - Event name
   * @returns {number}
   */
  getSubscriberCount(eventName) {
    return this.events[eventName]?.length || 0;
  }
}

// Export singleton instance
export const eventBus = new EventBus();
