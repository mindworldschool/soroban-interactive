/**
 * Abacus Physics - Handles bead movement physics and snapping
 */

import { logger } from '../core/logger.js';
import { animate, Easing } from '../utils/animations.js';

const CONTEXT = 'AbacusPhysics';

export class AbacusPhysics {
  /**
   * @param {Abacus} abacus - Abacus instance
   */
  constructor(abacus) {
    this.abacus = abacus;
    this.SNAP_DISTANCE = 15;
    this.ANIMATION_DURATION = 150;
    this.currentAnimation = null;
    
    logger.debug(CONTEXT, 'Physics initialized');
  }

  /**
   * Snap bead - just update position state based on current Y
   * No animation, bead stays where user released it
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   */
  snapBead(col, type, index) {
    const beadRef = type === 'heaven'
      ? this.abacus.beads[col].heaven
      : this.abacus.beads[col].earth[index];

    const currentY = beadRef.y;
    const barY = this.abacus.config.barY;

    // Determine position based on current Y coordinate
    if (type === 'heaven') {
      // Heaven bead: active ('down') only when moved significantly toward bar (>60% of range)
      const minY = 40 + this.abacus.config.beadHeight / 2 + this.abacus.config.gapFromBar;
      const maxY = 91 - this.abacus.config.beadHeight / 2 - this.abacus.config.gapFromBar - 1;
      const range = maxY - minY;
      const activeThreshold = minY + 0.4 * range; // Active if moved more than 40% toward bar
      beadRef.position = currentY > activeThreshold ? 'down' : 'up';
    } else {
      // Earth bead: active ('up') only when moved significantly toward bar (>60% of range)
      const minY = 101 + this.abacus.config.beadHeight / 2 + this.abacus.config.gapFromBar + 1;
      const maxY = 264 - this.abacus.config.beadHeight / 2 - this.abacus.config.gapFromBar;
      const range = maxY - minY;
      const activeThreshold = maxY - 0.4 * range; // Active if moved more than 40% toward bar
      beadRef.position = currentY < activeThreshold ? 'up' : 'down';
    }

    beadRef.isDragging = false;

    // Update digits if enabled
    if (this.abacus.config.showDigits && this.abacus.renderer) {
      this.abacus.renderer.updateDigits();
    }

    // Trigger onChange event
    this.abacus.triggerEvent('onChange', {
      col,
      type,
      index,
      value: this.abacus.getValue()
    });

    // Trigger onBeadSnap event
    this.abacus.triggerEvent('onBeadSnap', {
      col,
      type,
      index,
      position: beadRef.position
    });

    logger.debug(CONTEXT, `Bead snapped: col=${col}, type=${type}, position=${beadRef.position}`);
  }

  /**
   * Animate bead to target position
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   * @param {number} targetY - Target Y position
   * @param {string} targetPosition - Target position ('up' or 'down')
   */
  animateBeadTo(col, type, index, targetY, targetPosition) {
    // Cancel previous animation if exists
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
    }

    const beadRef = type === 'heaven' 
      ? this.abacus.beads[col].heaven 
      : this.abacus.beads[col].earth[index];
    
    const startY = beadRef.y;

    this.currentAnimation = animate({
      from: startY,
      to: targetY,
      duration: this.ANIMATION_DURATION,
      easing: Easing.easeOutCubic,
      onUpdate: (currentY) => {
        beadRef.y = currentY;
        if (this.abacus.renderer) {
          this.abacus.renderer.updateBeadPosition(col, type, index, currentY);
        }
      },
      onComplete: () => {
        beadRef.position = targetPosition;
        beadRef.y = targetY;
        beadRef.isDragging = false;
        
        // Update digits if enabled
        if (this.abacus.config.showDigits && this.abacus.renderer) {
          this.abacus.renderer.updateDigits();
        }
        
        // Trigger onChange event
        this.abacus.triggerEvent('onChange', { 
          col, 
          type, 
          index, 
          value: this.abacus.getValue() 
        });
        
        // Trigger onBeadSnap event
        this.abacus.triggerEvent('onBeadSnap', { 
          col, 
          type, 
          index, 
          position: targetPosition 
        });
        
        this.currentAnimation = null;
        logger.debug(CONTEXT, `Bead snapped: col=${col}, type=${type}, position=${targetPosition}`);
      }
    });
  }

  /**
   * Get Y constraints for bead dragging
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   * @returns {Object} - {min, max}
   */
  getYConstraints(col, type, index) {
    const barY = this.abacus.config.barY;
    const beadHeight = this.abacus.config.beadHeight;
    const gapFromBar = this.abacus.config.gapFromBar;

    if (type === 'heaven') {
      // Heaven bead can move between top frame and bar
      // Stop 1px before bar (91 is bar top, so max should be bar top - beadHeight/2 - gap - 1)
      return {
        min: 40 + beadHeight / 2 + gapFromBar,
        max: 91 - beadHeight / 2 - gapFromBar - 1
      };
    } else {
      // Earth bead can move between bar and bottom frame
      // Start 1px after bar (101 is bar bottom)
      return {
        min: 101 + beadHeight / 2 + gapFromBar + 1,
        max: 264 - beadHeight / 2 - gapFromBar
      };
    }
  }

  /**
   * Check if bead should snap to bar
   * @param {number} y - Current Y position
   * @param {number} barY - Bar Y position
   * @returns {boolean}
   */
  shouldSnapToBar(y, barY) {
    return Math.abs(y - barY) <= this.SNAP_DISTANCE;
  }

  /**
   * Cancel current animation
   */
  cancelAnimation() {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }
  }
}
