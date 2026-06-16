import os
from pathlib import Path
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from db import init_db
from auth import router as auth_router
from orders import router as orders_router
from admin_api import router as admin_router
from websocket_manager import manager
from visual_search import router as visual_search_router
from stock_alerts import router as stock_alerts_router
from seed import seed_database
from sqlmodel import SQLModel
from db import engine

app = FastAPI(title="ApparelDesk API")

# --- Serve Static Files (Product Images) ---
# Mount the assets directory to serve images
assets_path = Path(__file__).parent / "assets"
assets_path.mkdir(exist_ok=True)  # Ensure directory exists
app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

# --- CORS Middleware ---
# Get frontend URL from environment variable for production
frontend_url = os.getenv("FRONTEND_URL", "")

origins = [
    "http://localhost:8080",  # Your Vite frontend
    "http://127.0.0.1:8080",
    "http://localhost:5173",  # Vite default
    "http://127.0.0.1:5173",
]

# Add production frontend URL if set
if frontend_url:
    origins.append(frontend_url)
    # Also add without trailing slash
    origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)


@app.on_event("startup")
async def on_startup():
    await init_db()
    # Auto-seed the database if it's empty
    await seed_database()

app.include_router(auth_router)
app.include_router(orders_router)
app.include_router(admin_router)
app.include_router(visual_search_router)
app.include_router(stock_alerts_router)

# --- Seed Database Endpoint ---
@app.post("/api/seed")
async def trigger_seed():
    """
    Endpoint to seed the database with initial data.
    Use this after deployment to populate the database.
    """
    try:
        await seed_database()
        return {"message": "Database seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

# --- Reset and Seed Database Endpoint ---
@app.post("/api/reset-and-seed")
async def trigger_reset_and_seed():
    """
    Endpoint to reset the database (drop all tables, recreate them) and then seed with initial data.
    Use this when you've made schema changes and need to reset everything.
    WARNING: This will delete all existing data!
    """
    try:
        # Drop all tables
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.drop_all)
        
        # Recreate all tables
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
        
        # Seed the database
        await seed_database()
        
        return {"message": "Database reset and seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset and seed failed: {str(e)}")

# --- WebSocket Endpoint for Admin ---
@app.websocket("/ws/admin")
async def websocket_endpoint(websocket: WebSocket):
    # In a real app, validate Admin Token in query param here
    # token = websocket.query_params.get("token")
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, maybe listen for admin pings
            await websocket.receive_text()
    except Exception:
        manager.disconnect(websocket)