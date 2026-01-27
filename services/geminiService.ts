import { FamilyMember, FamilyPreferences, WeekPlan, PrepTask, GroceryItem } from "../types";

// FastAPI backend base URL - use environment variable in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Helper function for API calls with enhanced error handling
const apiCall = async (endpoint: string, data: any) => {
  console.log(`Making API call to ${API_BASE_URL}${endpoint}`, data);
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log(`Response status: ${response.status} ${response.statusText}`);

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
    
    // Create a structured error
    const error = new Error(errorData.message || errorData.detail || 'Unknown error');
    (error as any).code = errorData.code;
    (error as any).retryAfter = errorData.retry_after;
    (error as any).details = errorData.details;
    
    throw error;
  }

  const result = await response.json();
  console.log("API success response:", result);
  return result;
};

// --- Service Methods ---

export const generateInitialMealPlan = async (
  members: FamilyMember[],
  preferences: FamilyPreferences
): Promise<WeekPlan> => {
  try {
    console.log("Making API call to generate plan...");
    const response = await apiCall('/api/generate-plan', {
      members,
      preferences
    });
    
    console.log("API response received:", response);
    
    if (!response.plan) {
      throw new Error("No plan in response");
    }
    
    return response.plan as WeekPlan;
  } catch (error) {
    console.error("Error generating initial plan:", error);
    throw error;
  }
};

// Streaming version of meal plan generation
export const generateInitialMealPlanStream = async (
  members: FamilyMember[],
  preferences: FamilyPreferences,
  onDayReceived: (day: any, dayIndex: number) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  try {
    console.log("Starting streaming meal plan generation...");
    
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
    let dayIndex = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("Stream completed");
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
                console.log("Received completion signal");
                onComplete();
                return;
              } else if (data.type === 'error') {
                console.error("Received error from stream:", data);
                const error = new Error(data.message || 'Streaming error');
                (error as any).code = data.code;
                onError(error);
                return;
              } else if (data.day) {
                // This is a day object
                console.log(`Received day: ${data.day}`, data);
                onDayReceived(data, dayIndex);
                dayIndex++;
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
    console.error("Error in streaming generation:", error);
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