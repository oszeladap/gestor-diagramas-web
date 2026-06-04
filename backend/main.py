import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from routers import config_router, files_router, mermaid_router, plantuml_router

app = FastAPI(
    title="Gestor de Diagramas Web",
    description="API para gestión y renderizado de diagramas Mermaid y PlantUML",
    version="1.0.0",
)

_cors_origins = os.environ.get(
    "CORS_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config_router.router)
app.include_router(files_router.router)
app.include_router(mermaid_router.router)
app.include_router(plantuml_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


# Serve Angular frontend in production
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist" / "frontend" / "browser"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
