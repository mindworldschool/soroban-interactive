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
   * Snap bead to nearest valid position
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   */
  snapBead(col, type, index) {
    const bead = this.abacus.beads[col][type === 'heaven' ? 'heaven' : 'earth'][index];
    const currentY = bead.y;
    const barY = this.abacus.config.barY;
    
    let targetY;
    let targetPosition;
    
    if (type === 'heaven') {
      // Heaven bead: snap to 'up' or 'down'
      const upY = 40 + this.abacus.config.beadHeight / 2 + this.abacus.config.gapFromBar;
      const downY = barY - this.abacus.config.beadHeight / 2 - this.abacus.config.gapFromBar;
      
      // Determine which position is closer
      if (currentY < barY - this.SNAP_DISTANCE) {
        targetY = upY;
        targetPosition = 'up';
      } else {
        targetY = downY;
        targetPosition = 'down';
      }
    } else {
      // Earth bead: snap to 'up' or 'down'
      if (currentY < barY + 10 + this.SNAP_DISTANCE) {
        targetPosition = 'up';
        // Calculate Y based on how many beads are already up
        const upCount = this.abacus.beads[col].earth
          .slice(0, index)
          .filter(b => b.position === 'up').length;
        targetY = barY + 10 + this.abacus.config.beadHeight / 2 + 
                  this.abacus.config.gapFromBar + upCount * this.abacus.config.beadHeight;
      } else {
        targetPosition = 'down';
        // Calculate Y based on how many beads are down after this one
        const downCount = this.abacus.beads[col].earth
          .slice(index + 1)
          .filter(b => b.position === 'down').length;
        targetY = 264 - this.abacus.config.beadHeight / 2 - 
                  this.abacus.config.gapFromBar - downCount * this.abacus.config.beadHeight;
      }
    }
    
    // Animate to target position
    this.animateBeadTo(col, type, index, targetY, targetPosition);
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
    
    if (type === 'heaven') {
      // Heaven bead can move between top and bar
      return {
        min: 40 + beadHeight / 2,
        max: barY - beadHeight / 2 - 1
      };
    } else {
      // Earth bead can move between bar and bottom
      return {
        min: barY + 10 + beadHeight / 2 + 1,
        max: 264 - beadHeight / 2
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
