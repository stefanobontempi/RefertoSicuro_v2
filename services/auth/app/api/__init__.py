"""
Auth Service API Router
"""

from app.api.v1 import auth
from fastapi import APIRouter

# Temporarily disabled until schemas are complete
# from app.api.v1 import sessions, users

# Create main router
router = APIRouter()

# Include v1 routers
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Temporarily disabled
# router.include_router(
#     sessions.router,
#     prefix="/sessions",
#     tags=["Sessions"]
# )
#
# router.include_router(
#     users.router,
#     prefix="/users",
#     tags=["Users"]
# )
