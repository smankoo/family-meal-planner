import { FamilyMember, FamilyPreferences, MealTime, WeekPlan } from "./types";

export const INITIAL_FAMILY: FamilyMember[] = [
  {
    id: '1',
    name: 'Alex',
    age: 38,
    role: 'Adult',
    likes: 'Spicy food, Asian cuisine, Salads',
    dislikes: 'Heavy cream',
    notes: 'Likes high protein'
  },
  {
    id: '2',
    name: 'Sam',
    age: 35,
    role: 'Adult',
    likes: 'Pasta, Comfort food',
    dislikes: 'Mushrooms',
    notes: 'Vegetarian preference on weekdays'
  },
  {
    id: '3',
    name: 'Leo',
    age: 4,
    role: 'Toddler',
    likes: 'Mac & Cheese, Fruits, Chicken nuggets',
    dislikes: 'Spicy food, Broccoli',
    notes: 'Needs food cut into small pieces'
  }
];

export const INITIAL_PREFERENCES: FamilyPreferences = {
  cuisines: 'Italian, Mexican, Indian, American',
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