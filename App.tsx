import React, { useState, useEffect, useRef } from 'react';
import StageStepper from './components/StageStepper';
import MealGrid from './components/MealGrid';
import ChatInterface from './components/ChatInterface';
import MealPrepView from './components/MealPrepView';
import GroceryListView from './components/GroceryListView';
import FamilySetup from './components/FamilySetup';
import ToastContainer from './components/Toast';
import ErrorModal from './components/ErrorModal';
import ConfirmationModal from './components/ConfirmationModal';
import FamilyInviteModal from './components/FamilyInviteModal';
import FamilyMemberList from './components/FamilyMemberList';
import RegenerateButton from './components/RegenerateButton';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';
import { ToastProvider, useToast } from './contexts/ToastContext';
import {
  Stage,
  MealTime,
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
  replaceSingleMeal,
  generateMealPrepPlan,
  generateMealPrepPlanStream,
  generateGroceryList,
  generateGroceryListStream
} from './services/geminiService';
import { analyticsService } from './services/analyticsService';
import { getAnalyticsConfig, validateAnalyticsConfig } from './config/analytics';
import { Undo2, Sparkles, ChefHat, ArrowLeft, ArrowRight, X, RotateCcw, Loader2, UserPlus } from 'lucide-react';
import UserMenu from './components/UserMenu';
import UserProfile from './components/UserProfile';
import PlanLockToggle from './components/PlanLockToggle';

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

import { useAuth } from './contexts/AuthContext';
import { dataService } from './services/dataService';
import { apiService } from './services/apiService';
import { usePersistedState } from './hooks/usePersistedState';
import { useFamilyPlan } from './hooks/useFamilyPlan';
import { validateFamily, validatePreferences, validatePlanHistory } from './utils/localStorage';

// Stable default values to prevent infinite re-renders
const DEFAULT_PLAN_HISTORY = {
  past: [],
  present: EMPTY_PLAN,
  future: []
};

const DEFAULT_INVALIDATION_STATE = {
  currentPlanVersion: 'initial'
};

