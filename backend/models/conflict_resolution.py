from pydantic import BaseModel
from typing import Literal, List, Dict, Any, Optional
from .enums import ConflictStrategy
from .action import Action


class ConflictResolution(BaseModel):
    """Conflict resolution configuration for handling rule conflicts"""
    strategy: ConflictStrategy = ConflictStrategy.PRIORITY
    priority_threshold: Optional[int] = None  # Minimum priority difference to auto-resolve
    merge_rules: Optional[List[str]] = None  # Rules that can be merged
    manual_review_rules: Optional[List[str]] = None  # Rules requiring manual review


class ConflictRecord(BaseModel):
    """Record of a conflict that occurred during rule execution"""
    timestamp: int
    conflicting_rules: List[str]  # Rule IDs involved in conflict
    conflicting_actions: List[Action]  # Actions that conflicted
    resolution_strategy: ConflictStrategy
    resolution_result: Dict[str, Any]  # How conflict was resolved
    resolved: bool = False
