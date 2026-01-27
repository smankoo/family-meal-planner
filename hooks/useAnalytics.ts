import { useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';

interface UseAnalyticsOptions {
  trackPageView?: boolean;
  pageTitle?: string;
}

/**
 * Custom hook for Google Analytics integration
 * Follows React best practices and your async-first principles
 */
export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { trackPageView = true, pageTitle } = options;

  // Track page view on mount
  useEffect(() => {
    if (trackPageView) {
      analyticsService.trackPageView({
        page_title: pageTitle
      });
    }
  }, [trackPageView, pageTitle]);

  // Memoized tracking functions to prevent unnecessary re-renders
  const trackEvent = useCallback(async (action: string, details?: Record<string, any>) => {
    return analyticsService.trackEvent({
      action,
      custom_parameters: details
    });
  }, []);

  const trackMealPlanning = useCallback(async (action: string, details?: Record<string, any>) => {
    return analyticsService.trackMealPlanningEvent(action, details);
  }, []);

  const trackLLMInteraction = useCallback(async (action: string, details?: Record<string, any>) => {
    return analyticsService.trackLLMEvent(action, details);
  }, []);

  const trackEngagement = useCallback(async (action: string, details?: Record<string, any>) => {
    return analyticsService.trackEngagement(action, details);
  }, []);

  return {
    trackEvent,
    trackMealPlanning,
    trackLLMInteraction,
    trackEngagement,
    isInitialized: analyticsService.initialized
  };
};

export default useAnalytics;