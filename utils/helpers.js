/**
 * General helper functions
 */

/**
 * Generate random number between min and max
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float between min and max
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device supports touch
 * @returns {boolean}
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Format number with leading zeros
 * @param {number} num 
 * @param {number} length 
 * @returns {string}
 */
export function padNumber(num, length) {
  return String(num).padStart(length, '0');
}

/**
 * Deep clone object
 * @param {Object} obj 
 * @returns {Object}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 * @param {Object} obj 
 * @returns {boolean}
 */
export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * Get element offset relative to document
 * @param {HTMLElement} element 
 * @returns {Object} - {left, top}
 */
export function getElementOffset(element) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY
  };
}

/**
 * Wait for DOM element to exist
 * @param {string} selector 
 * @param {number} timeout 
 * @returns {Promise<HTMLElement>}
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}
