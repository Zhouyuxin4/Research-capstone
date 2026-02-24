from pydantic import BaseModel
from typing import Optional, Any, Dict
from .enums import ActionType


class Action(BaseModel):
    """Enhanced action supporting complex operations and rule chaining"""
    type: ActionType
    target: str  # e.g. "agents.tugboat.speed" or "global_metrics.collision_risk"
    value: Optional[Any] = None  # Can be float, str, bool, etc.
    min_value: Optional[float] = None  # For CLAMP action
    max_value: Optional[float] = None  # For CLAMP action
    metadata: Optional[Dict[str, Any]] = None  # Additional action metadata
    
    # For TRIGGER_RULE action
    rule_id: Optional[str] = None  # ID of rule to trigger
    
    # For SPAWN_EVENT action
    event_type: Optional[str] = None  # Type of event to spawn
    event_payload: Optional[Dict[str, Any]] = None  # Event data
    
    # For LOG action
    log_level: Optional[str] = "info"  # info, warning, error
    log_message: Optional[str] = None
