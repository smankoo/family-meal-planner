from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
import os
import json
import logging
import asyncio
import re
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file, but don't override existing shell env vars
load_dotenv(override=False)

# Debug: Log what API key we're actually using (first 10 chars only for security)
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    logger.info(f"Using API key starting with: {api_key[:10]}...")
else:
    logger.warning("No GEMINI_API_KEY found in environment")

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

@app.post("/api/generate-plan-stream")
async def generate_plan_stream(request: GeneratePlanRequest):
    """Streaming version of meal plan generation - returns days progressively"""

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

    async def generate_stream():
        try:
            logger.info("Generating streaming meal plan for family")

            members_json = [member.model_dump() for member in request.members]
            preferences_json = request.preferences.model_dump()

            cuisine_instruction = ""
            if request.preferences.cuisines.strip():
                cuisine_instruction = f"IMPORTANT: The majority of meals MUST be from the following cuisines: {request.preferences.cuisines}."
            else:
                cuisine_instruction = "Provide a balanced variety of cuisines."

            # Modified prompt for meal-by-meal streaming
            prompt = f"""
            Generate a 7-day meal plan (Mon-Sun) for this family. Generate each meal individually and clearly.

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

            IMPORTANT: Generate each meal in this exact format, one meal at a time:

            MEAL: Monday-Breakfast
            {{"day": "Monday", "mealType": "Breakfast", "meal": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}}}}

            MEAL: Monday-Lunch
            {{"day": "Monday", "mealType": "Lunch", "meal": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}}}}

            MEAL: Monday-Snack
            {{"day": "Monday", "mealType": "Snack", "meal": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}}}}

            MEAL: Monday-Dinner
            {{"day": "Monday", "mealType": "Dinner", "meal": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}}}}

            MEAL: Tuesday-Breakfast
            {{"day": "Tuesday", "mealType": "Breakfast", "meal": {{"name": "Meal Name", "description": "Brief description", "notes": "Any notes"}}}}

            Continue this pattern for all 7 days and 4 meal types (28 meals total).
            Each meal must have "name", "description", and "notes" fields.
            Generate meals in order: Monday (Breakfast→Lunch→Snack→Dinner), then Tuesday (Breakfast→Lunch→Snack→Dinner), etc.
            """

            # Use text mode instead of JSON mode for streaming
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    # Remove JSON mode to allow streaming
                )
            )

            # Parse the response and extract meal objects
            response_text = response.text
            logger.info("Received LLM response, parsing meals...")
            logger.info(f"Response text preview: {response_text[:500]}...")

            # Try multiple parsing strategies for meal-by-meal streaming
            meals_sent = 0

            # Strategy 1: Try to parse as complete JSON array first (fallback to meal-by-meal)
            try:
                plan = json.loads(response_text)
                if isinstance(plan, list) and len(plan) > 0:
                    logger.info("Parsed as complete JSON array, streaming individual meals")
                    meal_types = ["Breakfast", "Lunch", "Snack", "Dinner"]
                    for day_data in plan:
                        if isinstance(day_data, dict) and 'day' in day_data and 'meals' in day_data:
                            for meal_type in meal_types:
                                if meal_type in day_data['meals']:
                                    meal_data = {
                                        "day": day_data['day'],
                                        "mealType": meal_type,
                                        "meal": day_data['meals'][meal_type]
                                    }
                                    logger.info(f"Streaming meal: {day_data['day']}-{meal_type}")
                                    yield f"data: {json.dumps(meal_data)}\n\n"
                                    meals_sent += 1
                                    await asyncio.sleep(0.3)  # Faster for individual meals
                else:
                    raise ValueError("Not a valid plan array")
            except (json.JSONDecodeError, ValueError) as e:
                logger.info(f"Complete JSON parsing failed: {e}, trying meal-by-meal regex extraction...")

                # Strategy 2: Extract individual meal objects using regex
                meal_pattern = r'MEAL: ([^-]+)-([^\n]+)\s*\n(\{[^{}]*"day"[^{}]*"mealType"[^{}]*"meal"[^{}]*\{[^{}]*\}[^{}]*\})'
                potential_meals = re.findall(meal_pattern, response_text, re.DOTALL)

                logger.info(f"Found {len(potential_meals)} potential meal objects")

                for i, (day, meal_type, meal_json) in enumerate(potential_meals):
                    try:
                        # Clean up the JSON string
                        meal_json = meal_json.strip()
                        if not meal_json.endswith('}'):
                            meal_json += '}'

                        meal_data = json.loads(meal_json)
                        if 'day' in meal_data and 'mealType' in meal_data and 'meal' in meal_data:
                            logger.info(f"Successfully parsed and streaming meal: {meal_data['day']}-{meal_data['mealType']}")
                            yield f"data: {json.dumps(meal_data)}\n\n"
                            meals_sent += 1
                            await asyncio.sleep(0.3)
                        else:
                            logger.warning(f"Meal object missing required fields: {meal_data}")
                    except json.JSONDecodeError as parse_error:
                        logger.error(f"Failed to parse meal object {i}: {parse_error}")
                        logger.error(f"Problematic JSON: {meal_json[:200]}...")
                        continue

                # Strategy 3: If regex fails, try line-by-line parsing for meals
                if meals_sent == 0:
                    logger.info("Regex parsing failed, trying line-by-line meal parsing...")
                    lines = response_text.split('\n')
                    current_meal = None
                    current_json = ""
                    brace_count = 0

                    for line in lines:
                        line = line.strip()
                        if 'MEAL:' in line and brace_count == 0:
                            # Start of a new meal object
                            current_json = ""
                            brace_count = 0
                        elif '"day":' in line and '"mealType":' in line and brace_count == 0:
                            # Start of meal JSON
                            current_json = ""
                            brace_count = 0

                        if line and not line.startswith('MEAL:'):
                            current_json += line + "\n"
                            brace_count += line.count('{') - line.count('}')

                            # If we have a complete object
                            if brace_count == 0 and current_json.strip() and '"day":' in current_json and '"mealType":' in current_json:
                                try:
                                    # Clean and parse the JSON
                                    clean_json = current_json.strip()
                                    if not clean_json.startswith('{'):
                                        clean_json = '{' + clean_json
                                    if not clean_json.endswith('}'):
                                        clean_json = clean_json + '}'

                                    meal_data = json.loads(clean_json)
                                    if 'day' in meal_data and 'mealType' in meal_data and 'meal' in meal_data:
                                        logger.info(f"Line-by-line parsed meal: {meal_data['day']}-{meal_data['mealType']}")
                                        yield f"data: {json.dumps(meal_data)}\n\n"
                                        meals_sent += 1
                                        await asyncio.sleep(0.3)
                                except json.JSONDecodeError as e:
                                    logger.error(f"Line-by-line parsing failed: {e}")
                                    logger.error(f"Problematic JSON: {clean_json[:200]}...")

                                current_json = ""
                                brace_count = 0

            if meals_sent == 0:
                logger.error("No meals were successfully parsed and sent, falling back to batch mode")
                # Fallback to batch generation
                try:
                    logger.info("Attempting fallback to batch generation...")
                    batch_response = client.models.generate_content(
                        model="gemini-3-flash-preview",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )

                    plan = json.loads(batch_response.text)
                    if isinstance(plan, list) and len(plan) > 0:
                        logger.info("Batch fallback successful, streaming individual meals")
                        meal_types = ["Breakfast", "Lunch", "Snack", "Dinner"]
                        for day_data in plan:
                            if isinstance(day_data, dict) and 'day' in day_data and 'meals' in day_data:
                                for meal_type in meal_types:
                                    if meal_type in day_data['meals']:
                                        meal_data = {
                                            "day": day_data['day'],
                                            "mealType": meal_type,
                                            "meal": day_data['meals'][meal_type]
                                        }
                                        logger.info(f"Fallback streaming meal: {day_data['day']}-{meal_type}")
                                        yield f"data: {json.dumps(meal_data)}\n\n"
                                        meals_sent += 1
                                        await asyncio.sleep(0.2)  # Faster for fallback
                    else:
                        raise ValueError("Batch fallback also failed")

                except Exception as fallback_error:
                    logger.error(f"Batch fallback failed: {fallback_error}")
                    error_response = {
                        "type": "error",
                        "error": "Generation Error",
                        "message": "Failed to generate meal plan. Please check your API key configuration.",
                        "code": "GENERATION_ERROR"
                    }
                    yield f"data: {json.dumps(error_response)}\n\n"
            else:
                logger.info(f"Successfully streamed {meals_sent} meals")

            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            logger.info("Successfully completed streaming meal plan generation")

        except Exception as e:
            logger.error(f"Error in streaming generation: {str(e)}")
            error_response = {
                "type": "error",
                "error": "Generation Error",
                "message": str(e),
                "code": "STREAMING_ERROR"
            }
            yield f"data: {json.dumps(error_response)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

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
        1. Analyze the user request and identify which specific meals need to be changed.
        2. {cuisine_instruction}
        3. Maintain these ongoing LIFESTYLE CONSTRAINTS: {request.preferences.generalNotes or "None"}
        4. If the request implies a new preference (e.g., "We hate mushrooms"), apply it to relevant changes.

        IMPORTANT: Return EXACTLY this JSON structure with ONLY the meals that need to be changed:
        {{
          "changes": [
            {{
              "day": "Monday",
              "mealType": "Breakfast",
              "meal": {{"name": "New Meal Name", "description": "Brief description", "notes": "Any notes"}}
            }},
            {{
              "day": "Tuesday",
              "mealType": "Dinner",
              "meal": {{"name": "Another New Meal", "description": "Brief description", "notes": "Any notes"}}
            }}
          ],
          "explanation": "Brief explanation of what changes were made and why"
        }}

        Rules:
        - Only include meals that actually need to be changed
        - Use exact day names: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
        - Use exact meal types: "Breakfast", "Lunch", "Snack", "Dinner"
        - If no changes are needed, return empty changes array: {{"changes": [], "explanation": "No changes needed"}}
        """

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        result = json.loads(response.text)

        # Apply changes as a diff/patch to the current plan
        updated_plan = json.loads(json.dumps(request.currentPlan))  # Deep copy

        for change in result.get("changes", []):
            day_name = change["day"]
            meal_type = change["mealType"]
            new_meal = change["meal"]

            # Find the day in the plan and update the specific meal
            for day_plan in updated_plan:
                if day_plan["day"] == day_name:
                    day_plan["meals"][meal_type] = new_meal
                    break

        logger.info(f"Successfully applied {len(result.get('changes', []))} meal changes")
        return {
            "plan": updated_plan,
            "explanation": result.get("explanation", "Plan updated successfully")
        }

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

@app.post("/api/generate-prep-stream")
async def generate_prep_stream(request: PrepPlanRequest):
    """Streaming version of prep plan generation - returns tasks progressively"""

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

    async def generate_stream():
        try:
            logger.info("Generating streaming prep plan")

            prompt = f"""
            Analyze this meal plan and generate a high-level meal prep strategy. Generate each task individually and clearly.

            Meal Plan:
            {json.dumps(request.mealPlan)}

            Goal:
            - Identify tasks that can be batched on the weekend or the night before.
            - Group similar tasks (e.g., "Chop veggies for Mon/Tue dinners").
            - Keep it simple and actionable.

            IMPORTANT: Generate each task in this exact format, one task at a time:

            TASK: Weekend-1
            {{"day": "Weekend", "task": "Chop vegetables for Monday and Tuesday dinners", "relatedMeals": ["Monday Dinner", "Tuesday Dinner"]}}

            TASK: Sunday Night-1
            {{"day": "Sunday Night", "task": "Marinate chicken for week", "relatedMeals": ["Wednesday Dinner", "Friday Dinner"]}}

            Continue this pattern for all prep tasks.
            Each task must have "day", "task", and "relatedMeals" fields.
            The relatedMeals field MUST be an array of strings, never a single string.
            """

            # Use text mode instead of JSON mode for streaming
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    # Remove JSON mode to allow streaming
                )
            )

            # Parse the response and extract task objects
            response_text = response.text
            logger.info("Received LLM response, parsing prep tasks...")
            logger.info(f"Response text preview: {response_text[:500]}...")

            tasks_sent = 0

            # Strategy 1: Try to parse as complete JSON array first (fallback to task-by-task)
            try:
                tasks = json.loads(response_text)
                if isinstance(tasks, list) and len(tasks) > 0:
                    logger.info("Parsed as complete JSON array, streaming individual tasks")
                    for task_data in tasks:
                        if isinstance(task_data, dict) and 'day' in task_data and 'task' in task_data:
                            logger.info(f"Streaming task: {task_data['day']} - {task_data['task'][:50]}...")
                            yield f"data: {json.dumps(task_data)}\n\n"
                            tasks_sent += 1
                            await asyncio.sleep(0.4)  # Slightly slower for prep tasks
                else:
                    raise ValueError("Not a valid tasks array")
            except (json.JSONDecodeError, ValueError) as e:
                logger.info(f"Complete JSON parsing failed: {e}, trying task-by-task regex extraction...")

                # Strategy 2: Extract individual task objects using regex
                task_pattern = r'TASK: ([^-]+)-(\d+)\s*\n(\{[^{}]*"day"[^{}]*"task"[^{}]*"relatedMeals"[^{}]*\[[^\]]*\][^{}]*\})'
                potential_tasks = re.findall(task_pattern, response_text, re.DOTALL)

                logger.info(f"Found {len(potential_tasks)} potential task objects")

                for i, (day, task_num, task_json) in enumerate(potential_tasks):
                    try:
                        # Clean up the JSON string
                        task_json = task_json.strip()
                        if not task_json.endswith('}'):
                            task_json += '}'

                        task_data = json.loads(task_json)
                        if 'day' in task_data and 'task' in task_data and 'relatedMeals' in task_data:
                            logger.info(f"Successfully parsed and streaming task: {task_data['day']} - {task_data['task'][:50]}...")
                            yield f"data: {json.dumps(task_data)}\n\n"
                            tasks_sent += 1
                            await asyncio.sleep(0.4)
                        else:
                            logger.warning(f"Task object missing required fields: {task_data}")
                    except json.JSONDecodeError as parse_error:
                        logger.error(f"Failed to parse task object {i}: {parse_error}")
                        logger.error(f"Problematic JSON: {task_json[:200]}...")
                        continue

            if tasks_sent == 0:
                logger.error("No tasks were successfully parsed and sent, falling back to batch mode")
                # Fallback to batch generation
                try:
                    logger.info("Attempting fallback to batch generation...")
                    batch_response = client.models.generate_content(
                        model="gemini-3-flash-preview",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )

                    tasks = json.loads(batch_response.text)
                    if isinstance(tasks, list) and len(tasks) > 0:
                        logger.info("Batch fallback successful, streaming individual tasks")
                        for task_data in tasks:
                            if isinstance(task_data, dict) and 'day' in task_data and 'task' in task_data:
                                logger.info(f"Fallback streaming task: {task_data['day']} - {task_data['task'][:50]}...")
                                yield f"data: {json.dumps(task_data)}\n\n"
                                tasks_sent += 1
                                await asyncio.sleep(0.3)  # Faster for fallback
                    else:
                        raise ValueError("Batch fallback also failed")

                except Exception as fallback_error:
                    logger.error(f"Batch fallback failed: {fallback_error}")
                    error_response = {
                        "type": "error",
                        "error": "Generation Error",
                        "message": "Failed to generate prep plan. Please check your API key configuration.",
                        "code": "GENERATION_ERROR"
                    }
                    yield f"data: {json.dumps(error_response)}\n\n"
            else:
                logger.info(f"Successfully streamed {tasks_sent} prep tasks")

            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            logger.info("Successfully completed streaming prep plan generation")

        except Exception as e:
            logger.error(f"Error in streaming prep generation: {str(e)}")
            error_response = {
                "type": "error",
                "error": "Generation Error",
                "message": str(e),
                "code": "STREAMING_ERROR"
            }
            yield f"data: {json.dumps(error_response)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

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

        IMPORTANT: Return EXACTLY this JSON structure:
        [
          {{
            "name": "Tomatoes",
            "category": "Produce",
            "quantity": "2 lbs"
          }},
          {{
            "name": "Chicken Breast",
            "category": "Meat",
            "quantity": "1.5 lbs"
          }},
          {{
            "name": "Milk",
            "category": "Dairy",
            "quantity": "1 gallon"
          }}
        ]

        Each item MUST have:
        - "name": The grocery item name
        - "category": The grocery category (Produce, Meat, Dairy, Pantry, etc.)
        - "quantity": Estimated quantity needed (e.g., "2 lbs", "1 gallon", "3 pieces")
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

@app.post("/api/generate-grocery-stream")
async def generate_grocery_stream(request: GroceryListRequest):
    """Streaming version of grocery list generation - returns items progressively"""

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

    async def generate_stream():
        try:
            logger.info("Generating streaming grocery list")

            prompt = f"""
            Generate a consolidated grocery list based on this meal plan and prep strategy. Generate each item individually and clearly.

            Meal Plan:
            {json.dumps(request.mealPlan)}

            Prep Tasks:
            {json.dumps(request.prepTasks)}

            Rules:
            - Group by category (Produce, Meat, Dairy, Pantry, etc.).
            - Estimate quantities reasonably for a family of 4 (unless context implies otherwise).

            IMPORTANT: Generate each item in this exact format, one item at a time:

            ITEM: Produce-1
            {{"name": "Tomatoes", "category": "Produce", "quantity": "2 lbs"}}

            ITEM: Meat-1
            {{"name": "Chicken Breast", "category": "Meat", "quantity": "1.5 lbs"}}

            ITEM: Dairy-1
            {{"name": "Milk", "category": "Dairy", "quantity": "1 gallon"}}

            Continue this pattern for all grocery items.
            Each item must have "name", "category", and "quantity" fields.
            """

            # Use text mode instead of JSON mode for streaming
            response = client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    # Remove JSON mode to allow streaming
                )
            )

            # Parse the response and extract item objects
            response_text = response.text
            logger.info("Received LLM response, parsing grocery items...")
            logger.info(f"Response text preview: {response_text[:500]}...")

            items_sent = 0

            # Strategy 1: Try to parse as complete JSON array first (fallback to item-by-item)
            try:
                items = json.loads(response_text)
                if isinstance(items, list) and len(items) > 0:
                    logger.info("Parsed as complete JSON array, streaming individual items")
                    for item_data in items:
                        if isinstance(item_data, dict) and 'name' in item_data and 'category' in item_data:
                            logger.info(f"Streaming item: {item_data['category']} - {item_data['name']}")
                            yield f"data: {json.dumps(item_data)}\n\n"
                            items_sent += 1
                            await asyncio.sleep(0.2)  # Faster for grocery items
                else:
                    raise ValueError("Not a valid items array")
            except (json.JSONDecodeError, ValueError) as e:
                logger.info(f"Complete JSON parsing failed: {e}, trying item-by-item regex extraction...")

                # Strategy 2: Extract individual item objects using regex
                item_pattern = r'ITEM: ([^-]+)-(\d+)\s*\n(\{[^{}]*"name"[^{}]*"category"[^{}]*"quantity"[^{}]*\})'
                potential_items = re.findall(item_pattern, response_text, re.DOTALL)

                logger.info(f"Found {len(potential_items)} potential item objects")

                for i, (category, item_num, item_json) in enumerate(potential_items):
                    try:
                        # Clean up the JSON string
                        item_json = item_json.strip()
                        if not item_json.endswith('}'):
                            item_json += '}'

                        item_data = json.loads(item_json)
                        if 'name' in item_data and 'category' in item_data and 'quantity' in item_data:
                            logger.info(f"Successfully parsed and streaming item: {item_data['category']} - {item_data['name']}")
                            yield f"data: {json.dumps(item_data)}\n\n"
                            items_sent += 1
                            await asyncio.sleep(0.2)
                        else:
                            logger.warning(f"Item object missing required fields: {item_data}")
                    except json.JSONDecodeError as parse_error:
                        logger.error(f"Failed to parse item object {i}: {parse_error}")
                        logger.error(f"Problematic JSON: {item_json[:200]}...")
                        continue

            if items_sent == 0:
                logger.error("No items were successfully parsed and sent, falling back to batch mode")
                # Fallback to batch generation
                try:
                    logger.info("Attempting fallback to batch generation...")
                    batch_response = client.models.generate_content(
                        model="gemini-3-flash-preview",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )

                    items = json.loads(batch_response.text)
                    if isinstance(items, list) and len(items) > 0:
                        logger.info("Batch fallback successful, streaming individual items")
                        for item_data in items:
                            if isinstance(item_data, dict) and 'name' in item_data and 'category' in item_data:
                                logger.info(f"Fallback streaming item: {item_data['category']} - {item_data['name']}")
                                yield f"data: {json.dumps(item_data)}\n\n"
                                items_sent += 1
                                await asyncio.sleep(0.15)  # Faster for fallback
                    else:
                        raise ValueError("Batch fallback also failed")

                except Exception as fallback_error:
                    logger.error(f"Batch fallback failed: {fallback_error}")
                    error_response = {
                        "type": "error",
                        "error": "Generation Error",
                        "message": "Failed to generate grocery list. Please check your API key configuration.",
                        "code": "GENERATION_ERROR"
                    }
                    yield f"data: {json.dumps(error_response)}\n\n"
            else:
                logger.info(f"Successfully streamed {items_sent} grocery items")

            # Send completion signal
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"
            logger.info("Successfully completed streaming grocery list generation")

        except Exception as e:
            logger.error(f"Error in streaming grocery generation: {str(e)}")
            error_response = {
                "type": "error",
                "error": "Generation Error",
                "message": str(e),
                "code": "STREAMING_ERROR"
            }
            yield f"data: {json.dumps(error_response)}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
