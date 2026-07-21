from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from typing import Optional, Literal
import json
import os

# Get environement variables from .env
load_dotenv()

# Initialize API and Gemini client
app = FastAPI(title="AI Study Assistant Microservice")
@app.get("/")
def read_root():
    return {"status": "AI Microservice is awake and running!"}

# Force the app to check for the key immediately
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("GEMINI_API_KEY is missing from the environment!")

# Initialize Gemini client explicitly
client = genai.Client(api_key=api_key)

# Strict Pydantic schemas for LLM output
class Flashcard(BaseModel):
    front: str = Field(description="The question or concept on the front of the flashcard.")
    back: str = Field(description="The clear, concise answer on the back.")

class FlashcardDeck(BaseModel):
    cards: list[Flashcard] = Field(description="List of generated flashcards.")

class GenerateRequest(BaseModel):
    text: Optional[str] = Field(None, description="Study notes or textbook text")
    topic: Optional[str] = Field(None, description="A general topic to generate flashcards from scratch")
    level: Literal["Elementary", "Middle School", "High School", "University"] = Field(
        default="University",
        description="The target educational level for the vocabulary and complexity."
    )


# Generation Endpoint
@app.post("/generate-flashcards", response_model=FlashcardDeck)
def generate_flashcards(req: GenerateRequest):
    print("Request received by Python microservice!")
    # Check they provided at least one option
    if not req.text and not req.topic:
        raise HTTPException(status_code=400, detail="You must provide either 'text' or 'topic'.")
    try:
        # Prompt for educational level
        base_instructions = f"Target Audience: A {req.level} student. Adjust your vocabulary and the depth of the concepts to perfectly match this educational level.\n\n"
        if req.text and req.topic:
            prompt = base_instructions + f"Task: Create a comprehensive set of flashcards focused strictly on the topic of '{req.topic}'. ONLY use the following text as your source material:\n\n{req.text}"
        elif req.text:
            prompt = base_instructions + f"Task: Create a comprehensive set of flashcards summarizing the following text:\n\n{req.text}"
        else:
            prompt = base_instructions + f"Task: Generate a comprehensive, educational set of study flashcards covering the topic: '{req.topic}'. Ensure the information is accurate and structured."

        print("Prompt prepared. Calling Gemini API now...")

        # Notice the 'await' and 'client.aio.models' 
        response = await client.aio.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": FlashcardDeck,
                "temperature": 0.3
            }
        )

        print("Response successfully received from Gemini!")

        # AI returns JSON string, so we parse it into a python dict before it goes to client
        return json.loads(response.text)
    except Exception as e:
        print("🚨 [ERROR] GEMINI API FAILED:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))