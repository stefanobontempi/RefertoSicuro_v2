"""
Auth Service API Router
"""

from fastapi import APIRouter

from app.api.v1 import auth, sessions, users

# Create main router
router = APIRouter()

# Include v1 routers
router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

router.include_router(
    sessions.router,
    prefix="/sessions",
    tags=["Sessions"]
)

router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"]
)