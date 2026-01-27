# Google Analytics Integration

## Overview

This document describes the Google Analytics 4 (GA4) integration implemented in the Family Meal Planner app. The integration follows best practices for React applications and maintains the app's async-first, fault-tolerant design principles.

## Implementation Details

### Architecture

The analytics integration uses a **service-oriented architecture** with the following components:

1. **Analytics Service** (`services/analyticsService.ts`) - Core analytics functionality
2. **Configuration Utility** (`config/analytics.ts`) - Environment-based configuration
3. **React Hook** (`hooks/useAnalytics.ts`) - Easy component integration
4. **Environment Variables** - Secure configuration management

### Key Features

- **Asynchronous by design** - All analytics calls are non-blocking
- **Graceful degradation** - App continues to work if analytics fails
- **Environment-aware** - Different behavior for dev/prod environments
- **Privacy-focused** - IP anonymization and user consent considerations
- **Comprehensive tracking** - Page views, user interactions, and custom events

## Configuration

### Environment Variables

Add these variables to your `.env.local` file:

```bash
# Google Analytics Configuration
VITE_GA_MEASUREMENT_ID=G-X5HX141WYD
VITE_GA_DEBUG=false
```

### Configuration Options

- `VITE_GA_MEASUREMENT_ID` - Your GA4 measurement ID (required)
- `VITE_GA_DEBUG` - Enable debug logging (optional, defaults to `true` in development)

## Tracked Events

### Automatic Tracking

- **Page Views** - Initial app load and navigation
- **App Initialization** - Analytics service startup

### User Interactions

- **Meal Planning Events**
  - `plan_generation_started` - When user starts generating a meal plan
  - `plan_generation_completed` - Successful plan generation
  - `plan_generation_failed` - Plan generation errors
  - `plan_regenerated` - User regenerates existing plan
  - `prep_generation_started/completed/failed` - Meal prep planning
  - `grocery_generation_started/completed/failed` - Grocery list generation

- **LLM Interactions**
  - `plan_update_requested` - User requests plan changes via chat
  - `plan_update_completed` - Successful LLM response
  - `plan_update_failed` - LLM interaction errors

- **User Engagement**
  - `stage_changed` - Navigation between planning stages
  - `plan_undo` - User undoes plan changes
  - `chat_opened/closed` - Assistant interaction

### Event Data

Events include contextual information such as:
- Family size and preferences
- Error messages for debugging
- User interaction patterns
- Performance metrics

## Usage Examples

### Basic Page Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

const MyComponent = () => {
  const { trackEvent } = useAnalytics({
    trackPageView: true,
    pageTitle: 'Custom Page Title'
  });

  // Component automatically tracks page view on mount
  return <div>Content</div>;
};
```

### Custom Event Tracking

```typescript
const { trackMealPlanning, trackLLMInteraction } = useAnalytics();

// Track meal planning events
await trackMealPlanning('custom_action', {
  family_size: 4,
  dietary_restrictions: ['vegetarian']
});

// Track LLM interactions
await trackLLMInteraction('user_query', {
  query_length: message.length,
  response_time: responseTime
});
```

### Direct Service Usage

```typescript
import { analyticsService } from '../services/analyticsService';

// Track custom events directly
await analyticsService.trackEvent({
  action: 'custom_event',
  category: 'user_behavior',
  custom_parameters: {
    feature: 'meal_planning',
    value: 42
  }
});
```

## Privacy & Compliance

### Built-in Privacy Features

- **IP Anonymization** - Automatically enabled
- **Beacon Transport** - Improved performance and reliability
- **Test Mode** - Prevents data collection in development

### GDPR Considerations

For production deployment, consider adding:
- Cookie consent management
- User opt-out mechanisms
- Data retention policies

## Development & Testing

### Debug Mode

In development, debug mode is automatically enabled, providing:
- Console logging of all analytics events
- Detailed initialization information
- Error reporting and troubleshooting

### Testing Analytics

1. **Console Verification** - Check browser console for debug logs
2. **Network Monitoring** - Verify GA requests in DevTools
3. **Real-time Reports** - Use GA4 real-time view for live testing

## Production Deployment

### Checklist

- [ ] Set production `VITE_GA_MEASUREMENT_ID`
- [ ] Disable debug mode (`VITE_GA_DEBUG=false`)
- [ ] Verify analytics in GA4 dashboard
- [ ] Test key user flows
- [ ] Monitor error rates

### Performance Considerations

- Analytics calls are asynchronous and non-blocking
- Failed analytics calls don't affect app functionality
- Minimal bundle size impact (~2KB gzipped)

## Troubleshooting

### Common Issues

1. **No data in GA4**
   - Verify measurement ID is correct
   - Check browser console for errors
   - Ensure ad blockers aren't interfering

2. **Debug logs not appearing**
   - Confirm `VITE_GA_DEBUG=true` in development
   - Check environment variable loading

3. **Events not tracking**
   - Verify analytics service initialization
   - Check network requests in DevTools
   - Review error messages in console

### Support

For issues or questions:
1. Check browser console for error messages
2. Verify environment configuration
3. Test with GA4 real-time reports
4. Review network requests in DevTools

## Future Enhancements

Potential improvements for future versions:
- Enhanced e-commerce tracking for premium features
- User journey analysis and funnel tracking
- A/B testing integration
- Custom dashboard for app-specific metrics
- Advanced segmentation and cohort analysis