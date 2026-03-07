from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime


class Event(BaseModel):
    """Event model for rule chaining and event-driven simulation"""
    id: str
    source_rule: str  # ID of rule that generated this event
    timestamp: int  # Time step when event occurred
    event_type: str  # e.g., "storm_start", "emergency_brake", "collision_risk", "rule_conflict"
    payload: Dict[str, Any]  # Event-specific data
    severity: Optional[str] = "normal"  # normal, warning, critical
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization"""
        return {
            "id": self.id,
            "source_rule": self.source_rule,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "payload": self.payload,
            "severity": self.severity,
            "metadata": self.metadata or {}
        }
