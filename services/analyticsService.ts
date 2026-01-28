import ReactGA from 'react-ga4';
import { isAnalyticsAllowed, anonymizeData } from '../utils/privacy';

interface AnalyticsConfig {
  measurementId: string;
  debug?: boolean;
  testMode?: boolean;
}

interface PageViewData {
  page_title?: string;
  page_location?: string;
  page_path?: string;
}

interface CustomEventData {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

class AnalyticsService {
  private isInitialized = false;
  private config: AnalyticsConfig | null = null;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize Google Analytics asynchronously
   */
  async initialize(config: AnalyticsConfig): Promise<void> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization(config);
    return this.initializationPromise;
  }

  private async performInitialization(config: AnalyticsConfig): Promise<void> {
    try {
      this.config = config;

      // Initialize ReactGA with configuration
      ReactGA.initialize(config.measurementId, {
        testMode: config.testMode || false,
        debug: config.debug || false,
        gaOptions: {
          // Respect user privacy preferences
          anonymize_ip: true,
          // Improve performance
          transport_type: 'beacon',
        }
      });

      this.isInitialized = true;

      if (config.debug) {
        console.log('Google Analytics initialized successfully', {
          measurementId: config.measurementId,
          testMode: config.testMode
        });
      }
    } catch (error) {
      console.warn('Failed to initialize Google Analytics:', error);
      // Don't throw - degrade gracefully
      this.isInitialized = false;
    }
  }

  /**
   * Track page views asynchronously
   */
  async trackPageView(data?: PageViewData): Promise<void> {
    if (!this.isInitialized) {
      if (this.config?.debug) {
        console.warn('Analytics not initialized, skipping page view tracking');
      }
      return;
    }

    // Check user consent
    if (!isAnalyticsAllowed()) {
      if (this.config?.debug) {
        console.log('Page view tracking declined by user consent');
      }
      return;
    }

    try {
      const pageData = {
        page_title: data?.page_title || document.title,
        page_location: data?.page_location || window.location.href,
        page_path: data?.page_path || window.location.pathname,
      };

      ReactGA.send({
        hitType: 'pageview',
        ...pageData
      });

      if (this.config?.debug) {
        console.log('Page view tracked:', pageData);
      }
    } catch (error) {
      console.warn('Failed to track page view:', error);
      // Degrade gracefully - don't break the app
    }
  }

  /**
   * Track custom events asynchronously
   */
  async trackEvent(eventData: CustomEventData): Promise<void> {
    if (!this.isInitialized) {
      if (this.config?.debug) {
        console.warn('Analytics not initialized, skipping event tracking');
      }
      return;
    }

    // Check user consent
    if (!isAnalyticsAllowed()) {
      if (this.config?.debug) {
        console.log('Analytics tracking declined by user consent');
      }
      return;
    }

    try {
      // Anonymize sensitive data
      const anonymizedParams = eventData.custom_parameters
        ? anonymizeData(eventData.custom_parameters)
        : {};

      ReactGA.event(eventData.action, {
        category: eventData.category,
        label: eventData.label,
        value: eventData.value,
        ...anonymizedParams
      });

      if (this.config?.debug) {
        console.log('Event tracked:', { ...eventData, custom_parameters: anonymizedParams });
      }
    } catch (error) {
      console.warn('Failed to track event:', error);
      // Degrade gracefully - don't break the app
    }
  }

  /**
   * Track user interactions with meal planning features
   */
  async trackMealPlanningEvent(action: string, details?: Record<string, any>): Promise<void> {
    return this.trackEvent({
      action,
      category: 'meal_planning',
      custom_parameters: details
    });
  }

  /**
   * Track LLM-related events (useful for your LLM-driven app)
   */
  async trackLLMEvent(action: string, details?: Record<string, any>): Promise<void> {
    return this.trackEvent({
      action,
      category: 'llm_interaction',
      custom_parameters: details
    });
  }

  /**
   * Track user engagement events
   */
  async trackEngagement(action: string, details?: Record<string, any>): Promise<void> {
    return this.trackEvent({
      action,
      category: 'user_engagement',
      custom_parameters: details
    });
  }

  /**
   * Check if analytics is properly initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;
