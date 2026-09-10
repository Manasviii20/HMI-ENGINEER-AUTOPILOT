from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router
from backend.api import store

app = FastAPI(
    title="HMI Engineering Autopilot",
    description="AI-driven HMI engineering automation MVP. Uses a neutral, "
                "vendor-agnostic project representation for the demo — see README "
                "for the future EOTE adapter plan.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def _startup():
    store.load_demo()


@app.get("/api/health")
def health():
    return {"status": "ok"}
