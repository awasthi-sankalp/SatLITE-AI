"""
SatQuery AI — FastAPI Backend Entry Point
Agentic Remote Sensing Vision-Language Assistant
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from agent.controller import router as analyze_router

load_dotenv()

app = FastAPI(
    title="SatQuery AI Backend",
    description="Agentic VLM backend for remote sensing image analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://satliteai.vercel.app",
        os.getenv("NEXT_PUBLIC_APP_URL", "*"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SatQuery AI Backend"}

