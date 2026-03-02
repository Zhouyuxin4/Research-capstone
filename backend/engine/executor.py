from __future__ import annotations
from typing import Any, Dict, Tuple
from uuid import uuid4

from models.action import Action
from models.enums import ActionType
from models.state import SystemState
from models.event import Event
from models.explanation import ActionApplication
from .utils import get_value, set_value


def render_template(template: str, state: SystemState) -> str:
    """
    Minimal template renderer for strings like:
      "Visibility {{environment.visibility}} is low."
    Replaces {{path}} with get_value(state, path).
    """
    out = template
    while "{{" in out and "}}" in out:
        start = out.index("{{")
        end = out.index("}}", start)
        expr = out[start + 2 : end].strip()
        val = get_value(state, expr, default="N/A")
        out = out[:start] + str(val) + out[end + 2 :]
    return out


def apply_action(state: SystemState, action: Action, source_rule_id: str) -> Tuple[ActionApplication, Dict[str, Any]]:
    """
    Applies ONE action.
    Returns:
      (ActionApplication record, side_effect dict)
    """
    side_effects: Dict[str, Any] = {"events": [], "logs": [], "triggered_rules": [], "recommendations": []}
    atype = action.type

    # Some actions may not have meaningful target updates (recommend/log/spawn_event)
    old_val = get_value(state, action.target) if action.target else None
    new_val = old_val
    success = True
    msg = ""

    try:
        if atype == ActionType.SET:
            new_val = action.value
            set_value(state, action.target, new_val)
            msg = f"SET {action.target}: {old_val} -> {new_val}"

        elif atype == ActionType.ADD:
            if old_val is None:
                old_val = 0
            new_val = old_val + (action.value or 0)
            set_value(state, action.target, new_val)
            msg = f"ADD {action.target}: {old_val} + {action.value} -> {new_val}"

        elif atype == ActionType.CLAMP:
            v = old_val
            if v is None:
                v = 0
            if action.min_value is not None:
                v = max(action.min_value, v)
            if action.max_value is not None:
                v = min(action.max_value, v)
            new_val = v
            set_value(state, action.target, new_val)
            msg = f"CLAMP {action.target}: {old_val} -> {new_val} (min={action.min_value}, max={action.max_value})"

        elif atype == ActionType.RECOMMEND:
            # Do not mutate state; record recommendation
            side_effects["recommendations"].append(
                {"target": action.target, "value": action.value, "metadata": action.metadata or {}}
            )
            msg = f"RECOMMEND {action.target}: {action.value}"
            new_val = old_val

        elif atype == ActionType.LOG:
            side_effects["logs"].append(
                {"level": action.log_level, "message": action.log_message, "target": action.target}
            )
            msg = f"LOG({action.log_level}): {action.log_message}"
            new_val = old_val

        elif atype == ActionType.SPAWN_EVENT:
            ev = Event(
                id=str(uuid4()),
                source_rule=source_rule_id,
                timestamp=state.time_step,
                event_type=action.event_type or "unknown_event",
                payload=action.event_payload or {},
                severity=(action.metadata or {}).get("severity", "normal"),
                metadata=action.metadata,
            )
            # mark active
            state.active_events[ev.event_type] = True
            side_effects["events"].append(ev)
            msg = f"SPAWN_EVENT {ev.event_type} (id={ev.id})"
            new_val = old_val

        elif atype == ActionType.TRIGGER_RULE:
            if action.rule_id:
                side_effects["triggered_rules"].append(action.rule_id)
                msg = f"TRIGGER_RULE {action.rule_id}"
            else:
                success = False
                msg = "TRIGGER_RULE missing rule_id"
            new_val = old_val

        else:
            success = False
            msg = f"Unknown action type: {atype}"
            new_val = old_val

    except Exception as e:
        success = False
        msg = f"Action error ({atype}): {e}"
        new_val = old_val

    record = ActionApplication(
        action=action,
        target_old_value=old_val,
        target_new_value=new_val,
        success=success,
        message=msg,
    )
    return record, side_effects
