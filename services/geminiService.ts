import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FamilyMember, FamilyPreferences, WeekPlan, PrepTask, GroceryItem, MealTime } from "../types";

// Helper to get fresh client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Schemas ---

const mealCellSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Name of the meal" },
    description: { type: Type.STRING, description: "Short description of ingredients or style" },
    notes: { type: Type.STRING, description: "Any specific notes for kids or prep" },
  },
  required: ["name"]
};

const dayPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    day: { type: Type.STRING, description: "Day of week (Mon, Tue...)" },
    meals: {
      type: Type.OBJECT,
      properties: {
        [MealTime.BREAKFAST]: mealCellSchema,
        [MealTime.LUNCH]: mealCellSchema,
        [MealTime.SNACK]: mealCellSchema,
        [MealTime.DINNER]: mealCellSchema,
      },
      required: [MealTime.BREAKFAST, MealTime.LUNCH, MealTime.DINNER]
    }
  },
  required: ["day", "meals"]
};

const weekPlanSchema: Schema = {
  type: Type.ARRAY,
  items: dayPlanSchema
};

const planUpdateResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    plan: weekPlanSchema,
    explanation: { type: Type.STRING, description: "Concise explanation of what changed and why." }
  },
  required: ["plan", "explanation"]
};

const prepTaskSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    day: { type: Type.STRING, description: "When to do the prep (e.g., Sunday Prep, Tuesday Night)" },
    task: { type: Type.STRING, description: "The action to take (e.g., Chop onions, Marinate chicken)" },
    relatedMeals: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["day", "task"]
};

const prepPlanSchema: Schema = {
  type: Type.ARRAY,
  items: prepTaskSchema
};

const groceryItemSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    name: { type: Type.STRING },
    category: { type: Type.STRING, description: "e.g., Produce, Dairy, Pantry" },
    quantity: { type: Type.STRING }
  },
  required: ["name", "category"]
};

const groceryListSchema: Schema = {
  type: Type.ARRAY,
  items: groceryItemSchema
};


// --- Service Methods ---

export const generateInitialMealPlan = async (
  members: FamilyMember[],
  preferences: FamilyPreferences
): Promise<WeekPlan> => {
  const ai = getAiClient();
  
  const cuisineInstruction = preferences.cuisines.length > 0
    ? `IMPORTANT: The majority of meals MUST be from the following cuisines: ${preferences.cuisines.join(', ')}.`
    : "Provide a balanced variety of cuisines.";

  const prompt = `
    Generate a 7-day meal plan (Mon-Sun) for this family.
    
    Family Members (ages and roles included):
    ${JSON.stringify(members, null, 2)}
    
    Preferences:
    ${JSON.stringify(preferences, null, 2)}
    
    Rules:
    1. ${cuisineInstruction}
    2. Respect ages (toddlers need safer foods, less spice if not specified otherwise).
    3. Respect dislikes explicitly.
    4. Weekend Effort Level: ${preferences.weekendEffort}.
    5. FAMILY LIFESTYLE CONSTRAINTS (CRITICAL): ${preferences.generalNotes || "None provided. Assume standard family schedule."}
    6. Return a JSON array of 7 Day objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: weekPlanSchema,
        systemInstruction: "You are an expert family meal planner. You prioritize low-stress, nutritional balance, and kid-friendly options. You Strictly adhere to user lifestyle constraints."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text) as WeekPlan;
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
  const ai = getAiClient();

  const cuisineInstruction = preferences.cuisines.length > 0
    ? `Maintain the preference for these cuisines: ${preferences.cuisines.join(', ')}.`
    : "";

  const prompt = `
    User Request: "${chatInput}"
    
    Current Plan:
    ${JSON.stringify(currentPlan)}
    
    Family Context:
    ${JSON.stringify(members)}

    Global Preferences:
    ${JSON.stringify(preferences)}
    
    Task:
    1. Analyze the request.
    2. Modify the current plan to satisfy the request while maintaining other constraints.
    3. ${cuisineInstruction}
    4. Maintain these ongoing LIFESTYLE CONSTRAINTS: ${preferences.generalNotes || "None"}
    5. If the request implies a new preference (e.g., "We hate mushrooms"), implicitly apply it to this update.
    6. Return the FULL updated plan and a concise explanation.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: planUpdateResponseSchema,
        systemInstruction: "You are a helpful, empathetic planning agent. You make changes to meal plans to reduce stress. Explain your changes clearly."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error updating plan:", error);
    throw error;
  }
};

export const generateMealPrepPlan = async (mealPlan: WeekPlan): Promise<PrepTask[]> => {
  const ai = getAiClient();

  const prompt = `
    Analyze this meal plan and generate a high-level meal prep strategy.
    
    Meal Plan:
    ${JSON.stringify(mealPlan)}
    
    Goal:
    - Identify tasks that can be batched on the weekend or the night before.
    - Group similar tasks (e.g., "Chop veggies for Mon/Tue dinners").
    - Keep it simple and actionable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: prepPlanSchema,
        systemInstruction: "You are a pragmatic chef helping a busy family prep ahead. Focus on batching and efficiency."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const tasks = JSON.parse(text) as PrepTask[];
    // Ensure IDs
    return tasks.map((t, i) => ({ ...t, id: t.id || `prep-${Date.now()}-${i}` }));
  } catch (error) {
    console.error("Error generating prep plan:", error);
    throw error;
  }
};

export const generateGroceryList = async (mealPlan: WeekPlan, prepTasks: PrepTask[]): Promise<GroceryItem[]> => {
  const ai = getAiClient();

  const prompt = `
    Generate a consolidated grocery list based on this meal plan and prep strategy.
    
    Meal Plan:
    ${JSON.stringify(mealPlan)}
    
    Prep Tasks:
    ${JSON.stringify(prepTasks)}
    
    Rules:
    - Group by category (Produce, Meat, Dairy, Pantry, etc.).
    - Estimate quantities reasonably for a family of 4 (unless context implies otherwise).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: groceryListSchema,
        systemInstruction: "You are a helpful assistant generating an organized shopping list."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    const items = JSON.parse(text) as GroceryItem[];
    return items.map((item, i) => ({ ...item, id: item.id || `groc-${Date.now()}-${i}`, checked: false }));
  } catch (error) {
    console.error("Error generating grocery list:", error);
    throw error;
  }
};