const App: React.FC = () => {
  const { showToast } = useToast();
  const { user, signOut } = useAuth();

  // Initialize data service when user changes
  React.useEffect(() => {
    dataService.setUserId(user?.id || null);

    // Migrate from localStorage when user first signs in
    if (user?.id) {
      dataService.migrateFromLocalStorage()
        .then(() => {
          console.log('Data migration check completed');
        })
        .catch(error => {
          console.error('Migration failed:', error);
          showToast('Failed to sync your data. Please refresh the page.', 'error');
        });
    }
  }, [user?.id, showToast]);

  // --- Initialization with Persistence ---

  const [family, setFamily, familyLoading] = usePersistedState(
    'fmp_family',
    'family',
    INITIAL_FAMILY,
    validateFamily
  );

  const [preferences, setPreferences, preferencesLoading] = usePersistedState(
    'fmp_preferences',
    'preferences',
    INITIAL_PREFERENCES,
    validatePreferences
  );

  const [hasPlanGenerated, setHasPlanGenerated, hasPlanLoading] = usePersistedState(
    'fmp_has_plan',
    'has_plan',
    false
  );

  const [currentStage, setCurrentStage, stageLoading] = usePersistedState(
    'fmp_current_stage',
    'current_stage',
    Stage.MEAL_PLANNING
  );

  const [planHistory, setPlanHistory, planHistoryLoading] = usePersistedState(
    'fmp_plan_history',
    'meal_plan',
    DEFAULT_PLAN_HISTORY,
    validatePlanHistory
  );

  const [prepTasks, setPrepTasks, prepTasksLoading] = usePersistedState(
    'fmp_prep_tasks',
    'prep_tasks',
    []
  );

  const [groceryItems, setGroceryItems, groceryItemsLoading] = usePersistedState(
    'fmp_grocery_items',
    'grocery_items',
    []
  );

  const [invalidationState, setInvalidationState, invalidationLoading] = usePersistedState(
    'fmp_invalidation_state',
    'invalidation_state',
    DEFAULT_INVALIDATION_STATE
  );

  // Active family plan ID - persisted so family sync works across page refreshes
  const [activePlanId, setActivePlanId, activePlanIdLoading] = usePersistedState<string | null>(
    'fmp_active_plan_id',
    'active_plan_id',
    null
  );

  // Check if any data is still loading
  const isDataLoading = familyLoading || preferencesLoading || hasPlanLoading ||
                       stageLoading || planHistoryLoading || prepTasksLoading ||
                       groceryItemsLoading || invalidationLoading || activePlanIdLoading;

  // viewMode is set once data finishes loading — never flips during initial mount
  const [viewMode, setViewMode] = useState<ViewMode | null>(null);

  // Runtime UI state (not persisted)
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastDiffPlan, setLastDiffPlan] = useState<WeekPlan | undefined>(undefined);
  const [newlyReceivedCards, setNewlyReceivedCards] = useState<Set<string>>(new Set());
  const [animatedCards, setAnimatedCards] = useState<Set<string>>(new Set()); // Track cards that have already animated
  const [replacingMeals, setReplacingMeals] = useState<Set<string>>(new Set()); // Track meals being replaced
  const [newlyReceivedTasks, setNewlyReceivedTasks] = useState<Set<string>>(new Set());
  const [newlyReceivedItems, setNewlyReceivedItems] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Background processing states - for transparent data generation
  const [isPrepGenerating, setIsPrepGenerating] = useState(false);
  const [isGroceryGenerating, setIsGroceryGenerating] = useState(false);
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

  // Family invite state
  const [familyInviteModalOpen, setFamilyInviteModalOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // Plan lock state - synced via family plan
  const [isPlanLocked, setIsPlanLocked] = useState(false);

  // Track if we're applying a remote update to prevent feedback loop
  const isApplyingRemoteUpdateRef = useRef(false);

  // Track if we're toggling the lock to prevent sync effect from interfering
  const isTogglingLockRef = useRef(false);

  // Handler for remote updates from collaborators
  const handleRemoteUpdate = React.useCallback((data: {
    plan_data: any;
    family_data: any;
    preferences_data: any;
    prep_tasks: any[];
    grocery_items: any[];
    invalidation_state: any;
    has_plan: string;
    current_stage: string;
    is_locked?: boolean;
  }) => {
    console.log('[App] Received remote update from collaborator');

    // Set flag to prevent sync loop
    isApplyingRemoteUpdateRef.current = true;

    // Update all state from remote - skip save since this is from the server
    setPlanHistory({
      past: [],
      present: data.plan_data,
      future: []
    }, true);

    setFamily(data.family_data || INITIAL_FAMILY, true);
    setPreferences(data.preferences_data || INITIAL_PREFERENCES, true);
    setPrepTasks(data.prep_tasks || [], true);
    setGroceryItems(data.grocery_items || [], true);
    setInvalidationState(data.invalidation_state || DEFAULT_INVALIDATION_STATE, true);
    setHasPlanGenerated(data.has_plan === 'true', true);
    setCurrentStage(parseInt(data.current_stage) || Stage.MEAL_PLANNING, true);
    setIsPlanLocked(data.is_locked ?? false);

    // Reset flag after a short delay to allow all state updates to complete
    setTimeout(() => {
      isApplyingRemoteUpdateRef.current = false;
    }, 100);
  }, [setPlanHistory, setFamily, setPreferences, setPrepTasks, setGroceryItems, setInvalidationState, setHasPlanGenerated, setCurrentStage]);

  // Family plan real-time sync hook
  const {
    saveToFamilyPlan,
    flushSync,
    isSyncing: isFamilySyncing
  } = useFamilyPlan(activePlanId, {
    onRemoteUpdate: handleRemoteUpdate,
    userId: user?.id
  });

  // Effect to sync all changes to family plan
  React.useEffect(() => {
    // Don't sync if no active plan, still loading, applying a remote update, or toggling lock
    if (!activePlanId || isDataLoading || isLoading || isApplyingRemoteUpdateRef.current || isTogglingLockRef.current) {
      return;
    }

    // If plan is locked, don't sync any changes (lock state is handled by handleTogglePlanLock)
    if (isPlanLocked) {
      return;
    }

    // Sync current state to family plan (including lock state)
    saveToFamilyPlan({
      plan_data: planHistory.present,
      family_data: family,
      preferences_data: preferences,
      prep_tasks: prepTasks,
      grocery_items: groceryItems,
      invalidation_state: invalidationState,
      has_plan: hasPlanGenerated ? 'true' : 'false',
      current_stage: currentStage.toString(),
      is_locked: isPlanLocked
    });
  }, [
    activePlanId,
    planHistory.present,
    family,
    preferences,
    prepTasks,
    groceryItems,
    invalidationState,
    hasPlanGenerated,
    currentStage,
    isDataLoading,
    isLoading,
    isPlanLocked,
    saveToFamilyPlan
  ]);

  // Flush pending family plan saves on tab close / navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushSync();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushSync]);

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
  // Note: Persistence is now handled by usePersistedState hook

  // Load family plan data when activePlanId is set on startup
  // This ensures users in a family always see the shared plan data
  const [familyPlanLoaded, setFamilyPlanLoaded] = useState(false);

  useEffect(() => {
    const loadFamilyPlanData = async () => {
      // Wait for initial data to load and ensure we have a valid activePlanId
      if (isDataLoading || !activePlanId || !user || familyPlanLoaded) return;

      try {
        console.log('[App] Loading family plan data for plan:', activePlanId);
        const plan = await apiService.getFamilyPlan(activePlanId);

        if (plan) {
          // Update state with family plan data, skip save to avoid circular updates
          setPlanHistory({
            past: [],
            present: plan.plan_data,
            future: []
          }, true); // Skip save - data is already in collaborative_plans

          setFamily(plan.family_data || INITIAL_FAMILY, true);
          setPreferences(plan.preferences_data || INITIAL_PREFERENCES, true);
          setPrepTasks(plan.prep_tasks || [], true);
          setGroceryItems(plan.grocery_items || [], true);
          setInvalidationState(plan.invalidation_state || DEFAULT_INVALIDATION_STATE, true);
          setHasPlanGenerated(plan.has_plan === 'true', true);
          setCurrentStage(parseInt(plan.current_stage) || Stage.MEAL_PLANNING, true);
          setIsPlanLocked(plan.is_locked ?? false);

          // Load family members to display in header
          if (plan.members) {
            setFamilyMembers(plan.members);
          }

          setFamilyPlanLoaded(true);
          console.log('[App] Family plan data loaded successfully');
        }
      } catch (error) {
        console.error('[App] Failed to load family plan:', error);
        // If plan doesn't exist anymore, clear the activePlanId
        if ((error as any)?.status === 404) {
          console.log('[App] Family plan not found, clearing activePlanId');
          setActivePlanId(null);
        }
        setFamilyPlanLoaded(true); // Mark as loaded even on error to prevent retry loop
      }
    };

    loadFamilyPlanData();
  }, [isDataLoading, activePlanId, user, familyPlanLoaded]);

  // Reset familyPlanLoaded when activePlanId changes (e.g., user joins a new family)
  useEffect(() => {
    setFamilyPlanLoaded(false);
  }, [activePlanId]);

  // Set viewMode once when data finishes loading for the first time
  // Subsequent changes to hasPlanGenerated are handled by explicit setViewMode calls
  useEffect(() => {
    if (!isDataLoading && viewMode === null) {
      setViewMode(hasPlanGenerated ? 'planning' : 'household');
    }
  }, [isDataLoading, hasPlanGenerated, viewMode]);


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

  // Background generation functions - non-blocking, transparent to user
  const generatePrepPlanInBackground = async (mealPlan: WeekPlan) => {
    // Don't generate if already generating or if prep plan is current
    if (isPrepGenerating || (prepTasks.length > 0 && !isPrepPlanInvalidated())) {
      return;
    }

    console.log('[Background] Starting prep plan generation...');
    setIsPrepGenerating(true);

    // Clear previously received tasks and set initial empty state
    setNewlyReceivedTasks(new Set());
    setPrepTasks([], true); // skipSave - don't persist empty array during init

    // Use a ref to track tasks as they're being built during streaming
    const streamingTasksRef = { current: [] as PrepTask[] };

    try {
      await generateMealPrepPlanStream(
        mealPlan,
        // onTaskReceived callback
        (taskData: any) => {
          const newTask: PrepTask = {
            id: `prep-${Date.now()}-${Math.random()}`,
            day: taskData.day,
            task: taskData.task,
            relatedMeals: Array.isArray(taskData.relatedMeals) ? taskData.relatedMeals :
                         typeof taskData.relatedMeals === 'string' ? [taskData.relatedMeals] : [],
            completed: false
          };

          const taskKey = `${taskData.day}-${newTask.id}`;
          setNewlyReceivedTasks(prev => new Set([...prev, taskKey]));

          streamingTasksRef.current.push(newTask);
          setPrepTasks([...streamingTasksRef.current], true);

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
          setIsPrepGenerating(false);
          await dataService.saveData('prep_tasks', streamingTasksRef.current);
          console.log('[Background] ✓ Prep plan generation completed');

          setInvalidationState(prev => ({
            ...prev,
            prepPlanVersion: prev.currentPlanVersion
          }));

          await analyticsService.trackMealPlanningEvent('prep_generation_completed', {
            streaming: true,
            background: true
          });

          // Automatically start generating grocery list in background
          generateGroceryListInBackground(mealPlan, streamingTasksRef.current);
        },
        // onError callback
        async (error: Error) => {
          setIsPrepGenerating(false);
          console.warn('[Background] Prep plan generation failed:', error.message);

          await analyticsService.trackMealPlanningEvent('prep_generation_failed', {
            error_message: error.message,
            streaming: true,
            background: true
          });

          // Silently fail - user can manually regenerate if needed
        }
      );
    } catch (error) {
      setIsPrepGenerating(false);
      console.warn('[Background] Prep plan generation error:', error);
    }
  };

  const generateGroceryListInBackground = async (mealPlan: WeekPlan, tasks: PrepTask[]) => {
    // Don't generate if already generating or if grocery list is current
    if (isGroceryGenerating || (groceryItems.length > 0 && !isGroceryListInvalidated())) {
      return;
    }

    console.log('[Background] Starting grocery list generation...');
    setIsGroceryGenerating(true);

    // Clear previously received items and set initial empty state
    setNewlyReceivedItems(new Set());
    setGroceryItems([], true);

    const streamingItemsRef = { current: [] as GroceryItem[] };

    try {
      await generateGroceryListStream(
        mealPlan,
        tasks,
        // onItemReceived callback
        (itemData: any) => {
          const newItem: GroceryItem = {
            id: `groc-${Date.now()}-${Math.random()}`,
            name: itemData.name,
            category: itemData.category,
            quantity: itemData.quantity,
            checked: false,
            relatedMeals: itemData.relatedMeals
          };

          const itemKey = `${itemData.category}-${itemData.name}-${newItem.id}`;
          setNewlyReceivedItems(prev => new Set([...prev, itemKey]));

          streamingItemsRef.current.push(newItem);
          setGroceryItems([...streamingItemsRef.current], true);

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
          setIsGroceryGenerating(false);
          await dataService.saveData('grocery_items', streamingItemsRef.current);
          console.log('[Background] ✓ Grocery list generation completed');

          setInvalidationState(prev => ({
            ...prev,
            groceryListVersion: prev.currentPlanVersion
          }));

          await analyticsService.trackMealPlanningEvent('grocery_generation_completed', {
            streaming: true,
            background: true
          });
        },
        // onError callback
        async (error: Error) => {
          setIsGroceryGenerating(false);
          console.warn('[Background] Grocery list generation failed:', error.message);

          await analyticsService.trackMealPlanningEvent('grocery_generation_failed', {
            error_message: error.message,
            streaming: true,
            background: true
          });

          // Silently fail - user can manually regenerate if needed
        }
      );
    } catch (error) {
      setIsGroceryGenerating(false);
      console.warn('[Background] Grocery list generation error:', error);
    }
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

    // Use a ref to track the plan as it's being built during streaming
    // IMPORTANT: Create a deep copy so mutations don't affect the initial state
    const streamingPlanRef = { current: JSON.parse(JSON.stringify(emptyPlan)) };

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

    // Set empty plan WITHOUT saving (skipSave=true) to avoid persisting skeleton
    setPlanHistory(
      {
        past: [],
        present: emptyPlan,
        future: []
      },
      true // skipSave - don't persist the empty skeleton plan
    );
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

          // Update plan with new meal data - skip save during streaming
          // Find the day index in the ref's current plan
          const dayIndex = streamingPlanRef.current.findIndex(day => day.day === mealData.day);
          if (dayIndex !== -1) {
            // Update the specific meal in the ref
            streamingPlanRef.current[dayIndex] = {
              ...streamingPlanRef.current[dayIndex],
              meals: {
                ...streamingPlanRef.current[dayIndex].meals,
                [mealData.mealType]: mealData.meal
              }
            };
          }

          // Update the UI state with the ref's current plan
          setPlanHistory({
            past: [],
            present: [...streamingPlanRef.current], // Create a new array for React to detect change
            future: []
          }, true); // skipSave=true during streaming
        },
        // onComplete callback
        async () => {
          setIsLoading(false);

          // Save the completed plan from the ref (streaming is done)
          const completedPlan = {
            past: [],
            present: streamingPlanRef.current,
            future: []
          };

          await dataService.saveData('meal_plan', completedPlan);
          console.log('✓ Saved completed meal plan after streaming');

          // Track successful plan generation
          await analyticsService.trackMealPlanningEvent('plan_generation_completed', {
            family_size: members.length,
            streaming: true
          });

          // Automatically start generating prep plan in background
          generatePrepPlanInBackground(streamingPlanRef.current);
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
    if (isPlanLocked) {
      showToast('Plan is locked. Unlock it to make changes.', 'warning');
      return;
    }
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
        setPrepTasks([], true); // skipSave during reset
        setGroceryItems([], true); // skipSave during reset
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

  // --- Plan Lock Toggle ---
  const handleTogglePlanLock = async () => {
    const newLockState = !isPlanLocked;

    // Set flag to prevent sync effect from interfering
    isTogglingLockRef.current = true;

    // Optimistic update
    setIsPlanLocked(newLockState);

    if (activePlanId) {
      try {
        await apiService.updateFamilyPlan(activePlanId, { is_locked: newLockState });
      } catch (error) {
        // Revert on failure
        setIsPlanLocked(!newLockState);
        console.error('Failed to toggle plan lock:', error);
        showToast('Failed to update lock state', 'error');
      } finally {
        // Reset flag after a short delay to allow state to settle
        setTimeout(() => {
          isTogglingLockRef.current = false;
        }, 100);
      }
    } else {
      // Reset flag
      setTimeout(() => {
        isTogglingLockRef.current = false;
      }, 100);
    }
  };

  // --- Family Invite Handlers ---
  const handleInviteToFamily = async () => {
    if (activePlanId) {
      // Already has a family plan — fetch the invite code and members if we don't have them yet
      try {
        const plan = await apiService.getFamilyPlan(activePlanId);
        if (plan?.invite_code && !inviteUrl) {
          setInviteUrl(`${window.location.origin}/?invite=${plan.invite_code}`);
        }
        if (plan?.members) {
          setFamilyMembers(plan.members);
        }
      } catch (error) {
        console.error('Failed to fetch plan details:', error);
      }
      setFamilyInviteModalOpen(true);
      return;
    }

    setIsCreatingInvite(true);
    try {
      const response = await apiService.createFamilyPlan({
        plan_data: planHistory.present,
        family_data: family,
        preferences_data: preferences,
        prep_tasks: prepTasks,
        grocery_items: groceryItems,
        invalidation_state: invalidationState,
        has_plan: hasPlanGenerated ? 'true' : 'false',
        current_stage: currentStage.toString(),
        title: `${family[0]?.name || 'Family'}'s Meal Plan`
      });

      setActivePlanId(response.id);
      const url = `${window.location.origin}/?invite=${response.invite_code}`;
      setInviteUrl(url);
      if (response.members) {
        setFamilyMembers(response.members);
      }
      setFamilyInviteModalOpen(true);

      await analyticsService.trackEngagement('family_invite_created', {
        plan_id: response.id,
        invite_code: response.invite_code
      });

      showToast('Invite link created!', 'success');
    } catch (error) {
      console.error('Failed to create invite link:', error);
      handleApiError(error, showToast, setErrorModal, handleInviteToFamily);
    } finally {
      setIsCreatingInvite(false);
    }
  };
  const handleRemoveFamilyMember = async (memberUserId: string) => {
    if (!activePlanId) return;

    const memberToRemove = familyMembers.find(m => m.user_id === memberUserId);
    const memberName = memberToRemove?.user?.name || memberToRemove?.user?.email || 'this member';

    // Show confirmation modal
    setConfirmationModal({
      isOpen: true,
      title: 'Remove Family Member',
      message: `Are you sure you want to remove ${memberName} from your family? They will lose access to the shared meal plan.`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setConfirmationModal({ ...confirmationModal, isOpen: false });

        try {
          await apiService.removeFamilyMember(activePlanId, memberUserId);

          // Update local state
          setFamilyMembers(prev => prev.filter(m => m.user_id !== memberUserId));

          showToast('Member removed from family', 'success');

          await analyticsService.trackEngagement('family_member_removed', {
            plan_id: activePlanId,
            removed_user_id: memberUserId
          });
        } catch (error) {
          console.error('Failed to remove family member:', error);
          handleApiError(error, showToast, setErrorModal, () => handleRemoveFamilyMember(memberUserId));
        }
      }
    });
  };



  // --- URL Parameter Handling for Family Invites ---
  useEffect(() => {
    const handleFamilyInviteAccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('invite');

      if (inviteCode && user) {
        try {
          showToast('Loading family plan...', 'info');

          // Get the plan details
          const plan = await apiService.getPlanByInviteCode(inviteCode);

          // Check if already a member
          const isMember = plan.members?.some((m: any) => m.user_id === user.id);

          if (!isMember) {
            // Join the family
            await apiService.joinFamily(inviteCode);
            showToast('Joined family plan!', 'success');
          } else {
            showToast('Loaded family plan', 'success');
          }

          // Load the plan data AND persist it to user's data
          // This makes the family plan "become" the user's plan
          // Note: We DON'T skip save here - we want to persist the family data
          setPlanHistory({
            past: [],
            present: plan.plan_data,
            future: []
          }); // Persist to user's data

          setFamily(plan.family_data || INITIAL_FAMILY); // Persist
          setPreferences(plan.preferences_data || INITIAL_PREFERENCES); // Persist
          setPrepTasks(plan.prep_tasks || []); // Persist
          setGroceryItems(plan.grocery_items || []); // Persist
          setInvalidationState(plan.invalidation_state || DEFAULT_INVALIDATION_STATE); // Persist
          setHasPlanGenerated(plan.has_plan === 'true'); // Persist
          setCurrentStage(parseInt(plan.current_stage) || Stage.MEAL_PLANNING); // Persist
          setIsPlanLocked(plan.is_locked ?? false);
          setActivePlanId(plan.id);
          setViewMode('planning');

          // Load family members to display in header
          if (plan.members) {
            setFamilyMembers(plan.members);
          }

          // Set invite URL for the modal
          const url = `${window.location.origin}/?invite=${inviteCode}`;
          setInviteUrl(url);

          // Clear the URL parameter
          window.history.replaceState({}, '', window.location.pathname);

          await analyticsService.trackEngagement('family_joined', {
            plan_id: plan.id,
            invite_code: inviteCode
          });

        } catch (error) {
          console.error('Failed to load family plan:', error);
          showToast('Failed to load family plan', 'error');
          // Clear the URL parameter even on error
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    if (!isDataLoading && user) {
      handleFamilyInviteAccess();
    }
  }, [isDataLoading, user]);

  const handlePlanUpdate = async (userMessage: string) => {
    if (isPlanLocked) {
      showToast('Plan is locked. Unlock it to make changes.', 'warning');
      return;
    }
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

      // Note: Collaborative plan sync is handled automatically by useCollaborativePlan hook

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

  const handleReplaceMeal = async (day: string, mealType: MealTime) => {
    if (isPlanLocked) {
      showToast('Plan is locked. Unlock it to make changes.', 'warning');
      return;
    }
    const cardKey = `${day}-${mealType}`;

    // Mark this meal as being replaced
    setReplacingMeals(prev => new Set([...prev, cardKey]));

    // Track meal replacement start
    await analyticsService.trackLLMEvent('meal_replacement_requested', {
      day,
      meal_type: mealType
    });

    try {
      // Get the current meal
      const dayIndex = planHistory.present.findIndex(d => d.day === day);
      if (dayIndex === -1) {
        throw new Error('Day not found in plan');
      }

      const currentMeal = planHistory.present[dayIndex].meals[mealType];

      // Call the API to get a replacement meal
      const newMeal = await replaceSingleMeal(
        day,
        mealType,
        currentMeal,
        planHistory.present,
        family,
        preferences
      );

      // Store previous plan for diff highlighting
      setLastDiffPlan(planHistory.present);

      // Create updated plan with the new meal
      const updatedPlan = JSON.parse(JSON.stringify(planHistory.present)); // Deep copy
      updatedPlan[dayIndex].meals[mealType] = newMeal;

      // Generate new plan version to invalidate downstream data
      const newPlanVersion = generatePlanVersion();
      setInvalidationState(prev => ({
        ...prev,
        currentPlanVersion: newPlanVersion
      }));

      // Update plan history
      setPlanHistory(prev => ({
        past: [...prev.past, prev.present],
        present: updatedPlan,
        future: []
      }));

      // Note: Collaborative plan sync is handled automatically by useCollaborativePlan hook

      // Trigger animation for the replaced card
      setNewlyReceivedCards(prev => new Set([...prev, cardKey]));
      setAnimatedCards(prev => new Set([...prev, cardKey]));

      // Clear animation state after animation completes
      setTimeout(() => {
        setNewlyReceivedCards(prev => {
          const updated = new Set(prev);
          updated.delete(cardKey);
          return updated;
        });
      }, 600);

      // Track successful replacement
      await analyticsService.trackLLMEvent('meal_replacement_completed', {
        day,
        meal_type: mealType,
        new_meal: newMeal.name
      });

      showToast(`Replaced ${mealType} with ${newMeal.name}`, 'success');

      // Automatically regenerate prep and grocery in background since meal plan changed
      generatePrepPlanInBackground(updatedPlan);

    } catch (error) {
      console.error('Error replacing meal:', error);

      // Track replacement failure
      await analyticsService.trackLLMEvent('meal_replacement_failed', {
        day,
        meal_type: mealType,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

      const errorCode = (error as any)?.code;

      if (errorCode === 'RATE_LIMIT_EXCEEDED' || errorCode === 'SERVICE_UNAVAILABLE') {
        handleApiError(error, showToast, setErrorModal, () => handleReplaceMeal(day, mealType));
      } else {
        showToast('Failed to replace meal. Please try again.', 'error');
      }
    } finally {
      // Remove from replacing set
      setReplacingMeals(prev => {
        const updated = new Set(prev);
        updated.delete(cardKey);
        return updated;
      });
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
  };

  // Helper functions for regenerating prep and grocery lists
  const handleProceedToPrep = async () => {
    await handleStageChange(Stage.MEAL_PREP);
  };

  const handleProceedToGrocery = async () => {
    await handleStageChange(Stage.GROCERY_LIST);
  };

  const handleRegeneratePrep = async () => {
    if (isPlanLocked) {
      showToast('Plan is locked. Unlock it to make changes.', 'warning');
      return;
    }
    setIsLoading(true);

    await analyticsService.trackMealPlanningEvent('prep_regeneration_started');

    // Clear existing prep tasks and reset animation state
    setNewlyReceivedTasks(new Set());
    setPrepTasks([], true); // skipSave during init

    // Use a ref to track tasks as they're being built during streaming
    const streamingTasksRef = { current: [] as PrepTask[] };

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

          // Add task to the ref
          streamingTasksRef.current.push(newTask);

          // Update UI state with the ref's current tasks
          setPrepTasks([...streamingTasksRef.current], true); // skipSave during streaming

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

          // Save the completed prep tasks from the ref
          await dataService.saveData('prep_tasks', streamingTasksRef.current);
          console.log('✓ Saved completed prep tasks after streaming');

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
    if (isPlanLocked) {
      showToast('Plan is locked. Unlock it to make changes.', 'warning');
      return;
    }
    setIsLoading(true);

    await analyticsService.trackMealPlanningEvent('grocery_regeneration_started');

    // Clear existing grocery items and reset animation state
    setNewlyReceivedItems(new Set());
    setGroceryItems([], true); // skipSave during init

    // Use a ref to track items as they're being built during streaming
    const streamingItemsRef = { current: [] as GroceryItem[] };

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
            checked: false,
            relatedMeals: itemData.relatedMeals // Include related meals from backend
          };

          // Track newly received item for animation
          const itemKey = `${itemData.category}-${itemData.name}-${newItem.id}`;
          setNewlyReceivedItems(prev => new Set([...prev, itemKey]));

          // Add item to the ref
          streamingItemsRef.current.push(newItem);

          // Update UI state with the ref's current items
          setGroceryItems([...streamingItemsRef.current], true); // skipSave during streaming

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

          // Save the completed grocery items from the ref
          await dataService.saveData('grocery_items', streamingItemsRef.current);
          console.log('✓ Saved completed grocery items after streaming');

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

  // Show loading state while data is being loaded or viewMode hasn't settled
  if (isDataLoading || viewMode === null) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col h-screen font-sans" style={{ backgroundColor: 'var(--surface-bg)', color: 'var(--text-primary)' }}>

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

      {/* Family Invite Modal */}
      <FamilyInviteModal
        isOpen={familyInviteModalOpen}
        onClose={() => setFamilyInviteModalOpen(false)}
        inviteUrl={inviteUrl}
        onCreateInvite={handleInviteToFamily}
        isCreatingInvite={isCreatingInvite}
        members={familyMembers}
        currentUserId={user?.id}
        onRemoveMember={handleRemoveFamilyMember}
        canRemoveMembers={familyMembers.some(m => m.user_id === user?.id && m.role === 'owner')}
      />

      {/* Header - Apple-like frosted glass effect */}
      <header className="frosted-header fixed top-0 left-0 right-0 z-50 h-16 md:h-20 pointer-events-none">
        {/* Backdrop blur background */}
        <div className="absolute inset-0 backdrop-blur-xl border-b shadow-sm" style={{ backgroundColor: 'var(--surface-glass)', borderColor: 'var(--border-subtle)' }}></div>

        {/* Content layer - same max-width as main content */}
        <div className="relative h-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 flex items-center justify-between">
          {/* Left: Brand - Cleaner, Apple-like */}
          <div className="pointer-events-auto flex items-center gap-2 md:gap-2.5">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: 'var(--text-primary)' }}>
                  <ChefHat size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} style={{ color: 'var(--text-inverted)' }} />
              </div>
              <h1 className="text-base md:text-lg font-semibold text-primary-900 tracking-tight">Meal Planner</h1>
          </div>

          {/* Center: Stepper (Only visible in Planning Mode on larger screens) */}
          <div className="pointer-events-auto transition-opacity duration-300 hidden md:block" style={{ opacity: viewMode === 'planning' ? 1 : 0 }}>
               <StageStepper
                  currentStage={currentStage}
                  setStage={handleStageChange}
                  hasMealPlan={hasPlanGenerated}
               />
          </div>

          {/* Right: App Actions + User Menu */}
          <div className="pointer-events-auto flex items-center gap-2">
              {/* Plan Lock Toggle - visible on all screen sizes when plan exists */}
              {viewMode === 'planning' && hasPlanGenerated && (
                <PlanLockToggle
                  isLocked={isPlanLocked}
                  onToggle={handleTogglePlanLock}
                />
              )}

              {/* Invite (app-level action) */}
              {viewMode === 'planning' && hasPlanGenerated && (
                <div className="hidden md:flex items-center gap-2">
                    <button
                       onClick={handleInviteToFamily}
                       disabled={isCreatingInvite}
                       className="btn-glass flex items-center gap-2 px-3 py-1.5 text-primary-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       {familyMembers.length > 0 ? (
                         <>
                           <FamilyMemberList members={familyMembers} compact maxDisplay={3} />
                           <span className="ml-1">{familyMembers.length}</span>
                         </>
                       ) : (
                         <>
                           <UserPlus size={14} />
                           {isCreatingInvite ? 'Creating...' : 'Invite'}
                         </>
                       )}
                    </button>
                </div>
              )}

              {/* User Menu or Close Button */}
              {user && (
                  viewMode === 'household' && hasPlanGenerated ? (
                      <button
                          onClick={handleCloseSetup}
                          className="btn-icon w-9 h-9 md:w-10 md:h-10"
                          title="Close Settings"
                      >
                          <X size={18} className="md:w-5 md:h-5" />
                      </button>
                  ) : (
                      <UserMenu
                        onOpenSettings={() => setViewMode('household')}
                      />
                  )
              )}
          </div>
        </div>
      </header>

      {/* Main Content Area - Each view gets its own scroll container */}
      <main className="flex-1 pt-16 md:pt-20 overflow-hidden">

        {viewMode === 'household' && (
           <div className="h-full overflow-y-auto no-scrollbar">
             <FamilySetup
               family={family}
               preferences={preferences}
               onSave={handleSaveSetup}
               isFirstRun={!hasPlanGenerated}
               isLoading={isLoading}
               activePlanId={activePlanId}
             />

             <Footer className="mt-12" />
           </div>
        )}

        {viewMode === 'planning' && (
          <>
             {/* Planning Stage Content - Each stage gets its own scroll container */}
             {currentStage === Stage.MEAL_PLANNING && (
                <div className="h-full overflow-y-auto no-scrollbar" ref={(el) => {
                  // Observe the MEALS tab sticky header height and set CSS custom property
                  if (!el) return;
                  const stickyHeader = el.querySelector('[data-sticky-header="meals"]') as HTMLElement;
                  if (!stickyHeader) return;
                  const updateHeight = () => {
                    const h = stickyHeader.offsetHeight;
                    el.style.setProperty('--tab-header-height', `${h}px`);
                  };
                  updateHeight();
                  const ro = new ResizeObserver(updateHeight);
                  ro.observe(stickyHeader);
                  // Store cleanup on the element
                  (el as any).__mealsRO?.disconnect();
                  (el as any).__mealsRO = ro;
                }}>
                  <div key={`stage-${Stage.MEAL_PLANNING}`} className="stage-enter max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 pb-40 pt-6 md:pt-8">
                    {/* Mobile Stepper with Action Buttons (visible only on small screens) - Sticky */}
                    <div data-sticky-header="meals" className="md:hidden mb-3 sticky top-0 z-20 pt-2 pb-3 -mx-4 px-4 backdrop-blur-xl" style={{ backgroundColor: 'var(--surface-bg)' }}>
                      <div className="flex justify-center mb-2">
                        <StageStepper
                           currentStage={currentStage}
                           setStage={handleStageChange}
                           hasMealPlan={hasPlanGenerated}
                        />
                      </div>
                      {hasPlanGenerated && (
                        <div className="flex justify-between items-center gap-2">
                          {/* Left: Undo button */}
                          {planHistory.past.length > 0 && !isPlanLocked ? (
                            <button onClick={handleUndo} className="btn-glass flex items-center gap-1.5 px-3 py-1.5 text-primary-600 text-xs font-semibold">
                                <Undo2 size={12} /> Undo
                            </button>
                          ) : (
                            <div />
                          )}

                          {/* Right: Invite and Regenerate buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleInviteToFamily}
                              disabled={isCreatingInvite}
                              className="btn-icon-sm"
                              title="Invite to Family"
                            >
                              {isCreatingInvite ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : familyMembers.length > 0 ? (
                                <FamilyMemberList members={familyMembers} compact maxDisplay={1} />
                              ) : (
                                <UserPlus size={16} />
                              )}
                            </button>
                            {!isPlanLocked && (
                              <RegenerateButton onRegenerate={handleRegeneratePlan} isLoading={isLoading} showText={false} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="animate-fade-in">

                      {/* Page-level actions - Desktop */}
                      <div className="hidden md:flex justify-end items-center gap-3 mb-4">
                            {planHistory.past.length > 0 && !isPlanLocked && (
                               <button onClick={handleUndo} className="btn-glass flex items-center gap-2 px-3 py-1.5 text-primary-600 text-sm font-semibold">
                                   <Undo2 size={14} /> Undo
                               </button>
                            )}
                            {hasPlanGenerated && !isPlanLocked && (
                              <RegenerateButton onRegenerate={handleRegeneratePlan} isLoading={isLoading} showText={true} />
                            )}
                      </div>

                      {isLoading && planHistory.present === EMPTY_PLAN ? (
                         <div className="h-[50vh] flex flex-col items-center justify-center">
                             <ChefHat className="animate-bounce mb-4 text-primary-300" size={48} />
                             <p className="text-primary-400 font-medium">Designing your week...</p>
                         </div>
                      ) : (
                         <MealGrid
                           plan={planHistory.present}
                           previousPlan={lastDiffPlan}
                           isStreaming={isLoading}
                           newlyReceivedCards={newlyReceivedCards}
                           onReplaceMeal={handleReplaceMeal}
                           replacingMeals={replacingMeals}
                           isLocked={isPlanLocked}
                         />
                      )}
                    </div>
                    <Footer className="mt-16" />
                  </div>
                </div>
             )}

             {currentStage === Stage.MEAL_PREP && (
                <div className="h-full overflow-y-auto no-scrollbar" ref={(el) => {
                  if (!el) return;
                  const stickyHeader = el.querySelector('[data-sticky-header="prep"]') as HTMLElement;
                  if (!stickyHeader) return;
                  const updateHeights = () => {
                    const h = stickyHeader.offsetHeight;
                    el.style.setProperty('--tab-header-height', `${h}px`);
                    // Also measure progress bar for section headers that stack below it
                    const progressBar = el.querySelector('[data-sticky-progress="prep"]') as HTMLElement;
                    if (progressBar) {
                      const ph = progressBar.offsetHeight;
                      el.style.setProperty('--sticky-content-top', `${h + ph}px`);
                    } else {
                      el.style.setProperty('--sticky-content-top', `${h}px`);
                    }
                  };
                  // Use MutationObserver to detect when progress bar appears/disappears
                  const mo = new MutationObserver(updateHeights);
                  mo.observe(el, { childList: true, subtree: true });
                  updateHeights();
                  const ro = new ResizeObserver(updateHeights);
                  ro.observe(stickyHeader);
                  (el as any).__prepRO?.disconnect();
                  (el as any).__prepMO?.disconnect();
                  (el as any).__prepRO = ro;
                  (el as any).__prepMO = mo;
                }}>
                  <div key={`stage-${Stage.MEAL_PREP}`} className="stage-enter max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 pb-40 pt-6 md:pt-8">
                    {/* Mobile Stepper (visible only on small screens) - Sticky */}
                    <div data-sticky-header="prep" className="md:hidden mb-3 sticky top-0 z-20 pt-2 pb-3 -mx-4 px-4 flex justify-center backdrop-blur-xl" style={{ backgroundColor: 'var(--surface-bg)' }}>
                      <StageStepper
                         currentStage={currentStage}
                         setStage={handleStageChange}
                         hasMealPlan={hasPlanGenerated}
                      />
                    </div>

                    <MealPrepView
                         tasks={prepTasks}
                         mealPlan={planHistory.present}
                         onRegenerate={handleRegeneratePrep}
                         onGenerate={handleRegeneratePrep}
                         onNavigateToMealPlan={() => setCurrentStage(Stage.MEAL_PLANNING)}
                         isLoading={isLoading || isPrepGenerating}
                         hasMealPlan={hasPlanGenerated && planHistory.present.some(day =>
                           Object.values(day.meals).some(meal => meal.name && meal.name.trim() !== '')
                         )}
                         newlyReceivedTasks={newlyReceivedTasks}
                         isInvalidated={isPrepPlanInvalidated()}
                         onTasksChange={setPrepTasks}
                         isLocked={isPlanLocked}
                    />
                    <Footer className="mt-16" />
                  </div>
                </div>
             )}

             {currentStage === Stage.GROCERY_LIST && (
                <div className="h-full overflow-y-auto no-scrollbar" ref={(el) => {
                  if (!el) return;
                  const stickyHeader = el.querySelector('[data-sticky-header="grocery"]') as HTMLElement;
                  if (!stickyHeader) return;
                  const updateHeights = () => {
                    const h = stickyHeader.offsetHeight;
                    el.style.setProperty('--tab-header-height', `${h}px`);
                    const progressBar = el.querySelector('[data-sticky-progress="grocery"]') as HTMLElement;
                    if (progressBar) {
                      const ph = progressBar.offsetHeight;
                      el.style.setProperty('--sticky-content-top', `${h + ph}px`);
                    } else {
                      el.style.setProperty('--sticky-content-top', `${h}px`);
                    }
                  };
                  const mo = new MutationObserver(updateHeights);
                  mo.observe(el, { childList: true, subtree: true });
                  updateHeights();
                  const ro = new ResizeObserver(updateHeights);
                  ro.observe(stickyHeader);
                  (el as any).__groceryRO?.disconnect();
                  (el as any).__groceryMO?.disconnect();
                  (el as any).__groceryRO = ro;
                  (el as any).__groceryMO = mo;
                }}>
                  <div key={`stage-${Stage.GROCERY_LIST}`} className="stage-enter max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 pb-40 pt-6 md:pt-8">
                    {/* Mobile Stepper (visible only on small screens) - Sticky */}
                    <div data-sticky-header="grocery" className="md:hidden mb-3 sticky top-0 z-20 pt-2 pb-3 -mx-4 px-4 flex justify-center backdrop-blur-xl" style={{ backgroundColor: 'var(--surface-bg)' }}>
                      <StageStepper
                         currentStage={currentStage}
                         setStage={handleStageChange}
                         hasMealPlan={hasPlanGenerated}
                      />
                    </div>

                    <GroceryListView
                         items={groceryItems}
                         mealPlan={planHistory.present}
                         onRegenerate={handleRegenerateGrocery}
                         onGenerate={handleRegenerateGrocery}
                         onNavigateToMealPlan={() => setCurrentStage(Stage.MEAL_PLANNING)}
                         isLoading={isLoading || isGroceryGenerating}
                         hasMealPlan={hasPlanGenerated && planHistory.present.some(day =>
                           Object.values(day.meals).some(meal => meal.name && meal.name.trim() !== '')
                         )}
                         newlyReceivedItems={newlyReceivedItems}
                         isInvalidated={isGroceryListInvalidated()}
                         onItemsChange={setGroceryItems}
                         isLocked={isPlanLocked}
                    />
                    <Footer className="mt-16" />
                  </div>
                </div>
             )}
          </>
        )}

      </main>

      {/*
        Bottom Floating Controls
      */}
      {viewMode === 'planning' && (
          <div className="fixed bottom-8 w-full px-6 flex items-center justify-end pointer-events-none z-50 max-w-[1600px] mx-auto left-0 right-0">

             {/* Assistant Toggle (Black Circle) */}
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
                            ? 'scale-95 ring-4 ring-primary-200/20'
                            : 'hover:scale-110 active:scale-95'}
                    `}
                    style={{
                      backgroundColor: isChatOpen ? 'var(--text-primary)' : 'var(--text-primary)',
                      color: 'var(--text-inverted)',
                      opacity: isChatOpen ? 0.85 : 1
                    }}
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
