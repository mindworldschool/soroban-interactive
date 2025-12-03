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
    const beadHeight = this.abacus.config.beadHeight;
    const gap = 1;

    // Determine position based on distance from middle bar
    const ACTIVATION_DISTANCE = 30; // Косточка активна если в пределах 30px от средней планки

    if (type === 'heaven') {
      // Heaven bead: опущена (down) если близко к планке (ниже y=111) → даёт 5
      const barTop = 111;
      const threshold = barTop - ACTIVATION_DISTANCE; // 81
      beadRef.position = currentY > threshold ? 'down' : 'up';
    } else {
      // Earth bead: поднята (up) если близко к планке (выше y=121) → даёт 1
      const barBottom = 121;
      const threshold = barBottom + ACTIVATION_DISTANCE; // 151
      beadRef.position = currentY < threshold ? 'up' : 'down';
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
    const beadHeight = this.abacus.config.beadHeight;
    const gap = 1; // 1px gap from bars/frames

    if (type === 'heaven') {
      // Heaven bead moves between top frame (bottom at y=60) and middle bar (top at y=111)
      return {
        min: 60 + beadHeight / 2 + gap,   // 60 + 18 + 1 = 79
        max: 111 - beadHeight / 2 - gap   // 111 - 18 - 1 = 92
      };
    } else {
      // Earth beads move between middle bar (bottom at y=121) and bottom frame (top at y=284)
      return {
        min: 121 + beadHeight / 2 + gap,  // 121 + 18 + 1 = 140
        max: 284 - beadHeight / 2 - gap   // 284 - 18 - 1 = 265
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
