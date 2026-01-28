import React, { useState, useEffect } from 'react';
import StageStepper from './components/StageStepper';
import MealGrid from './components/MealGrid';
import ChatInterface from './components/ChatInterface';
import MealPrepView from './components/MealPrepView';
import GroceryListView from './components/GroceryListView';
import FamilySetup from './components/FamilySetup';
import ToastContainer from './components/Toast';
import ErrorModal from './components/ErrorModal';
import ConfirmationModal from './components/ConfirmationModal';
import Footer from './components/Footer';
import { ToastProvider, useToast } from './contexts/ToastContext';
import {
  Stage,
  WeekPlan,
  ChatMessage,
  PrepTask,
  GroceryItem,
  PlanHistory,
  FamilyMember,
  FamilyPreferences,
  InvalidationState
} from './types';
import {
  INITIAL_FAMILY,
  INITIAL_PREFERENCES,
  EMPTY_PLAN
} from './constants';
import {
  generateInitialMealPlan,
  generateInitialMealPlanStream,
  updateMealPlanWithAgent,
  generateMealPrepPlan,
  generateMealPrepPlanStream,
  generateGroceryList,
  generateGroceryListStream
} from './services/geminiService';
import { analyticsService } from './services/analyticsService';
import { getAnalyticsConfig, validateAnalyticsConfig } from './config/analytics';
import { Undo2, Sparkles, ChefHat, Settings, ArrowLeft, ArrowRight, X, Loader2, RotateCcw } from 'lucide-react';

// Helper function to handle API errors consistently
const handleApiError = (error: any, showToast: any, setErrorModal: any, onRetry?: () => void) => {
  // Better error extraction and serialization
  let errorCode = (error as any)?.code;
  let errorMessage = 'Unknown error occurred';
  let errorDetails = '';

  // Handle different error types
  if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
    errorDetails = error;
  } else if (error && typeof error === 'object') {
    // Handle API response errors
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      errorCode = error.response?.status;

      // Handle validation errors (arrays of error objects)
      if (Array.isArray(detail)) {
        errorMessage = 'Validation error occurred';
        errorDetails = detail.map(err => {
          const location = Array.isArray(err.loc) ? err.loc.join('.') : 'unknown';
          return `${location}: ${err.msg || 'Validation failed'}`;
        }).join('\n');
      } else if (typeof detail === 'string') {
        errorMessage = detail;
        errorDetails = JSON.stringify(error.response.data, null, 2);
      } else {
        errorMessage = 'API error occurred';
        errorDetails = JSON.stringify(error.response.data, null, 2);
      }
    } else if (error.message) {
      errorMessage = error.message;
      errorDetails = error.stack || JSON.stringify(error, null, 2);
    } else if (error.detail) {
      // Handle direct detail property
      if (Array.isArray(error.detail)) {
        errorMessage = 'Validation error occurred';
        errorDetails = error.detail.map(err => {
          const location = Array.isArray(err.loc) ? err.loc.join('.') : 'unknown';
          return `${location}: ${err.msg || 'Validation failed'}`;
        }).join('\n');
      } else if (typeof error.detail === 'string') {
        errorMessage = error.detail;
        errorDetails = JSON.stringify(error, null, 2);
      } else {
        errorMessage = 'API error occurred';
        errorDetails = JSON.stringify(error, null, 2);
      }
    } else {
      // Fallback: try to serialize the error object
      try {
        const serialized = JSON.stringify(error, null, 2);
        errorMessage = 'An unexpected error occurred';
        errorDetails = serialized;
      } catch {
        errorMessage = 'An unexpected error occurred';
        errorDetails = 'Error details could not be serialized';
      }
    }

    // Extract additional error properties
    errorCode = errorCode || error.code || error.status || error.response?.status;
  }

  const retryAfter = (error as any)?.retryAfter;

  console.error('API Error:', {
    code: errorCode,
    message: errorMessage,
    retryAfter,
    originalError: error
  });

  switch (errorCode) {
    case 'MISSING_API_KEY':
    case 'AUTH_ERROR':
      setErrorModal({
        isOpen: true,
        title: 'API Configuration Required',
        message: 'The Gemini API key needs to be configured to generate meal plans.',
        details: errorDetails,
        onRetry
      });
      break;

    case 'RATE_LIMIT_EXCEEDED':
    case 429:
      const retryMessage = retryAfter
        ? `Rate limit reached. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
        : 'Rate limit reached. Please try again in a few minutes.';
      showToast(retryMessage, 'warning', 8000);
      break;

    case 'TIMEOUT':
    case 408:
      showToast('Request timed out. Please try again.', 'warning', 6000);
      break;

    case 'SERVICE_UNAVAILABLE':
    case 503:
      const serviceRetryMessage = retryAfter
        ? `AI service temporarily unavailable. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`
        : 'AI service temporarily unavailable. Please try again later.';
      showToast(serviceRetryMessage, 'warning', 8000);
      break;

    case 'PERMISSION_DENIED':
    case 403:
      setErrorModal({
        isOpen: true,
        title: 'Permission Denied',
        message: 'Your API key doesn\'t have permission to access this resource.',
        details: errorDetails,
        onRetry
      });
      break;

    case 'INVALID_REQUEST':
    case 400:
    case 422:
      setErrorModal({
        isOpen: true,
        title: 'Request Error',
        message: 'There was an issue with the request. Please try again.',
        details: errorDetails,
        onRetry
      });
      break;

    case 500:
    case 502:
    case 504:
      setErrorModal({
        isOpen: true,
        title: 'Server Error',
        message: 'The server encountered an error. This might be temporary.',
        details: errorDetails,
        onRetry
      });
      break;

    default:
      // Fallback to string matching for backwards compatibility
      if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        showToast('Rate limit reached. Please try again in a few minutes.', 'warning', 8000);
      } else if (errorMessage.includes('timeout')) {
        showToast('Request timed out. Please try again.', 'warning', 6000);
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Generation Failed',
          message: 'We encountered an issue while processing your request. This might be temporary.',
          details: errorDetails,
          onRetry
        });
      }
  }
};

type ViewMode = 'planning' | 'household';

// --- Local Storage Helpers ---
const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.error(`Failed to load ${key}`, e);
    return fallback;
  }
};

const saveState = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key}`, e);
  }
};

