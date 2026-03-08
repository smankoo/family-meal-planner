/**
 * Analytics configuration utility
 * Handles environment variables and provides sensible defaults
 */

interface AnalyticsConfig {
  measurementId: string;
  debug: boolean;
  testMode: boolean;
  enabled: boolean;
}

/**
 * Get analytics configuration from environment variables
 */
export const getAnalyticsConfig = (): AnalyticsConfig => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const debug = import.meta.env.VITE_GA_DEBUG === 'true';
  const isDevelopment = import.meta.env.DEV;

  return {
    measurementId: measurementId || '',
    debug: debug || isDevelopment,
    testMode: isDevelopment,
    enabled: Boolean(measurementId) && measurementId.trim() !== ''
  };
};

/**
 * Validate analytics configuration
 */
export const validateAnalyticsConfig = (config: AnalyticsConfig): boolean => {
  if (!config.enabled) {
    if (config.debug) {
      console.warn('Google Analytics is disabled - no measurement ID provided');
    }
    return false;
  }

  if (!config.measurementId.startsWith('G-')) {
    console.warn('Invalid Google Analytics measurement ID format. Expected format: G-XXXXXXXXXX');
    return false;
  }

  // Production-specific validations
  if (!config.testMode) {
    if (config.debug) {
      console.warn('Analytics debug mode is enabled in production. Consider disabling for better performance.');
    }

    // Verify measurement ID looks production-ready
    if (config.measurementId === 'G-XXXXXXXXXX' || config.measurementId.includes('test')) {
      console.error('Production deployment detected with test/placeholder measurement ID');
      return false;
    }
  }

  return true;
};

export default getAnalyticsConfig;
