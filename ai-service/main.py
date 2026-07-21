from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai
from typing import Optional, Literal
import json
import os
import asyncio

# Load environment variables from .env (local dev only — Render injects these directly in prod)
load_dotenv()

app = FastAPI(title="AI Study Assistant Microservice")


@app.get("/")
def read_root():
    return {"status": "AI Microservice is awake and running!"}


# Fail loudly at startup if the key is missing, instead of discovering it mid-request
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("GEMINI_API_KEY is missing from the environment!")

client = genai.Client(api_key=api_key)


# --- Pydantic schemas ---

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
        description="The target educational level for the vocabulary and complexity.",
    )


# --- Config ---

GEMINI_MODEL = "gemini-3.5-flash"
GEMINI_TIMEOUT_SECONDS = 30.0
MAX_INPUT_CHARACTERS = 20000


# --- Generation endpoint ---

@app.post("/generate-flashcards", response_model=FlashcardDeck)
async def generate_flashcards(req: GenerateRequest):
    print("Request received by Python microservice!")

    if not req.text and not req.topic:
        raise HTTPException(status_code=400, detail="You must provide either 'text' or 'topic'.")

    if req.text and len(req.text) > MAX_INPUT_CHARACTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Text is too long ({len(req.text)} characters). Please limit input to {MAX_INPUT_CHARACTERS} characters.",
        )

    try:
        base_instructions = (
            f"Target Audience: A {req.level} student. Adjust your vocabulary and the depth of "
            f"the concepts to perfectly match this educational level.\n\n"
        )

        if req.text and req.topic:
            prompt = base_instructions + (
                f"Task: Create a comprehensive set of flashcards focused strictly on the topic "
                f"of '{req.topic}'. ONLY use the following text as your source material:\n\n{req.text}"
            )
        elif req.text:
            prompt = base_instructions + (
                f"Task: Create a comprehensive set of flashcards summarizing the following text:\n\n{req.text}"
            )
        else:
            prompt = base_instructions + (
                f"Task: Generate a comprehensive, educational set of study flashcards covering "
                f"the topic: '{req.topic}'. Ensure the information is accurate and structured."
            )

        print(f"Prompt prepared. Length: {len(prompt)} characters. Calling Gemini API...")

        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": FlashcardDeck,
                    "temperature": 0.3,
                },
            ),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )

        print("Response successfully received from Gemini!")

        return json.loads(response.text)

    except asyncio.TimeoutError:
        print(f"[ERROR] TIMEOUT: Gemini did not respond within {GEMINI_TIMEOUT_SECONDS}s.")
        raise HTTPException(
            status_code=504,
            detail="The AI service took too long to respond. Please try again in a moment.",
        )
    except Exception as e:
        print("[ERROR] GEMINI API FAILED:", str(e))
        raise HTTPException(status_code=500, detail=str(e))