import { FamilyMember, FamilyPreferences, WeekPlan, PlanHistory, PrepTask, GroceryItem, InvalidationState } from '../types';
import { INITIAL_FAMILY, INITIAL_PREFERENCES, EMPTY_PLAN } from '../constants';

// Schema version for migration tracking
const CURRENT_SCHEMA_VERSION = '1.0.0';
const SCHEMA_VERSION_KEY = 'fmp_schema_version';

// Type guards for validation
const isString = (value: any): value is string => typeof value === 'string';
const isNumber = (value: any): value is number => typeof value === 'number';
const isArray = (value: any): value is any[] => Array.isArray(value);
const isObject = (value: any): value is object => value !== null && typeof value === 'object' && !Array.isArray(value);

// Validate and migrate FamilyMember
const validateFamilyMember = (member: any): FamilyMember | null => {
  if (!isObject(member)) return null;

  try {
    return {
      id: isString(member.id) ? member.id : `member-${Date.now()}`,
      name: isString(member.name) ? member.name : '',
      age: isNumber(member.age) ? member.age : 30,
      role: ['Adult', 'Child', 'Toddler', 'Baby'].includes(member.role) ? member.role : 'Adult',
      // Ensure likes and dislikes are strings (migrate from arrays if needed)
      likes: isString(member.likes) ? member.likes :
             isArray(member.likes) ? member.likes.join(', ') : '',
      dislikes: isString(member.dislikes) ? member.dislikes :
                isArray(member.dislikes) ? member.dislikes.join(', ') : '',
      notes: isString(member.notes) ? member.notes : ''
    };
  } catch (error) {
    console.warn('Failed to validate family member:', error);
    return null;
  }
};

// Validate and migrate FamilyPreferences
const validateFamilyPreferences = (prefs: any): FamilyPreferences => {
  if (!isObject(prefs)) return INITIAL_PREFERENCES;

  try {
    return {
      // Ensure cuisines is a string (migrate from array if needed)
      cuisines: isString(prefs.cuisines) ? prefs.cuisines :
                isArray(prefs.cuisines) ? prefs.cuisines.join(', ') : '',
      restrictions: isArray(prefs.restrictions) ? prefs.restrictions.filter(isString) : [],
      weekendEffort: ['Low', 'Medium', 'High'].includes(prefs.weekendEffort) ? prefs.weekendEffort : 'Medium',
      generalNotes: isString(prefs.generalNotes) ? prefs.generalNotes : ''
    };
  } catch (error) {
    console.warn('Failed to validate preferences:', error);
    return INITIAL_PREFERENCES;
  }
};

// Validate WeekPlan
const validateWeekPlan = (plan: any): WeekPlan => {
  if (!isArray(plan)) return EMPTY_PLAN;

  try {
    return plan.map((day: any) => {
      if (!isObject(day) || !isString(day.day) || !isObject(day.meals)) {
        return EMPTY_PLAN.find(d => d.day === day?.day) || EMPTY_PLAN[0];
      }

      return {
        day: day.day,
        meals: {
          Breakfast: isObject(day.meals.Breakfast) ? {
            name: isString(day.meals.Breakfast.name) ? day.meals.Breakfast.name : '',
            description: isString(day.meals.Breakfast.description) ? day.meals.Breakfast.description : '',
            notes: isString(day.meals.Breakfast.notes) ? day.meals.Breakfast.notes : ''
          } : { name: '' },
          Lunch: isObject(day.meals.Lunch) ? {
            name: isString(day.meals.Lunch.name) ? day.meals.Lunch.name : '',
            description: isString(day.meals.Lunch.description) ? day.meals.Lunch.description : '',
            notes: isString(day.meals.Lunch.notes) ? day.meals.Lunch.notes : ''
          } : { name: '' },
          Snack: isObject(day.meals.Snack) ? {
            name: isString(day.meals.Snack.name) ? day.meals.Snack.name : '',
            description: isString(day.meals.Snack.description) ? day.meals.Snack.description : '',
            notes: isString(day.meals.Snack.notes) ? day.meals.Snack.notes : ''
          } : { name: '' },
          Dinner: isObject(day.meals.Dinner) ? {
            name: isString(day.meals.Dinner.name) ? day.meals.Dinner.name : '',
            description: isString(day.meals.Dinner.description) ? day.meals.Dinner.description : '',
            notes: isString(day.meals.Dinner.notes) ? day.meals.Dinner.notes : ''
          } : { name: '' }
        }
      };
    });
  } catch (error) {
    console.warn('Failed to validate week plan:', error);
    return EMPTY_PLAN;
  }
};

