from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import google.generativeai as genai
import os
import json

app = FastAPI(title="Family Meal Planner API")

# Configure CORS - update with your frontend URL later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],  # Add your deployed frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Pydantic models
class FamilyMember(BaseModel):
    name: str
    age: int
    role: str
    dislikes: List[str] = []

class FamilyPreferences(BaseModel):
    cuisines: List[str] = []
    weekendEffort: str = "medium"
    generalNotes: str = ""

class GeneratePlanRequest(BaseModel):
    members: List[FamilyMember]
    preferences: FamilyPreferences

class UpdatePlanRequest(BaseModel):
    currentPlan: List[Dict[str, Any]]
    chatInput: str
    members: List[FamilyMember]
    preferences: FamilyPreferences

class PrepPlanRequest(BaseModel):
    mealPlan: List[Dict[str, Any]]

class GroceryListRequest(BaseModel):
    mealPlan: List[Dict[str, Any]]
    prepTasks: List[Dict[str, Any]]

@app.get("/")
async def root():
    return {"message": "Family Meal Planner API"}

@app.post("/api/generate-plan")
async def generate_plan(request: GeneratePlanRequest):
    try:
        # Convert your existing TypeScript logic to Python
        members_json = [member.dict() for member in request.members]
        preferences_json = request.preferences.dict()
        
        cuisine_instruction = ""
        if request.preferences.cuisines:
            cuisine_instruction = f"IMPORTANT: The majority of meals MUST be from the following cuisines: {', '.join(request.preferences.cuisines)}."
        else:
            cuisine_instruction = "Provide a balanced variety of cuisines."

        prompt = f"""
        Generate a 7-day meal plan (Mon-Sun) for this family.
        
        Family Members (ages and roles included):
        {json.dumps(members_json, indent=2)}
        
        Preferences:
        {json.dumps(preferences_json, indent=2)}
        
        Rules:
        1. {cuisine_instruction}
        2. Respect ages (toddlers need safer foods, less spice if not specified otherwise).
        3. Respect dislikes explicitly.
        4. Weekend Effort Level: {request.preferences.weekendEffort}.
        5. FAMILY LIFESTYLE CONSTRAINTS (CRITICAL): {request.preferences.generalNotes or "None provided. Assume standard family schedule."}
        6. Return a JSON array of 7 Day objects.
        """

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        plan = json.loads(response.text)
        return {"plan": plan}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/update-plan")
async def update_plan(request: UpdatePlanRequest):
    try:
        members_json = [member.dict() for member in request.members]
        preferences_json = request.preferences.dict()
        
        cuisine_instruction = ""
        if request.preferences.cuisines:
            cuisine_instruction = f"Maintain the preference for these cuisines: {', '.join(request.preferences.cuisines)}."

        prompt = f"""
        User Request: "{request.chatInput}"
        
        Current Plan:
        {json.dumps(request.currentPlan)}
        
        Family Context:
        {json.dumps(members_json)}

        Global Preferences:
        {json.dumps(preferences_json)}
        
        Task:
        1. Analyze the request.
        2. Modify the current plan to satisfy the request while maintaining other constraints.
        3. {cuisine_instruction}
        4. Maintain these ongoing LIFESTYLE CONSTRAINTS: {request.preferences.generalNotes or "None"}
        5. If the request implies a new preference (e.g., "We hate mushrooms"), implicitly apply it to this update.
        6. Return the FULL updated plan and a concise explanation in this format:
        {{"plan": [...], "explanation": "..."}}
        """

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        result = json.loads(response.text)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-prep")
async def generate_prep(request: PrepPlanRequest):
    try:
        prompt = f"""
        Analyze this meal plan and generate a high-level meal prep strategy.
        
        Meal Plan:
        {json.dumps(request.mealPlan)}
        
        Goal:
        - Identify tasks that can be batched on the weekend or the night before.
        - Group similar tasks (e.g., "Chop veggies for Mon/Tue dinners").
        - Keep it simple and actionable.
        - Return as JSON array of prep tasks with fields: day, task, relatedMeals
        """

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        tasks = json.loads(response.text)
        return {"tasks": tasks}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-grocery")
async def generate_grocery(request: GroceryListRequest):
    try:
        prompt = f"""
        Generate a consolidated grocery list based on this meal plan and prep strategy.
        
        Meal Plan:
        {json.dumps(request.mealPlan)}
        
        Prep Tasks:
        {json.dumps(request.prepTasks)}
        
        Rules:
        - Group by category (Produce, Meat, Dairy, Pantry, etc.).
        - Estimate quantities reasonably for a family of 4 (unless context implies otherwise).
        - Return as JSON array with fields: name, category, quantity
        """

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        items = json.loads(response.text)
        return {"items": items}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))