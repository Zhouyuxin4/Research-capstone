from pydantic import BaseModel
from typing import List, Union, Literal
from .action import Action
from .enums import Operator, ConditionLogic


class Condition(BaseModel):
    """Enhanced condition supporting nested paths and agent-to-agent comparisons"""
    left: str  # e.g. "agents.tugboat.speed" or "environment.wind_speed"
    operator: Operator
    right: Union[str, float, int, bool]  # Can be value or another field path for comparison
    # If right is a field path (starts with "agents." or "environment."), 
    # it enables agent-to-agent or agent-to-environment comparisons


class Rule(BaseModel):
    """Enhanced rule supporting complex logic and rule chaining"""
    id: str
    priority: int
    conditions: List[Condition]  # Renamed from 'condition' for clarity
    logic: ConditionLogic = ConditionLogic.AND  # AND/OR logic for conditions
    action: List[Action]
    explanation_template: str
    metadata: dict = {}  # Additional rule metadata (tags, category, etc.)
    
    def evaluate_conditions(self, state: "SystemState") -> bool:
        """
        Evaluate all conditions based on logic (AND/OR).
        This is a helper method - actual evaluation should be in rule engine.
        """
        # This is a placeholder - actual implementation in rule engine
        pass
