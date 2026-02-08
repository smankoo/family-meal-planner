import { WeekPlan } from '../types';

/**
 * Resolves a meal reference (e.g., "monday dinner", "Tuesday Lunch") to the actual meal name
 * from the meal plan. If the meal cannot be resolved, returns the original reference.
 */
export const resolveMealName = (mealRef: string, mealPlan?: WeekPlan): string => {
  if (!mealPlan) return mealRef;

  // Try to parse references like "monday dinner", "Tuesday Lunch", etc.
  const parts = mealRef.toLowerCase().split(' ');
  if (parts.length >= 2) {
    const dayPart = parts[0];
    const mealPart = parts[1];

    // Find the day in the meal plan
    const dayPlan = mealPlan.find(day =>
      day.day.toLowerCase().startsWith(dayPart) ||
      day.day.toLowerCase() === dayPart
    );

    if (dayPlan) {
      // Find the meal type
      const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
      const mealType = mealTypes.find(type =>
        type.startsWith(mealPart) || mealPart.startsWith(type)
      );

      if (mealType) {
        const mealKey = mealType.charAt(0).toUpperCase() + mealType.slice(1);
        const meal = dayPlan.meals[mealKey as keyof typeof dayPlan.meals];
        if (meal && meal.name && meal.name.trim()) {
          return meal.name;
        }
      }
    }
  }

  // If we can't resolve it, return the original reference
  return mealRef;
};
