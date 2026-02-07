"""
Supabase Realtime Broadcast service.

Sends broadcast messages to Supabase Realtime channels via the REST API.
This is the server-side push mechanism — when the backend updates a family plan,
it broadcasts the change so all connected family members see it instantly.

Uses the Supabase Broadcast REST API (no WebSocket connection needed from backend).
"""
import os
import logging
import httpx
from typing import Any, Optional

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")


class RealtimeBroadcast:
    """
    Broadcasts plan changes to connected clients via Supabase Realtime.

    Architecture:
    - Backend writes to DB via SQLAlchemy
    - Backend broadcasts change notification via Supabase REST API
    - Frontend Supabase client receives broadcast on the channel
    - Frontend updates UI with new data

    This is fire-and-forget — if the broadcast fails, clients will still
    pick up changes on their next poll or page load. The broadcast is an
    optimization for instant updates, not the source of truth.
    """

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=5.0)
        return self._client

    @property
    def is_configured(self) -> bool:
        return bool(SUPABASE_URL and SUPABASE_ANON_KEY)

    async def broadcast_plan_update(
        self,
        plan_id: str,
        event: str,
        payload: dict[str, Any],
        modified_by: str,
    ) -> bool:
        """
        Broadcast a plan change to all subscribers of the plan's channel.

        Args:
            plan_id: The collaborative plan UUID
            event: Event name (e.g., 'plan_updated', 'meal_replaced')
            payload: The full updated plan state
            modified_by: User ID who made the change

        Returns:
            True if broadcast succeeded, False otherwise (non-fatal)
        """
        if not self.is_configured:
            logger.warning(
                "[Broadcast] Supabase URL or anon key not configured, skipping broadcast"
            )
            return False

        topic = f"family_plan:{plan_id}"
        broadcast_url = f"{SUPABASE_URL}/realtime/v1/api/broadcast"

        message = {
            "messages": [
                {
                    "topic": topic,
                    "event": event,
                    "payload": {
                        **payload,
                        "modified_by": modified_by,
                    },
                }
            ]
        }

        try:
            response = await self.client.post(
                broadcast_url,
                json=message,
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                },
            )

            if response.status_code in (200, 202):
                logger.info(f"[Broadcast] ✓ Sent '{event}' to {topic}")
                return True
            else:
                logger.warning(
                    f"[Broadcast] Unexpected status {response.status_code}: {response.text}"
                )
                return False

        except httpx.TimeoutException:
            logger.warning(f"[Broadcast] Timeout sending to {topic}")
            return False
        except Exception as e:
            logger.warning(f"[Broadcast] Failed to send to {topic}: {e}")
            return False

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton instance
broadcast_service = RealtimeBroadcast()
