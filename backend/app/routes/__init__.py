from .auth import router as auth_router
from .catalog import router as catalog_router
from .inquiries import router as inquiries_router
from .reading_room import router as reading_room_router

__all__ = ["auth_router", "catalog_router", "inquiries_router", "reading_room_router"]



