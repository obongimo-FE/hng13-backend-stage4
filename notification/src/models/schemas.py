from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum


class NotificationType(str, Enum):
    email = "email"
    push = "push"


class NotificationRequest(BaseModel):
    request_id: str
    notification_type: NotificationType
    user_id: str
    template_code: str
    variables: Dict[str, Any] = {}
    priority: int = 5
    metadata: Optional[Dict[str, Any]] = None


class StatusUpdate(BaseModel):
    notification_id: str
    status: str
    timestamp: Optional[str] = None
    error: Optional[str] = None