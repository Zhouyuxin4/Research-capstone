from __future__ import annotations
from dataclasses import dataclass
from typing import Any, List

from models.rule import Rule, Condition
from models.state import SystemState
from models.enums import Operator, ConditionLogic
from models.explanation import ConditionEvaluation
from .utils import get_value, is_probable_path


@dataclass
class RuleEvalResult:
    rule: Rule
    triggered: bool
    condition_evals: List[ConditionEvaluation]


def resolve_operand(state: SystemState, operand: Any) -> Any:
    """
    If operand is a path-like string (agents./environment./global_metrics./events),
    resolve it; otherwise return as-is.
    """
    if isinstance(operand, str) and is_probable_path(operand):
        return get_value(state, operand)
    return operand


def evaluate_condition(state: SystemState, cond: Condition) -> ConditionEvaluation:
    left_val = resolve_operand(state, cond.left)
    right_val = resolve_operand(state, cond.right)

    op = cond.operator
    result = False

    try:
        if op == Operator.GT:
            result = left_val > right_val
        elif op == Operator.LT:
            result = left_val < right_val
        elif op == Operator.GE:
            result = left_val >= right_val
        elif op == Operator.LE:
            result = left_val <= right_val
        elif op == Operator.EQ:
            result = left_val == right_val
        elif op == Operator.IN:
            # Example: left in ["a","b"] or left in "open_water"
            result = left_val in right_val
        else:
            result = False
        msg = f"Evaluated: {cond.left} ({left_val}) {cond.operator.value} {cond.right} ({right_val}) -> {result}"
    except Exception as e:
        result = False
        msg = f"Condition error: {cond.left} {cond.operator.value} {cond.right} | left={left_val}, right={right_val}, err={e}"

    return ConditionEvaluation(
        condition=cond,
        left_value=left_val,
        right_value=right_val,
        result=result,
        message=msg,
    )


def evaluate_rule(state: SystemState, rule: Rule) -> RuleEvalResult:
    evals = [evaluate_condition(state, c) for c in rule.conditions]

    if rule.logic == ConditionLogic.OR:
        triggered = any(e.result for e in evals)
    else:
        triggered = all(e.result for e in evals)

    # store logic_used inside each message? Explanation object will store logic separately
    return RuleEvalResult(rule=rule, triggered=triggered, condition_evals=evals)


def evaluate_all_rules(state: SystemState, rules: List[Rule]) -> List[RuleEvalResult]:
    results = [evaluate_rule(state, r) for r in rules]
    triggered = [res for res in results if res.triggered]
    triggered.sort(key=lambda x: x.rule.priority, reverse=True)
    return triggered