const App: React.FC = () => {
  const { showToast } = useToast();
  // --- Initialization with Persistence ---

  const [family, setFamily] = useState<FamilyMember[]>(() =>
    loadState('fmp_family', INITIAL_FAMILY)
  );

  const [preferences, setPreferences] = useState<FamilyPreferences>(() =>
    loadState('fmp_preferences', INITIAL_PREFERENCES)
  );

  const [hasPlanGenerated, setHasPlanGenerated] = useState<boolean>(() =>
    loadState('fmp_has_plan', false)
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
     // If we have a plan generated, default to planning view
     loadState('fmp_has_plan', false) ? 'planning' : 'household'
  );

  const [currentStage, setCurrentStage] = useState<Stage>(() =>
    loadState('fmp_current_stage', Stage.MEAL_PLANNING)
  );

  const [planHistory, setPlanHistory] = useState<PlanHistory>(() =>
    loadState('fmp_plan_history', {
      past: [],
      present: EMPTY_PLAN,
      future: []
    })
  );

  const [prepTasks, setPrepTasks] = useState<PrepTask[]>(() =>
    loadState('fmp_prep_tasks', [])
  );

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() =>
    loadState('fmp_grocery_items', [])
  );

  // Invalidation state for tracking when prep/grocery lists need updates
  const [invalidationState, setInvalidationState] = useState<InvalidationState>(() =>
    loadState('fmp_invalidation_state', {
      currentPlanVersion: Date.now().toString()
    })
  );

  // Runtime UI state (not persisted)
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastDiffPlan, setLastDiffPlan] = useState<WeekPlan | undefined>(undefined);
  const [newlyReceivedCards, setNewlyReceivedCards] = useState<Set<string>>(new Set());
  const [animatedCards, setAnimatedCards] = useState<Set<string>>(new Set()); // Track cards that have already animated
  const [newlyReceivedTasks, setNewlyReceivedTasks] = useState<Set<string>>(new Set());
  const [newlyReceivedItems, setNewlyReceivedItems] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    details?: string;
    onRetry?: () => void;
  }>({
    isOpen: false,
    message: ''
  });

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // --- Analytics Initialization ---
  useEffect(() => {
    const initializeAnalytics = async () => {
      const config = getAnalyticsConfig();

      if (validateAnalyticsConfig(config)) {
        try {
          await analyticsService.initialize({
            measurementId: config.measurementId,
            debug: config.debug,
            testMode: config.testMode
          });

          // Track initial page view
          await analyticsService.trackPageView({
            page_title: 'Family Meal Planner - Home'
          });

          if (config.debug) {
            console.log('Analytics initialized successfully');
          }
        } catch (error) {
          console.warn('Analytics initialization failed:', error);
        }
      }
    };

    initializeAnalytics();
  }, []);


  // --- Persistence Effects ---

  useEffect(() => saveState('fmp_family', family), [family]);
  useEffect(() => saveState('fmp_preferences', preferences), [preferences]);
  useEffect(() => saveState('fmp_has_plan', hasPlanGenerated), [hasPlanGenerated]);
  useEffect(() => saveState('fmp_current_stage', currentStage), [currentStage]);
  useEffect(() => saveState('fmp_plan_history', planHistory), [planHistory]);
  useEffect(() => saveState('fmp_prep_tasks', prepTasks), [prepTasks]);
  useEffect(() => saveState('fmp_grocery_items', groceryItems), [groceryItems]);
  useEffect(() => saveState('fmp_invalidation_state', invalidationState), [invalidationState]);


  // --- Actions ---

  // Helper functions to check invalidation status
  const isPrepPlanInvalidated = (): boolean => {
    return !!(
      prepTasks.length > 0 &&
      invalidationState.prepPlanVersion &&
      invalidationState.prepPlanVersion !== invalidationState.currentPlanVersion
    );
  };

  const isGroceryListInvalidated = (): boolean => {
    return !!(
      groceryItems.length > 0 &&
      invalidationState.groceryListVersion &&
      invalidationState.groceryListVersion !== invalidationState.currentPlanVersion
    );
  };

  // Helper function to generate new plan version
  const generatePlanVersion = (): string => {
    return Date.now().toString();
  };

  const handleGenerateInitialPlan = async (members: FamilyMember[], prefs: FamilyPreferences) => {
    setIsLoading(true);

    // Track plan generation start
    await analyticsService.trackMealPlanningEvent('plan_generation_started', {
      family_size: members.length,
      dietary_restrictions: prefs.dietaryRestrictions?.length || 0,
      cooking_time: prefs.cookingTime,
      budget: prefs.budget
    });

    // Initialize empty plan for streaming updates
    const emptyPlan: WeekPlan = Array.from({ length: 7 }, (_, index) => ({
      day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index],
      meals: {
        Breakfast: { name: '', description: '', notes: '' },
        Lunch: { name: '', description: '', notes: '' },
        Snack: { name: '', description: '', notes: '' },
        Dinner: { name: '', description: '', notes: '' }
      }
    }));

    // Clear previously received cards and set initial empty plan
    setNewlyReceivedCards(new Set());
    setAnimatedCards(new Set()); // Reset animated cards for new generation

    // Generate new plan version and invalidate downstream data
    const newPlanVersion = generatePlanVersion();
    setInvalidationState({
      currentPlanVersion: newPlanVersion,
      prepPlanVersion: undefined,
      groceryListVersion: undefined
    });

    setPlanHistory({
      past: [],
      present: emptyPlan,
      future: []
    });
    setHasPlanGenerated(true);
    setViewMode('planning');
    setCurrentStage(Stage.MEAL_PLANNING);

    // Elegant scroll to top - Apple-style smooth behavior
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);

    try {
      // Use meal-by-meal streaming generation
      await generateInitialMealPlanStream(
        members,
        prefs,
        // onMealReceived callback
        (mealData: any) => {
          // Track newly received card for this specific meal
          const cardKey = `${mealData.day}-${mealData.mealType}`;

          // Only animate if this card hasn't been animated before
          if (!animatedCards.has(cardKey)) {
            setNewlyReceivedCards(prev => new Set([...prev, cardKey]));
            setAnimatedCards(prev => new Set([...prev, cardKey]));

            // Clear the animation state after animation completes
            setTimeout(() => {
              setNewlyReceivedCards(prev => {
                const updated = new Set(prev);
                updated.delete(cardKey);
                return updated;
              });
            }, 600); // Match animation duration
          }

          // Update plan with new meal data
          setPlanHistory(prev => {
            const newPlan = [...prev.present];

            // Find the day index
            const dayIndex = newPlan.findIndex(day => day.day === mealData.day);
            if (dayIndex !== -1) {
              // Update the specific meal
              newPlan[dayIndex] = {
                ...newPlan[dayIndex],
                meals: {
                  ...newPlan[dayIndex].meals,
                  [mealData.mealType]: mealData.meal
                }
              };
            }

            return {
              ...prev,
              present: newPlan
            };
          });
        },
        // onComplete callback
        async () => {
          setIsLoading(false);

          // Track successful plan generation
          await analyticsService.trackMealPlanningEvent('plan_generation_completed', {
            family_size: members.length,
            streaming: true
          });
        },
        // onError callback
        async (error: Error) => {
          setIsLoading(false);

          // Track plan generation failure
          await analyticsService.trackMealPlanningEvent('plan_generation_failed', {
            error_message: error.message,
            streaming: true
          });

          // Use the centralized error handler for consistent error display
          handleApiError(error, showToast, setErrorModal, () => handleGenerateInitialPlan(members, prefs));
        }
      );

    } catch (error) {
      setIsLoading(false);

      // Fallback to batch generation if streaming fails
      try {
        const plan = await generateInitialMealPlan(members, prefs);
        setPlanHistory({
          past: [],
          present: plan,
          future: []
        });

        await analyticsService.trackMealPlanningEvent('plan_generation_completed', {
          family_size: members.length,
          fallback: true
        });

      } catch (fallbackError) {
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error occurred';

        await analyticsService.trackMealPlanningEvent('plan_generation_failed', {
          error_message: errorMessage,
          fallback: true
        });

        handleApiError(fallbackError, showToast, setErrorModal, () => handleGenerateInitialPlan(members, prefs));
      }
    }
  };

  const handleRegeneratePlan = async () => {
    setConfirmationModal({
      isOpen: true,
      title: 'Regenerate Plan?',
      message: 'This will create a completely new plan based on your current settings, overwriting any changes. Continue?',
      confirmLabel: 'Regenerate',
      onConfirm: async () => {
        // Track plan regeneration
        await analyticsService.trackMealPlanningEvent('plan_regenerated', {
          had_previous_plan: hasPlanGenerated,
          family_size: family.length
        });

        // Reset all states for fresh regeneration with skeleton loading
        setPrepTasks([]);
        setGroceryItems([]);
        setNewlyReceivedCards(new Set());
        setAnimatedCards(new Set());
        setNewlyReceivedTasks(new Set());
        setNewlyReceivedItems(new Set());

        // Reset invalidation state for fresh plan
        const newPlanVersion = generatePlanVersion();
        setInvalidationState({
          currentPlanVersion: newPlanVersion,
          prepPlanVersion: undefined,
          groceryListVersion: undefined
        });

        await handleGenerateInitialPlan(family, preferences);
        // Note: scroll behavior is handled in handleGenerateInitialPlan
      }
    });
  };

  const handleSaveSetup = (newFamily: FamilyMember[], newPrefs: FamilyPreferences) => {
    setFamily(newFamily);
    setPreferences(newPrefs);
    if (!hasPlanGenerated) {
        handleGenerateInitialPlan(newFamily, newPrefs);
    } else {
        setViewMode('planning');
    }
  };

  const handleCloseSetup = () => {
      if (hasPlanGenerated) {
          setViewMode('planning');
      }
  };

  const handlePlanUpdate = async (userMessage: string) => {
    setIsLoading(true);
    const newMsgId = Date.now().toString();
    const userMsg: ChatMessage = { id: newMsgId, role: 'user', content: userMessage, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    // Track LLM interaction start
    await analyticsService.trackLLMEvent('plan_update_requested', {
      message_length: userMessage.length,
      current_stage: currentStage
    });

    try {
      const { plan: newPlan, explanation } = await updateMealPlanWithAgent(
        planHistory.present,
        userMessage,
        family,
        preferences
      );

      setLastDiffPlan(planHistory.present);

      // Generate new plan version to invalidate downstream data
      const newPlanVersion = generatePlanVersion();
      setInvalidationState(prev => ({
        ...prev,
        currentPlanVersion: newPlanVersion
      }));

      setPlanHistory(prev => ({
        past: [...prev.past, prev.present],
        present: newPlan,
        future: []
      }));

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: explanation,
        timestamp: Date.now(),
        relatedAction: 'Plan Updated'
      };
      setMessages(prev => [...prev, botMsg]);

      // Track successful LLM interaction
      await analyticsService.trackLLMEvent('plan_update_completed', {
        response_length: explanation.length,
        changes_made: true
      });

    } catch (error) {
      console.error(error);

      // Track LLM interaction failure
      await analyticsService.trackLLMEvent('plan_update_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

      const errorCode = (error as any)?.code;

      if (errorCode === 'RATE_LIMIT_EXCEEDED' || errorCode === 'SERVICE_UNAVAILABLE') {
        // For rate limits, just show a toast
        handleApiError(error, showToast, () => {}, undefined);
      } else {
        // For other errors, show system message in chat
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: "I encountered an error updating the plan. Please try again or rephrase your request.",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);

        showToast('Failed to update plan. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (planHistory.past.length === 0) return;

    // Track undo action
    analyticsService.trackEngagement('plan_undo', {
      undo_depth: planHistory.past.length
    });

    const previous = planHistory.past[planHistory.past.length - 1];
    const newPast = planHistory.past.slice(0, -1);
    setLastDiffPlan(undefined);
    setPlanHistory({
      past: newPast,
      present: previous,
      future: [planHistory.present, ...planHistory.future]
    });
  };

  const handleStageChange = async (newStage: Stage) => {
    // Track stage navigation
    await analyticsService.trackEngagement('stage_changed', {
      from_stage: currentStage,
      to_stage: newStage
    });

    // Immediate UI update - switch to the new stage first for responsive feel
    setCurrentStage(newStage);

    // Elegant scroll to top - Apple-style smooth behavior
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);

    // If switching to prep and we don't have prep tasks, generate them
    if (newStage === Stage.MEAL_PREP && prepTasks.length === 0) {
      setIsLoading(true);

      await analyticsService.trackMealPlanningEvent('prep_generation_started');

      // Clear previously received tasks and set initial empty state
      setNewlyReceivedTasks(new Set());
      setPrepTasks([]);

      try {
        // Use task-by-task streaming generation
        await generateMealPrepPlanStream(
          planHistory.present,
          // onTaskReceived callback
          (taskData: any) => {
            // Create task with proper ID and structure
            const newTask: PrepTask = {
              id: `prep-${Date.now()}-${Math.random()}`,
              day: taskData.day,
              task: taskData.task,
              relatedMeals: Array.isArray(taskData.relatedMeals) ? taskData.relatedMeals :
                           typeof taskData.relatedMeals === 'string' ? [taskData.relatedMeals] : [],
              completed: false
            };

            // Track newly received task for animation using the same key format as component
            const taskKey = `${taskData.day}-${newTask.id}`;
            setNewlyReceivedTasks(prev => new Set([...prev, taskKey]));

            // Add task to the list
            setPrepTasks(prev => [...prev, newTask]);

            // Clear the animation state after animation completes
            setTimeout(() => {
              setNewlyReceivedTasks(prev => {
                const updated = new Set(prev);
                updated.delete(taskKey);
                return updated;
              });
            }, 600); // Match animation duration
          },
          // onComplete callback
          async () => {
            setIsLoading(false);

            // Mark prep plan as current with the meal plan version
            setInvalidationState(prev => ({
              ...prev,
              prepPlanVersion: prev.currentPlanVersion
            }));

            await analyticsService.trackMealPlanningEvent('prep_generation_completed', {
              streaming: true
            });
          },
          // onError callback
          async (error: Error) => {
            setIsLoading(false);

            await analyticsService.trackMealPlanningEvent('prep_generation_failed', {
              error_message: error.message,
              streaming: true
            });

            const errorMessage = error.message;
            if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
              showToast('Rate limit reached. Prep tasks will be generated later.', 'warning', 6000);
            } else {
              showToast('Failed to generate prep tasks. You can try again later.', 'error', 6000);
            }
          }
        );

      } catch (error) {
        setIsLoading(false);

        // Fallback to batch generation if streaming fails
        try {
          const tasks = await generateMealPrepPlan(planHistory.present);
          setPrepTasks(tasks);

          // Mark prep plan as current with the meal plan version
          setInvalidationState(prev => ({
            ...prev,
            prepPlanVersion: prev.currentPlanVersion
          }));

          await analyticsService.trackMealPlanningEvent('prep_generation_completed', {
            fallback: true
          });

        } catch (fallbackError) {
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';

          await analyticsService.trackMealPlanningEvent('prep_generation_failed', {
            error_message: errorMessage,
            fallback: true
          });

          const errorCode = (fallbackError as any)?.code;
          if (errorCode === 'RATE_LIMIT_EXCEEDED') {
            const retryAfter = (fallbackError as any)?.retryAfter;
            const retryMessage = retryAfter
              ? `Rate limit reached. Prep tasks will be generated in ${Math.ceil(retryAfter / 60)} minutes.`
              : 'Rate limit reached. Prep tasks will be generated later.';
            showToast(retryMessage, 'warning', 6000);
          } else {
            showToast('Failed to generate prep tasks. You can try again later.', 'error', 6000);
          }
        }
      }
    }

    // If switching to grocery list and we don't have grocery items, generate them
    if (newStage === Stage.GROCERY_LIST && groceryItems.length === 0) {
      setIsLoading(true);

      await analyticsService.trackMealPlanningEvent('grocery_generation_started');

      // Clear previously received items and set initial empty state
      setNewlyReceivedItems(new Set());
      setGroceryItems([]);

      try {
        // Use item-by-item streaming generation
        await generateGroceryListStream(
          planHistory.present,
          prepTasks,
          // onItemReceived callback
          (itemData: any) => {
            // Create item with proper ID and structure
            const newItem: GroceryItem = {
              id: `groc-${Date.now()}-${Math.random()}`,
              name: itemData.name,
              category: itemData.category,
              quantity: itemData.quantity,
              checked: false
            };

            // Track newly received item for animation using the same key format as component
            const itemKey = `${itemData.category}-${itemData.name}-${newItem.id}`;
            setNewlyReceivedItems(prev => new Set([...prev, itemKey]));

            // Add item to the list
            setGroceryItems(prev => [...prev, newItem]);

            // Clear the animation state after animation completes
            setTimeout(() => {
              setNewlyReceivedItems(prev => {
                const updated = new Set(prev);
                updated.delete(itemKey);
                return updated;
              });
            }, 600); // Match animation duration
          },
          // onComplete callback
          async () => {
            setIsLoading(false);

            // Mark grocery list as current with the meal plan version
            setInvalidationState(prev => ({
              ...prev,
              groceryListVersion: prev.currentPlanVersion
            }));

            await analyticsService.trackMealPlanningEvent('grocery_generation_completed', {
              streaming: true
            });
          },
          // onError callback
          async (error: Error) => {
            setIsLoading(false);

            await analyticsService.trackMealPlanningEvent('grocery_generation_failed', {
              error_message: error.message,
              streaming: true
            });

            const errorMessage = error.message;
            if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
              showToast('Rate limit reached. Grocery list will be generated later.', 'warning', 6000);
            } else {
              showToast('Failed to generate grocery list. You can try again later.', 'error', 6000);
            }
          }
        );

      } catch (error) {
        setIsLoading(false);

        // Fallback to batch generation if streaming fails
        try {
          const items = await generateGroceryList(planHistory.present, prepTasks);
          setGroceryItems(items);

          // Mark grocery list as current with the meal plan version
          setInvalidationState(prev => ({
            ...prev,
            groceryListVersion: prev.currentPlanVersion
          }));

          await analyticsService.trackMealPlanningEvent('grocery_generation_completed', {
            fallback: true
          });

        } catch (fallbackError) {
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';

          await analyticsService.trackMealPlanningEvent('grocery_generation_failed', {
            error_message: errorMessage,
            fallback: true
          });

          const errorCode = (fallbackError as any)?.code;
          if (errorCode === 'RATE_LIMIT_EXCEEDED') {
            const retryAfter = (fallbackError as any)?.retryAfter;
            const retryMessage = retryAfter
              ? `Rate limit reached. Grocery list will be generated in ${Math.ceil(retryAfter / 60)} minutes.`
              : 'Rate limit reached. Grocery list will be generated later.';
            showToast(retryMessage, 'warning', 6000);
          } else {
            showToast('Failed to generate grocery list. You can try again later.', 'error', 6000);
          }
        }
      }
    }
  };

  // Helper functions for regenerating prep and grocery lists
  const handleProceedToPrep = async () => {
    await handleStageChange(Stage.MEAL_PREP);
  };

  const handleProceedToGrocery = async () => {
    await handleStageChange(Stage.GROCERY_LIST);
  };

  const handleRegeneratePrep = async () => {
    setIsLoading(true);

    await analyticsService.trackMealPlanningEvent('prep_regeneration_started');

    // Clear existing prep tasks and reset animation state
    setNewlyReceivedTasks(new Set());
    setPrepTasks([]);

    try {
      // Use task-by-task streaming generation
      await generateMealPrepPlanStream(
        planHistory.present,
        // onTaskReceived callback
        (taskData: any) => {
          // Create task with proper ID and structure
          const newTask: PrepTask = {
            id: `prep-${Date.now()}-${Math.random()}`,
            day: taskData.day,
            task: taskData.task,
            relatedMeals: Array.isArray(taskData.relatedMeals) ? taskData.relatedMeals :
                         typeof taskData.relatedMeals === 'string' ? [taskData.relatedMeals] : [],
            completed: false
          };

          // Track newly received task for animation
          const taskKey = `${taskData.day}-${newTask.id}`;
          setNewlyReceivedTasks(prev => new Set([...prev, taskKey]));

          // Add task to the list
          setPrepTasks(prev => [...prev, newTask]);

          // Clear the animation state after animation completes
          setTimeout(() => {
            setNewlyReceivedTasks(prev => {
              const updated = new Set(prev);
              updated.delete(taskKey);
              return updated;
            });
          }, 600);
        },
        // onComplete callback
        async () => {
          setIsLoading(false);

          // Mark prep plan as current with the meal plan version
          setInvalidationState(prev => ({
            ...prev,
            prepPlanVersion: prev.currentPlanVersion
          }));

          await analyticsService.trackMealPlanningEvent('prep_regeneration_completed', {
            streaming: true
          });
        },
        // onError callback
        async (error: Error) => {
          setIsLoading(false);

          await analyticsService.trackMealPlanningEvent('prep_regeneration_failed', {
            error_message: error.message,
            streaming: true
          });

          handleApiError(error, showToast, setErrorModal, handleRegeneratePrep);
        }
      );

    } catch (error) {
      setIsLoading(false);

      // Fallback to batch generation if streaming fails
      try {
        const tasks = await generateMealPrepPlan(planHistory.present);
        setPrepTasks(tasks);

        // Mark prep plan as current with the meal plan version
        setInvalidationState(prev => ({
          ...prev,
          prepPlanVersion: prev.currentPlanVersion
        }));

        await analyticsService.trackMealPlanningEvent('prep_regeneration_completed', {
          fallback: true
        });

      } catch (fallbackError) {
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';

        await analyticsService.trackMealPlanningEvent('prep_regeneration_failed', {
          error_message: errorMessage,
          fallback: true
        });

        handleApiError(fallbackError, showToast, setErrorModal, handleRegeneratePrep);
      }
    }
  };

  const handleRegenerateGrocery = async () => {
    setIsLoading(true);

    await analyticsService.trackMealPlanningEvent('grocery_regeneration_started');

    // Clear existing grocery items and reset animation state
    setNewlyReceivedItems(new Set());
    setGroceryItems([]);

    try {
      // Use item-by-item streaming generation
      await generateGroceryListStream(
        planHistory.present,
        prepTasks,
        // onItemReceived callback
        (itemData: any) => {
          // Create item with proper ID and structure
          const newItem: GroceryItem = {
            id: `groc-${Date.now()}-${Math.random()}`,
            name: itemData.name,
            category: itemData.category,
            quantity: itemData.quantity,
            checked: false
          };

          // Track newly received item for animation
          const itemKey = `${itemData.category}-${itemData.name}-${newItem.id}`;
          setNewlyReceivedItems(prev => new Set([...prev, itemKey]));

          // Add item to the list
          setGroceryItems(prev => [...prev, newItem]);

          // Clear the animation state after animation completes
          setTimeout(() => {
            setNewlyReceivedItems(prev => {
              const updated = new Set(prev);
              updated.delete(itemKey);
              return updated;
            });
          }, 600);
        },
        // onComplete callback
        async () => {
          setIsLoading(false);

          // Mark grocery list as current with the meal plan version
          setInvalidationState(prev => ({
            ...prev,
            groceryListVersion: prev.currentPlanVersion
          }));

          await analyticsService.trackMealPlanningEvent('grocery_regeneration_completed', {
            streaming: true
          });
        },
        // onError callback
        async (error: Error) => {
          setIsLoading(false);

          await analyticsService.trackMealPlanningEvent('grocery_regeneration_failed', {
            error_message: error.message,
            streaming: true
          });

          handleApiError(error, showToast, setErrorModal, handleRegenerateGrocery);
        }
      );

    } catch (error) {
      setIsLoading(false);

      // Fallback to batch generation if streaming fails
      try {
        const items = await generateGroceryList(planHistory.present, prepTasks);
        setGroceryItems(items);

        // Mark grocery list as current with the meal plan version
        setInvalidationState(prev => ({
          ...prev,
          groceryListVersion: prev.currentPlanVersion
        }));

        await analyticsService.trackMealPlanningEvent('grocery_regeneration_completed', {
          fallback: true
        });

      } catch (fallbackError) {
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';

        await analyticsService.trackMealPlanningEvent('grocery_regeneration_failed', {
          error_message: errorMessage,
          fallback: true
        });

        handleApiError(fallbackError, showToast, setErrorModal, handleRegenerateGrocery);
      }
    }
  };

  // --- Render ---

  return (
    <div className="flex flex-col h-full bg-zinc-50 font-sans">

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
        title={errorModal.title}
        message={errorModal.message}
        details={errorModal.details}
        onRetry={errorModal.onRetry}
        showSupport={true}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmLabel={confirmationModal.confirmLabel}
        onConfirm={confirmationModal.onConfirm}
        variant="warning"
      />

      {/* Header - Apple-like frosted glass effect */}
      <header className="frosted-header fixed top-0 left-0 right-0 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-6 lg:px-10 pointer-events-none">
        {/* Backdrop blur background */}
        <div className="absolute inset-0 bg-zinc-50/80 backdrop-blur-xl border-b border-zinc-200/50"></div>

        {/* Content layer */}
        <div className="relative w-full flex items-center justify-between">
          {/* Left: Brand - Cleaner, Apple-like */}
          <div className="pointer-events-auto flex items-center gap-2 md:gap-2.5">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md shadow-zinc-900/10">
                  <ChefHat size={16} className="md:w-[18px] md:h-[18px] text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-base md:text-lg font-semibold text-zinc-900 tracking-tight">Meal Planner</h1>
          </div>

          {/* Center: Stepper (Only visible in Planning Mode on larger screens) */}
          <div className="pointer-events-auto transition-opacity duration-300 hidden md:block" style={{ opacity: viewMode === 'planning' ? 1 : 0 }}>
               <StageStepper
                  currentStage={currentStage}
                  setStage={handleStageChange}
                  hasMealPlan={hasPlanGenerated}
               />
          </div>

          {/* Right: Settings */}
          <div className="pointer-events-auto">
              {viewMode === 'planning' ? (
                  <button
                      onClick={() => setViewMode('household')}
                      className="w-9 h-9 md:w-10 md:h-10 bg-white/60 backdrop-blur-sm shadow-sm border border-white/40 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-white/80 transition-all"
                      title="Household Settings"
                  >
                      <Settings size={18} className="md:w-5 md:h-5" />
                  </button>
              ) : hasPlanGenerated && (
                  <button
                      onClick={handleCloseSetup}
                      className="w-9 h-9 md:w-10 md:h-10 bg-white/60 backdrop-blur-sm shadow-sm border border-white/40 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-600 hover:bg-white/80 transition-all"
                      title="Close Settings"
                  >
                      <X size={18} className="md:w-5 md:h-5" />
                  </button>
              )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-16 md:pt-20">

        {viewMode === 'household' && (
           <div>
             <FamilySetup
               family={family}
               preferences={preferences}
               onSave={handleSaveSetup}
               isFirstRun={!hasPlanGenerated}
               isLoading={isLoading}
             />

             <Footer className="mt-12" />
           </div>
        )}

        {viewMode === 'planning' && (
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 pb-40 pt-6 md:pt-8">

             {/* Mobile Stepper with Regenerate Button (visible only on small screens when in planning mode) */}
             {viewMode === 'planning' && (
               <div className="md:hidden mb-6 relative flex justify-center">
                 <StageStepper
                    currentStage={currentStage}
                    setStage={handleStageChange}
                    hasMealPlan={hasPlanGenerated}
                 />
                 <button
                    onClick={handleRegeneratePlan}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-500 transition-colors"
                    title="Regenerate Plan"
                 >
                    <RotateCcw size={14} strokeWidth={1.5} />
                 </button>
               </div>
             )}

             {/* Planning Stage Content */}
             {currentStage === Stage.MEAL_PLANNING && (
                <div className="animate-fade-in">
                   {/* Context Header - Desktop Only */}
                   <div className="hidden md:flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                      <h2 className="text-xl md:text-2xl font-bold text-zinc-900">Meal Plan</h2>
                      <div className="flex gap-3">
                         {planHistory.past.length > 0 && (
                            <button onClick={handleUndo} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-50 transition-colors">
                                <Undo2 size={12} className="md:w-[14px] md:h-[14px]" /> Undo
                            </button>
                         )}
                         <button onClick={handleRegeneratePlan} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-200 transition-colors">
                            <RotateCcw size={12} className="md:w-[14px] md:h-[14px]" /> Regenerate
                         </button>
                      </div>
                   </div>

                   {/* Mobile Header - Apple-style balanced layout */}
                   <div className="md:hidden flex justify-between items-center mb-6 px-4">
                      <div className="flex gap-2">
                         {planHistory.past.length > 0 && (
                            <button onClick={handleUndo} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-full text-xs font-semibold hover:bg-zinc-50 transition-colors">
                                <Undo2 size={12} /> Undo
                            </button>
                         )}
                      </div>
                   </div>

                   {isLoading && planHistory.present === EMPTY_PLAN ? (
                      <div className="h-[50vh] flex flex-col items-center justify-center">
                          <ChefHat className="animate-bounce mb-4 text-zinc-300" size={48} />
                          <p className="text-zinc-400 font-medium">Designing your week...</p>
                      </div>
                   ) : (
                      <MealGrid
                        plan={planHistory.present}
                        previousPlan={lastDiffPlan}
                        isStreaming={isLoading}
                        newlyReceivedCards={newlyReceivedCards}
                      />
                   )}
                </div>
             )}

             {currentStage === Stage.MEAL_PREP && (
               <MealPrepView
                    tasks={prepTasks}
                    mealPlan={planHistory.present}
                    onRegenerate={handleRegeneratePrep}
                    onGenerate={handleRegeneratePrep}
                    onNavigateToMealPlan={() => setCurrentStage(Stage.MEAL_PLANNING)}
                    isLoading={isLoading}
                    hasMealPlan={hasPlanGenerated && planHistory.present.some(day =>
                      Object.values(day.meals).some(meal => meal.name && meal.name.trim() !== '')
                    )}
                    newlyReceivedTasks={newlyReceivedTasks}
                    isInvalidated={isPrepPlanInvalidated()}
               />
             )}

             {currentStage === Stage.GROCERY_LIST && (
                <GroceryListView
                    items={groceryItems}
                    onRegenerate={handleRegenerateGrocery}
                    onGenerate={handleRegenerateGrocery}
                    onNavigateToMealPlan={() => setCurrentStage(Stage.MEAL_PLANNING)}
                    isLoading={isLoading}
                    hasMealPlan={hasPlanGenerated && planHistory.present.some(day =>
                      Object.values(day.meals).some(meal => meal.name && meal.name.trim() !== '')
                    )}
                    newlyReceivedItems={newlyReceivedItems}
                    isInvalidated={isGroceryListInvalidated()}
                />
             )}
             <Footer className="mt-16" />

          </div>
        )}

      </main>

      {/*
        Bottom Floating Controls
      */}
      {viewMode === 'planning' && (
          <div className="fixed bottom-8 w-full px-6 flex items-center justify-between pointer-events-none z-50 max-w-[1600px] mx-auto left-0 right-0">

             {/* Left: Back / Spacer */}
             <div className="pointer-events-auto">
                {currentStage !== Stage.MEAL_PLANNING ? (
                     <button
                        onClick={() => handleStageChange(currentStage - 1)}
                        className="w-12 h-12 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-white/50 text-zinc-600 hover:bg-white hover:text-zinc-900 transition-all active:scale-95"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                ) : <div className="w-12" />}
             </div>

             {/* Center: Primary Stage Action */}
             <div className="pointer-events-auto">
                {currentStage === Stage.MEAL_PLANNING && (
                    <button
                        onClick={() => handleStageChange(Stage.MEAL_PREP)}
                        disabled={isLoading}
                        className="group flex items-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-full shadow-xl shadow-zinc-900/20 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-80 disabled:hover:scale-100 disabled:cursor-wait"
                    >
                        {isLoading ? (
                            <Loader2 size={18} className="animate-spin text-zinc-400" />
                        ) : (
                            <>
                                <span className="font-bold text-sm tracking-wide">Prep Strategy</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                )}
                {currentStage === Stage.MEAL_PREP && (
                    <button
                        onClick={() => handleStageChange(Stage.GROCERY_LIST)}
                        disabled={isLoading}
                        className="group flex items-center gap-3 bg-zinc-900 text-white px-8 py-4 rounded-full shadow-xl shadow-zinc-900/20 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-80 disabled:hover:scale-100 disabled:cursor-wait"
                    >
                         {isLoading ? (
                            <Loader2 size={18} className="animate-spin text-zinc-400" />
                        ) : (
                            <>
                                <span className="font-bold text-sm tracking-wide">Shopping List</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                )}
                {currentStage === Stage.GROCERY_LIST && (
                    <div className="bg-zinc-100/80 backdrop-blur-md text-zinc-400 px-6 py-3 rounded-full font-bold text-xs tracking-widest border border-white/50 cursor-default">
                        ALL DONE
                    </div>
                )}
             </div>

             {/* Right: Assistant Toggle (Black Circle) */}
             <div className="pointer-events-auto">
                <button
                    onClick={() => {
                      const newState = !isChatOpen;
                      setIsChatOpen(newState);

                      // Track chat interactions
                      analyticsService.trackEngagement(newState ? 'chat_opened' : 'chat_closed', {
                        current_stage: currentStage
                      });
                    }}
                    className={`
                        w-14 h-14 flex items-center justify-center rounded-full shadow-xl transition-all duration-300
                        ${isChatOpen
                            ? 'bg-zinc-800 text-white shadow-inner scale-95 ring-4 ring-white/20'
                            : 'bg-zinc-900 text-white hover:scale-110 active:scale-95 shadow-zinc-900/30'}
                    `}
                    title={isChatOpen ? "Minimize Assistant" : "Open Assistant"}
                >
                    <Sparkles size={20} className="fill-current" />
                </button>
             </div>
          </div>
      )}

      {/* Chat Window */}
      {viewMode === 'planning' && (
        <ChatInterface
            messages={messages}
            onSendMessage={handlePlanUpdate}
            isLoading={isLoading}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}

    </div>
  );
};

export default App;
