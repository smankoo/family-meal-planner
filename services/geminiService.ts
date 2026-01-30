import { FamilyMember, FamilyPreferences, WeekPlan, PrepTask, GroceryItem } from "../types";

// FastAPI backend base URL - use environment variable in production
// Empty string from build means env var wasn't set, so fall back to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Helper function for API calls with enhanced error handling
const apiCall = async (endpoint: string, data: any) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: 'Network Error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        code: 'NETWORK_ERROR'
      };
    }

    console.error("API error response:", errorData);

    // Create a structured error that includes the response data
    const error = new Error(errorData.message || errorData.detail || 'Unknown error');
    (error as any).code = errorData.code || response.status;
    (error as any).retryAfter = errorData.retry_after;
    (error as any).details = errorData.details;
    (error as any).response = {
      status: response.status,
      data: errorData
    };

    throw error;
  }

  const result = await response.json();
  return result;
};

// --- Service Methods ---

export const generateInitialMealPlan = async (
  members: FamilyMember[],
  preferences: FamilyPreferences
): Promise<WeekPlan> => {
  try {
    const response = await apiCall('/api/generate-plan', {
      members,
      preferences
    });

    if (!response.plan) {
      throw new Error("No plan in response");
    }

    return response.plan as WeekPlan;
  } catch (error) {
    console.error("Error generating initial plan:", error);
    throw error;
  }
};

// Streaming version of meal plan generation - Phase 2: Meal-by-meal streaming
export const generateInitialMealPlanStream = async (
  members: FamilyMember[],
  preferences: FamilyPreferences,
  onMealReceived: (mealData: any) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-plan-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        members,
        preferences
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: 'Network Error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'NETWORK_ERROR'
        };
      }

      // Create initial error message
      let errorMessage = errorData.message ||
                        (typeof errorData.detail === 'string' ? errorData.detail : 'Request failed');

      // If it's a validation error, create a more user-friendly message
      if (Array.isArray(errorData.detail)) {
        const validationErrors = errorData.detail.map(err => {
          const location = Array.isArray(err.loc) ? err.loc.join('.') : 'unknown';
          return `${location}: ${err.msg || 'Validation failed'}`;
        }).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      }

      const error = new Error(errorMessage);
      (error as any).code = errorData.code || response.status;

      // Properly serialize the response data to avoid [object Object] issues
      (error as any).response = {
        status: response.status,
        data: errorData
      };

      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let mealCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

              if (data.type === 'complete') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                const error = new Error(data.message || 'Streaming error');
                (error as any).code = data.code;
                (error as any).retryAfter = data.retry_after;
                onError(error);
                return;
              } else if (data.day && data.mealType && data.meal) {
                // This is a meal object
                onMealReceived(data);
                mealCount++;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", line, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    onError(error as Error);
  }
};

export const updateMealPlanWithAgent = async (
  currentPlan: WeekPlan,
  chatInput: string,
  members: FamilyMember[],
  preferences: FamilyPreferences
): Promise<{ plan: WeekPlan; explanation: string }> => {
  try {
    const response = await apiCall('/api/update-plan', {
      currentPlan,
      chatInput,
      members,
      preferences
    });

    return {
      plan: response.plan as WeekPlan,
      explanation: response.explanation
    };
  } catch (error) {
    console.error("Error updating plan:", error);
    throw error;
  }
};

export const replaceSingleMeal = async (
  day: string,
  mealType: string,
  currentMeal: any,
  currentPlan: WeekPlan,
  members: FamilyMember[],
  preferences: FamilyPreferences
): Promise<any> => {
  try {
    const response = await apiCall('/api/replace-meal', {
      day,
      mealType,
      currentMeal,
      currentPlan,
      members,
      preferences
    });

    return response.meal;
  } catch (error) {
    console.error("Error replacing meal:", error);
    throw error;
  }
};

export const generateMealPrepPlan = async (mealPlan: WeekPlan): Promise<PrepTask[]> => {
  try {
    const response = await apiCall('/api/generate-prep', {
      mealPlan
    });

    const tasks = response.tasks as PrepTask[];
    // Ensure IDs and validate relatedMeals structure
    return tasks.map((t, i) => ({
      ...t,
      id: t.id || `prep-${Date.now()}-${i}`,
      relatedMeals: Array.isArray(t.relatedMeals) ? t.relatedMeals :
                   typeof t.relatedMeals === 'string' ? [t.relatedMeals] : []
    }));
  } catch (error) {
    console.error("Error generating prep plan:", error);
    throw error;
  }
};

// Streaming version of prep plan generation
export const generateMealPrepPlanStream = async (
  mealPlan: WeekPlan,
  onTaskReceived: (taskData: any) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-prep-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mealPlan
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: 'Network Error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'NETWORK_ERROR'
        };
      }

      const error = new Error(errorData.message || errorData.detail || 'Unknown error');
      (error as any).code = errorData.code;
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let taskCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

              if (data.type === 'complete') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                const error = new Error(data.message || 'Streaming error');
                (error as any).code = data.code;
                (error as any).retryAfter = data.retry_after;
                onError(error);
                return;
              } else if (data.day && data.task) {
                // This is a task object
                onTaskReceived(data);
                taskCount++;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", line, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    onError(error as Error);
  }
};

export const generateGroceryList = async (mealPlan: WeekPlan, prepTasks: PrepTask[]): Promise<GroceryItem[]> => {
  try {
    const response = await apiCall('/api/generate-grocery', {
      mealPlan,
      prepTasks
    });

    const items = response.items as GroceryItem[];
    return items.map((item, i) => ({
      ...item,
      id: item.id || `groc-${Date.now()}-${i}`,
      checked: false
    }));
  } catch (error) {
    console.error("Error generating grocery list:", error);
    throw error;
  }
};

// Streaming version of grocery list generation
export const generateGroceryListStream = async (
  mealPlan: WeekPlan,
  prepTasks: PrepTask[],
  onItemReceived: (itemData: any) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-grocery-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mealPlan,
        prepTasks
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: 'Network Error',
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'NETWORK_ERROR'
        };
      }

      const error = new Error(errorData.message || errorData.detail || 'Unknown error');
      (error as any).code = errorData.code;
      throw error;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let itemCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)); // Remove 'data: ' prefix

              if (data.type === 'complete') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                const error = new Error(data.message || 'Streaming error');
                (error as any).code = data.code;
                (error as any).retryAfter = data.retry_after;
                onError(error);
                return;
              } else if (data.name && data.category) {
                // This is an item object
                onItemReceived(data);
                itemCount++;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", line, parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

  } catch (error) {
    onError(error as Error);
  }
};
