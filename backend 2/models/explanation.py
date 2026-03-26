from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from .rule import Condition
from .action import Action


class ConditionEvaluation(BaseModel):
    """Record of how a condition was evaluated"""
    condition: Condition
    left_value: Any  # Actual value of left side
    right_value: Any  # Actual value of right side
    result: bool  # Whether condition was satisfied
    message: str  # Human-readable explanation


class ActionApplication(BaseModel):
    """Record of an action that was applied"""
    action: Action
    target_old_value: Any  # Value before action
    target_new_value: Any  # Value after action
    success: bool  # Whether action was successfully applied
    message: str  # Human-readable explanation


class Explanation(BaseModel):
    """Enhanced explanation with full causal chain for educational transparency"""
    rule_id: str
    priority: int
    triggered: bool
    timestamp: int
    
    # Condition evaluation details
    conditions_evaluated: List[ConditionEvaluation]
    logic_used: str  # "AND" or "OR"
    
    # Action application details
    actions_applied: List[ActionApplication]
    
    # Side effects and chain reactions
    side_effects: List[str]  # e.g., "Triggered rule R2", "Spawned event E1"
    events_generated: List[str]  # Event IDs generated
    
    # Conflicts
    conflicts_encountered: List[str]  # Conflict record IDs
    
    # Human-readable message
    message: str
    cause: Dict[str, Any]  # What caused this rule to trigger
    effect: Dict[str, Any]  # What effects this rule had
    
    # Causal chain (for rule chaining visualization)
    triggered_by: Optional[str] = None  # Rule ID that triggered this rule
    triggered_rules: List[str] = []  # Rule IDs triggered by this rule
    
    def to_educational_format(self) -> Dict[str, Any]:
        """Format explanation for educational display"""
        return {
            "rule_id": self.rule_id,
            "priority": self.priority,
            "triggered": self.triggered,
            "when": f"Time step {self.timestamp}",
            "why": {
                "conditions": [
                    {
                        "condition": f"{ce.condition.left} {ce.condition.operator} {ce.condition.right}",
                        "actual_values": f"{ce.left_value} vs {ce.right_value}",
                        "result": ce.result,
                        "explanation": ce.message
                    }
                    for ce in self.conditions_evaluated
                ],
                "logic": self.logic_used
            },
            "what_happened": {
                "actions": [
                    {
                        "action": aa.action.type,
                        "target": aa.action.target,
                        "changed_from": aa.target_old_value,
                        "changed_to": aa.target_new_value,
                        "explanation": aa.message
                    }
                    for aa in self.actions_applied
                ]
            },
            "side_effects": self.side_effects,
            "causal_chain": {
                "triggered_by": self.triggered_by,
                "triggered_rules": self.triggered_rules,
                "events": self.events_generated
            },
            "message": self.message
        }

