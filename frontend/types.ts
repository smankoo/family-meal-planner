export enum Stage {
  MEAL_PLANNING = 0,
  GROCERY_LIST = 1,
  MEAL_PREP = 2
}

export enum MealTime {
  BREAKFAST = 'Breakfast',
  LUNCH = 'Lunch',
  SNACK = 'Snack',
  DINNER = 'Dinner'
}

export interface FamilyMember {
  id: string;
  name: string;
  age: number;
  role: 'Adult' | 'Child' | 'Toddler' | 'Baby';
  likes: string;
  dislikes: string;
  notes?: string;
}

export interface FamilyPreferences {
  cuisines: string;
  restrictions: string[];
  weekendEffort: 'Low' | 'Medium' | 'High';
  generalNotes?: string; // New field for freeform lifestyle constraints
}

export interface MealCell {
  name: string;
  description?: string;
  notes?: string;
  tags?: string[]; // e.g., "Vegetarian", "Quick"
}

export interface DayPlan {
  day: string; // Mon, Tue, etc.
  meals: Record<MealTime, MealCell>;
}

export type WeekPlan = DayPlan[];

export interface PrepTask {
  id: string;
  day: string; // When to do it (e.g., "Weekend", "Monday Night")
  task: string;
  relatedMeals: string[];
  completed?: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  checked: boolean;
  relatedMeals?: string[]; // Which meals this ingredient is used for
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  relatedAction?: string; // e.g., "Updated Tuesday Lunch"
}

export interface PlanHistory {
  past: WeekPlan[];
  present: WeekPlan;
  future: WeekPlan[];
}

export interface InvalidationState {
  prepPlanVersion?: string; // Version when prep plan was generated
  groceryListVersion?: string; // Version when grocery list was generated
  currentPlanVersion: string; // Current meal plan version
}

export interface MealChange {
  day: string;
  mealType: string;
  oldMeal?: MealCell;
  newMeal: MealCell;
}
