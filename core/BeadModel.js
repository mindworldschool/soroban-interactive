/**
 * Bead data model and calculations
 */

import { logger } from './logger.js';

const CONTEXT = 'BeadModel';

export class BeadModel {
  /**
   * @param {number} digitCount - Number of columns
   * @param {Object} config - Configuration object
   */
  constructor(digitCount, config) {
    this.digitCount = digitCount;
    this.config = config;
    this.beads = {};
    this.init();
  }

  /**
   * Initialize bead positions
   */
  init() {
    for (let col = 0; col < this.digitCount; col++) {
      this.beads[col] = {
        heaven: {
          position: 'up',
          y: this.getHeavenInactiveY(),
          isDragging: false
        },
        earth: this.initEarthBeads()
      };
    }
    logger.debug(CONTEXT, `Initialized ${this.digitCount} columns`);
  }

  /**
   * Initialize earth beads for a column
   * @returns {Array}
   */
  initEarthBeads() {
    const beads = [];
    for (let i = 0; i < 4; i++) {
      beads.push({
        position: 'down',
        y: this.getEarthInactiveY(i),
        isDragging: false
      });
    }
    return beads;
  }

  /**
   * Get inactive Y position for heaven bead
   * @returns {number}
   */
  getHeavenInactiveY() {
    return 40 + this.config.beadHeight / 2 + this.config.gapFromBar;
  }

  /**
   * Get active Y position for heaven bead (at bar)
   * @returns {number}
   */
  getHeavenActiveY() {
    return this.config.barY - this.config.beadHeight / 2 - this.config.gapFromBar;
  }

  /**
   * Get active Y position for earth bead (at bar)
   * @param {number} index - Bead index (0-3)
   * @returns {number}
   */
  getEarthActiveY(index) {
    return this.config.barY + 10 + this.config.beadHeight / 2 + 
           this.config.gapFromBar + index * this.config.beadHeight;
  }

  /**
   * Get inactive Y position for earth bead (at bottom)
   * @param {number} index - Bead index (0-3)
   * @returns {number}
   */
  getEarthInactiveY(index) {
    const reverseIndex = 3 - index;
    return 264 - this.config.beadHeight / 2 - this.config.gapFromBar - 
           reverseIndex * this.config.beadHeight;
  }

  /**
   * Get column value
   * @param {number} col - Column index
   * @returns {number}
   */
  getColumnValue(col) {
    let value = 0;

    // Heaven bead = 5
    if (this.beads[col].heaven.position === 'down') {
      value += 5;
    }

    // Earth beads = 1 each
    this.beads[col].earth.forEach(bead => {
      if (bead.position === 'up') {
        value += 1;
      }
    });

    return value;
  }

  /**
   * Set column value
   * @param {number} col - Column index
   * @param {number} value - Value (0-9)
   */
  setColumnValue(col, value) {
    if (value < 0 || value > 9) {
      logger.warn(CONTEXT, `Invalid value ${value} for column ${col}`);
      return;
    }

    // Decompose into heaven (5) + earth (1+1+1+1)
    if (value >= 5) {
      this.beads[col].heaven.position = 'down';
      this.beads[col].heaven.y = this.getHeavenActiveY();

      const remainder = value - 5;
      for (let i = 0; i < 4; i++) {
        if (i < remainder) {
          this.beads[col].earth[i].position = 'up';
          this.beads[col].earth[i].y = this.getEarthActiveY(i);
        } else {
          this.beads[col].earth[i].position = 'down';
          this.beads[col].earth[i].y = this.getEarthInactiveY(i);
        }
      }
    } else {
      this.beads[col].heaven.position = 'up';
      this.beads[col].heaven.y = this.getHeavenInactiveY();

      for (let i = 0; i < 4; i++) {
        if (i < value) {
          this.beads[col].earth[i].position = 'up';
          this.beads[col].earth[i].y = this.getEarthActiveY(i);
        } else {
          this.beads[col].earth[i].position = 'down';
          this.beads[col].earth[i].y = this.getEarthInactiveY(i);
        }
      }
    }
  }

  /**
   * Get bead data
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index (only for earth)
   * @returns {Object}
   */
  getBead(col, type, index = 0) {
    if (type === 'heaven') {
      return this.beads[col].heaven;
    } else {
      return this.beads[col].earth[index];
    }
  }

  /**
   * Update bead position
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   * @param {number} y - New Y position
   */
  updateBeadY(col, type, index, y) {
    if (type === 'heaven') {
      this.beads[col].heaven.y = y;
    } else {
      this.beads[col].earth[index].y = y;
    }
  }

  /**
   * Set bead dragging state
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   * @param {boolean} isDragging - Dragging state
   */
  setDragging(col, type, index, isDragging) {
    if (type === 'heaven') {
      this.beads[col].heaven.isDragging = isDragging;
    } else {
      this.beads[col].earth[index].isDragging = isDragging;
    }
  }

  /**
   * Clear all beads to inactive position
   */
  clear() {
    for (let col = 0; col < this.digitCount; col++) {
      this.setColumnValue(col, 0);
    }
    logger.debug(CONTEXT, 'All beads cleared');
  }

  /**
   * Get all beads data
   * @returns {Object}
   */
  getAllBeads() {
    return this.beads;
  }
}
