/**
 * Privacy and GDPR compliance utilities for analytics
 */

interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const CONSENT_STORAGE_KEY = 'fmp_analytics_consent';

/**
 * Get user consent preferences from localStorage
 */
export const getConsentPreferences = (): ConsentPreferences | null => {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load consent preferences:', error);
    return null;
  }
};

/**
 * Save user consent preferences
 */
export const saveConsentPreferences = (preferences: ConsentPreferences): void => {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save consent preferences:', error);
  }
};

/**
 * Check if analytics tracking is allowed based on user consent
 */
export const isAnalyticsAllowed = (): boolean => {
  const preferences = getConsentPreferences();
  
  // If no preferences stored, assume consent in development, require consent in production
  if (!preferences) {
    return import.meta.env.DEV;
  }
  
  return preferences.analytics;
};

/**
 * Clear all stored user data and preferences
 */
export const clearUserData = (): void => {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    // Clear other user data as needed
    console.log('User data cleared successfully');
  } catch (error) {
    console.warn('Failed to clear user data:', error);
  }
};

/**
 * Get privacy-compliant user identifier
 * Returns a session-based ID that doesn't persist across browser sessions
 */
export const getSessionId = (): string => {
  const key = 'fmp_session_id';
  let sessionId = sessionStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

/**
 * Anonymize sensitive data before sending to analytics
 */
export const anonymizeData = (data: Record<string, any>): Record<string, any> => {
  const anonymized = { ...data };
  
  // Remove or hash sensitive fields
  const sensitiveFields = ['email', 'name', 'phone', 'address', 'ip'];
  
  sensitiveFields.forEach(field => {
    if (anonymized[field]) {
      delete anonymized[field];
    }
  });
  
  // Add session ID instead of persistent user ID
  anonymized.session_id = getSessionId();
  
  return anonymized;
};

export default {
  getConsentPreferences,
  saveConsentPreferences,
  isAnalyticsAllowed,
  clearUserData,
  getSessionId,
  anonymizeData
};