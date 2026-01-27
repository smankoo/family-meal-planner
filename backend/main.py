from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
import os
import json
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = FastAPI(title="Family Meal Planner API")

# Error response model
class ErrorResponse(BaseModel):
    error: str
    message: str
    code: str
    retry_after: Optional[int] = None
    details: Optional[str] = None

# Custom exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    # Handle specific error types
    if "rate limit" in str(exc).lower() or "quota" in str(exc).lower():
        return JSONResponse(
            status_code=429,
            content=ErrorResponse(
                error="Rate Limit Exceeded",
                message="API rate limit reached. Please try again in a few minutes.",
                code="RATE_LIMIT_EXCEEDED",
                retry_after=300,  # 5 minutes
                details=str(exc)
            ).model_dump()
        )
    elif "api key" in str(exc).lower() or "authentication" in str(exc).lower():
        return JSONResponse(
            status_code=401,
            content=ErrorResponse(
                error="Authentication Error",
                message="API key is missing or invalid. Please check your configuration.",
                code="AUTH_ERROR",
                details=str(exc)
            ).model_dump()
        )
    else:
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Internal Server Error",
                message="An unexpected error occurred. Please try again later.",
                code="INTERNAL_ERROR",
                details=str(exc) if os.getenv("DEBUG") == "true" else None
            ).model_dump()
        )

# Configure CORS - allow production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "https://*.onrender.com",
        "https://mealplan.mankoo.ca",
        "https://*.mankoo.ca"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini with new SDK
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Pydantic models
class FamilyMember(BaseModel):
    id: str
    name: str
    age: int
    role: str
    likes: str = ""
    dislikes: str = ""
    notes: str = ""

class FamilyPreferences(BaseModel):
    cuisines: str = ""
    restrictions: List[str] = []
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
    # Check if API key is available
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "PLACEHOLDER_API_KEY":
        raise HTTPException(
            status_code=400, 
            detail=ErrorResponse(
                error="Configuration Error",
                message="GEMINI_API_KEY not configured. Please set a valid API key.",
                code="MISSING_API_KEY"
            ).model_dump()
        )
    
    try:
        logger.info("Generating meal plan for family")
        
        # Convert your existing TypeScript logic to Python
        members_json = [member.model_dump() for member in request.members]
        preferences_json = request.preferences.model_dump()
        
        cuisine_instruction = ""
        if request.preferences.cuisines.strip():
            cuisine_instruction = f"IMPORTANT: The majority of meals MUST be from the following cuisines: {request.preferences.cuisines}."
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
        
        IMPORTANT: Return EXACTLY this JSON structure:
        [
          {{
            "day": "Monday",
            "meals": {{
              "Breakfast": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}},
              "Lunch": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}},
              "Snack": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}},
              "Dinner": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}}
            }}
          }},
          ... (repeat for all 7 days)
        ]
        
        Each meal must have "name", "description", and "notes" fields. Include all 4 meal times: Breakfast, Lunch, Snack, Dinner.
        """

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        plan = json.loads(response.text)
        logger.info("Successfully generated meal plan")
        return {"plan": plan}
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="Response Parsing Error",
                message="Failed to parse the generated meal plan. Please try again.",
                code="PARSE_ERROR",
                details=str(e)
            ).model_dump()
        )
    except Exception as e:
        logger.error(f"Error in generate_plan: {str(e)}")
        # Let the global exception handler deal with it
        raise e

@app.post("/api/update-plan")
async def update_plan(request: UpdatePlanRequest):
    try:
        logger.info("Updating meal plan with user request")
        
        members_json = [member.model_dump() for member in request.members]
        preferences_json = request.preferences.model_dump()
        
        cuisine_instruction = ""
        if request.preferences.cuisines.strip():
            cuisine_instruction = f"Maintain the preference for these cuisines: {request.preferences.cuisines}."

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

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        result = json.loads(response.text)
        logger.info("Successfully updated meal plan")
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error in update_plan: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="Response Parsing Error",
                message="Failed to parse the updated meal plan. Please try again.",
                code="PARSE_ERROR",
                details=str(e)
            ).model_dump()
        )
    except Exception as e:
        logger.error(f"Error in update_plan: {str(e)}")
        raise e

@app.post("/api/generate-prep")
async def generate_prep(request: PrepPlanRequest):
    try:
        logger.info("Generating meal prep plan")
        
        prompt = f"""
        Analyze this meal plan and generate a high-level meal prep strategy.
        
        Meal Plan:
        {json.dumps(request.mealPlan)}
        
        Goal:
        - Identify tasks that can be batched on the weekend or the night before.
        - Group similar tasks (e.g., "Chop veggies for Mon/Tue dinners").
        - Keep it simple and actionable.
        
        IMPORTANT: Return EXACTLY this JSON structure:
        [
          {{
            "day": "Weekend",
            "task": "Chop vegetables for Monday and Tuesday dinners",
            "relatedMeals": ["Monday Dinner", "Tuesday Dinner"]
          }},
          {{
            "day": "Sunday Night",
            "task": "Marinate chicken for week",
            "relatedMeals": ["Wednesday Dinner", "Friday Dinner"]
          }}
        ]
        
        Each task MUST have:
        - "day": When to do the task (e.g., "Weekend", "Sunday Night", "Monday Morning")
        - "task": Description of what to do
        - "relatedMeals": Array of strings indicating which meals this helps with
        
        The relatedMeals field MUST be an array of strings, never a single string.
        """

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        tasks = json.loads(response.text)
        logger.info("Successfully generated prep plan")
        return {"tasks": tasks}
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error in generate_prep: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="Response Parsing Error",
                message="Failed to parse the prep plan. Please try again.",
                code="PARSE_ERROR",
                details=str(e)
            ).model_dump()
        )
    except Exception as e:
        logger.error(f"Error in generate_prep: {str(e)}")
        raise e

@app.post("/api/generate-grocery")
async def generate_grocery(request: GroceryListRequest):
    try:
        logger.info("Generating grocery list")
        
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

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        items = json.loads(response.text)
        logger.info("Successfully generated grocery list")
        return {"items": items}
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error in generate_grocery: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="Response Parsing Error",
                message="Failed to parse the grocery list. Please try again.",
                code="PARSE_ERROR",
                details=str(e)
            ).model_dump()
        )
    except Exception as e:
        logger.error(f"Error in generate_grocery: {str(e)}")
        raise e

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))