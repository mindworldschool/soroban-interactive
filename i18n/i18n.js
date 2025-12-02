/**
 * Internationalization system
 */

import { translations } from './translations.js';
import { logger } from '../core/logger.js';

const CONTEXT = 'i18n';

class I18n {
  constructor() {
    this.currentLang = window.APP_LANG || 'ua';
    this.translations = translations;
    logger.debug(CONTEXT, `Initialized with language: ${this.currentLang}`);
  }

  /**
   * Get translation for a key
   * @param {string} key - Translation key
   * @returns {string}
   */
  t(key) {
    const translation = this.translations[this.currentLang]?.[key];
    
    if (!translation) {
      logger.warn(CONTEXT, `Missing translation for key: ${key} in language: ${this.currentLang}`);
      return key;
    }
    
    return translation;
  }

  /**
   * Change current language
   * @param {string} lang - Language code (ua, en, ru, es)
   */
  setLanguage(lang) {
    if (!this.translations[lang]) {
      logger.error(CONTEXT, `Language not supported: ${lang}`);
      return;
    }

    this.currentLang = lang;
    localStorage.setItem('soroban_lang', lang);
    window.APP_LANG = lang;
    
    // Update HTML lang attribute
    const langMap = { ua: 'uk', en: 'en', ru: 'ru', es: 'es' };
    document.documentElement.lang = langMap[lang] || 'uk';
    
    logger.info(CONTEXT, `Language changed to: ${lang}`);
    
    // Trigger custom event for other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  /**
   * Get current language
   * @returns {string}
   */
  getCurrentLanguage() {
    return this.currentLang;
  }

  /**
   * Get all available languages
   * @returns {string[]}
   */
  getAvailableLanguages() {
    return Object.keys(this.translations);
  }
}

// Export singleton instance
export const i18n = new I18n();

// Export convenience function
export const t = (key) => i18n.t(key);
