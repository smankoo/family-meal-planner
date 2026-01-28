import { FamilyMember, FamilyPreferences, MealTime, WeekPlan } from "./types";

export const INITIAL_FAMILY: FamilyMember[] = [
  {
    id: '1',
    name: '',
    age: 30,
    role: 'Adult',
    likes: '',
    dislikes: '',
    notes: ''
  }
];

export const INITIAL_PREFERENCES: FamilyPreferences = {
  cuisines: '',
  restrictions: [],
  weekendEffort: 'Medium',
  generalNotes: ''
};

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MEAL_TIMES = [MealTime.BREAKFAST, MealTime.LUNCH, MealTime.SNACK, MealTime.DINNER];

export const EMPTY_PLAN: WeekPlan = DAYS_OF_WEEK.map(day => ({
  day,
  meals: {
    [MealTime.BREAKFAST]: { name: '' },
    [MealTime.LUNCH]: { name: '' },
    [MealTime.SNACK]: { name: '' },
    [MealTime.DINNER]: { name: '' }
  }
}));