// Check if schema migration is needed
const needsMigration = (): boolean => {
  try {
    const storedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);
    return storedVersion !== CURRENT_SCHEMA_VERSION;
  } catch (error) {
    return true;
  }
};

// Clear all localStorage data (for corrupted data)
const clearAllData = (): void => {
  const keys = [
    'fmp_family',
    'fmp_preferences',
    'fmp_has_plan',
    'fmp_current_stage',
    'fmp_plan_history',
    'fmp_prep_tasks',
    'fmp_grocery_items',
    'fmp_invalidation_state'
  ];

  keys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
    }
  });

  console.log('LocalStorage data cleared due to schema mismatch');
};

// Migrate localStorage data to current schema
const migrateData = (): void => {
  try {
    console.log('Migrating localStorage data to current schema...');

    // Migrate family data
    const familyData = localStorage.getItem('fmp_family');
    if (familyData) {
      try {
        const parsed = JSON.parse(familyData);
        if (isArray(parsed)) {
          const validatedFamily = parsed.map(validateFamilyMember).filter(Boolean) as FamilyMember[];
          if (validatedFamily.length > 0) {
            localStorage.setItem('fmp_family', JSON.stringify(validatedFamily));
          } else {
            localStorage.setItem('fmp_family', JSON.stringify(INITIAL_FAMILY));
          }
        }
      } catch (error) {
        console.warn('Failed to migrate family data:', error);
        localStorage.setItem('fmp_family', JSON.stringify(INITIAL_FAMILY));
      }
    }

    // Migrate preferences data
    const prefsData = localStorage.getItem('fmp_preferences');
    if (prefsData) {
      try {
        const parsed = JSON.parse(prefsData);
        const validatedPrefs = validateFamilyPreferences(parsed);
        localStorage.setItem('fmp_preferences', JSON.stringify(validatedPrefs));
      } catch (error) {
        console.warn('Failed to migrate preferences data:', error);
        localStorage.setItem('fmp_preferences', JSON.stringify(INITIAL_PREFERENCES));
      }
    }

    // Migrate plan history
    const planData = localStorage.getItem('fmp_plan_history');
    if (planData) {
      try {
        const parsed = JSON.parse(planData);
        if (isObject(parsed) && isArray(parsed.past) && isArray(parsed.present)) {
          const validatedHistory: PlanHistory = {
            past: parsed.past.map(validateWeekPlan),
            present: validateWeekPlan(parsed.present),
            future: isArray(parsed.future) ? parsed.future.map(validateWeekPlan) : []
          };
          localStorage.setItem('fmp_plan_history', JSON.stringify(validatedHistory));
        }
      } catch (error) {
        console.warn('Failed to migrate plan history:', error);
        localStorage.removeItem('fmp_plan_history');
      }
    }

    // Mark migration as complete
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
    console.log('LocalStorage migration completed successfully');

  } catch (error) {
    console.error('Migration failed, clearing all data:', error);
    clearAllData();
    localStorage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  }
};

// Safe localStorage operations with validation
export const loadState = <T>(key: string, fallback: T, validator?: (value: any) => T): T => {
  try {
    // Check if migration is needed before loading any data
    if (needsMigration()) {
      migrateData();
    }

    const stored = localStorage.getItem(key);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);

    // Apply validator if provided
    if (validator) {
      return validator(parsed);
    }

    return parsed;
  } catch (error) {
    console.error(`Failed to load ${key}:`, error);

    // If this is a critical error, clear the specific key
    try {
      localStorage.removeItem(key);
    } catch (removeError) {
      console.warn(`Failed to remove corrupted key ${key}:`, removeError);
    }

    return fallback;
  }
};

export const saveState = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
};

// Specific validators for each data type
export const validateFamily = (data: any): FamilyMember[] => {
  if (!isArray(data)) return INITIAL_FAMILY;
  const validated = data.map(validateFamilyMember).filter(Boolean) as FamilyMember[];
  return validated.length > 0 ? validated : INITIAL_FAMILY;
};

export const validatePreferences = validateFamilyPreferences;

export const validatePlanHistory = (data: any): PlanHistory => {
  if (!isObject(data)) {
    return {
      past: [],
      present: EMPTY_PLAN,
      future: []
    };
  }

  return {
    past: isArray(data.past) ? data.past.map(validateWeekPlan) : [],
    present: validateWeekPlan(data.present),
    future: isArray(data.future) ? data.future.map(validateWeekPlan) : []
  };
};
