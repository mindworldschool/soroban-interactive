/**
 * Animation utility functions and easing functions
 */

/**
 * Easing functions
 */
export const Easing = {
  linear: (t) => t,
  
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return -(Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / p));
  },
  
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
  },
  
  easeInBack: (t) => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  
  easeOutBack: (t) => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  }
};

/**
 * Animate a value from start to end
 * @param {Object} options - Animation options
 * @param {number} options.from - Start value
 * @param {number} options.to - End value
 * @param {number} options.duration - Duration in milliseconds
 * @param {Function} options.onUpdate - Update callback (value) => {}
 * @param {Function} options.onComplete - Complete callback
 * @param {Function} options.easing - Easing function (default: easeOutCubic)
 * @returns {Object} - Animation controller with cancel() method
 */
export function animate(options) {
  const {
    from,
    to,
    duration = 300,
    onUpdate,
    onComplete,
    easing = Easing.easeOutCubic
  } = options;

  let startTime = null;
  let animationId = null;
  let cancelled = false;

  function step(timestamp) {
    if (cancelled) return;

    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    
    const currentValue = from + (to - from) * easedProgress;
    
    if (onUpdate) {
      onUpdate(currentValue);
    }

    if (progress < 1) {
      animationId = requestAnimationFrame(step);
    } else {
      if (onComplete) {
        onComplete();
      }
    }
  }

  animationId = requestAnimationFrame(step);

  // Return controller
  return {
    cancel: () => {
      cancelled = true;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    }
  };
}

/**
 * Delay execution
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function}
 */
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
