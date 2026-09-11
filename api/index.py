"""Vercel Python Function entry point.

Vercel's Python runtime looks for an ASGI `app` in files under /api and
serves it directly. This just re-exports the real FastAPI app from
backend/main.py so the same code runs locally (uvicorn) and on Vercel.

Note: Vercel Serverless Functions do not support WebSockets or long-lived
background tasks, so the simulator's `/api/ws/simulation` push loop won't
stream live updates in this deployment -- the rest of the API (plan/apply/
validate/export/etc.) runs the same as locally.
"""
from backend.main import app  # noqa: F401
