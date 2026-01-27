import { FamilyMember, FamilyPreferences, WeekPlan, PrepTask, GroceryItem } from "../types";

// FastAPI backend base URL
const API_BASE_URL = "http://localhost:8000";

// Helper function for API calls
const apiCall = async (endpoint: string, data: any) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
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
    
    return response.plan as WeekPlan;
  } catch (error) {
    console.error("Error generating initial plan:", error);
    throw error;
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
    // Ensure IDs
    return tasks.map((t, i) => ({ ...t, id: t.id || `prep-${Date.now()}-${i}` }));
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