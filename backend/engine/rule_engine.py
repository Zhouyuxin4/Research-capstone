from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple

from models.state import SystemState
from models.rule import Rule
from models.input import UserInput
from models.explanation import Explanation

from .evaluator import evaluate_all_rules
from .executor import apply_action, render_template


class RuleEngine:
    def __init__(self, rules: List[Rule]):
        self.rules = rules

    def _merge_user_input(self, state: SystemState, user_input: Optional[UserInput]) -> None:
        """
        Optional: apply user inputs into state before evaluating rules.
        Keep it simple:
          - if target_speed given -> set tugboat speed
          - if emergency_stop -> set tugboat speed to 0
        """
        if not user_input:
            return

        if user_input.emergency_stop:
            state.agents["tugboat"].speed = 0.0

        if user_input.target_speed is not None:
            state.agents["tugboat"].speed = float(user_input.target_speed)

        if user_input.target_heading is not None:
            state.agents["tugboat"].heading = float(user_input.target_heading)

    def step(self, state: SystemState, user_input: Optional[UserInput] = None) -> Tuple[SystemState, Optional[Explanation]]:
        """
        One simulation tick:
          1) merge input
          2) evaluate all rules
          3) select highest priority rule (MVP)
          4) apply its actions
          5) produce Explanation
          6) snapshot + increment time
        """
        # 1) Merge input into state
        self._merge_user_input(state, user_input)

        # 2) Evaluate rules
        triggered = evaluate_all_rules(state, self.rules)
        if not triggered:
            # even if no rule triggers, still advance time + snapshot (optional)
            snapshot = state.create_snapshot([])
            state.history.append(snapshot)
            state.time_step += 1
            return state, None

        selected = triggered[0]  # MVP: highest priority rule only
        rule = selected.rule

        # 3) Execute actions
        actions_applied = []
        side_effects_msgs: List[str] = []
        events_generated: List[str] = []
        triggered_rules_chain: List[str] = []
        conflicts_encountered: List[str] = []  # MVP empty

        # Track effects summary
        effect_changes: Dict[str, Any] = {}

        for act in rule.action:
            record, effects = apply_action(state, act, source_rule_id=rule.id)
            actions_applied.append(record)

            # side effects: logs
            for log in effects["logs"]:
                side_effects_msgs.append(f"LOG[{log['level']}]: {log['message']}")

            # side effects: events
            for ev in effects["events"]:
                events_generated.append(ev.id)
                side_effects_msgs.append(f"Spawned event: {ev.event_type} (id={ev.id})")

            # chain
            for rid in effects["triggered_rules"]:
                triggered_rules_chain.append(rid)
                side_effects_msgs.append(f"Triggered rule: {rid}")

            # recommendations
            for rec in effects["recommendations"]:
                side_effects_msgs.append(f"Recommendation: {rec['target']} -> {rec['value']}")

            # effect summary (only for actions that change a target)
            if record.success and record.target_old_value != record.target_new_value and act.type.value in ("set", "add", "clamp"):
                effect_changes[act.target] = {"from": record.target_old_value, "to": record.target_new_value}

        # 4) Explanation message
        message = render_template(rule.explanation_template, state)

        # 5) Build Explanation object (your teammate’s model)
        explanation = Explanation(
            rule_id=rule.id,
            priority=rule.priority,
            triggered=True,
            timestamp=state.time_step,
            conditions_evaluated=selected.condition_evals,
            logic_used=rule.logic.value,
            actions_applied=actions_applied,
            side_effects=side_effects_msgs,
            events_generated=events_generated,
            conflicts_encountered=conflicts_encountered,
            message=message,
            cause={
                "rule_selected_by": "priority",
                "triggered_rules_sorted": [t.rule.id for t in triggered],
                "selected_rule": rule.id,
            },
            effect={
                "state_changes": effect_changes,
                "events": events_generated,
                "triggered_rules": triggered_rules_chain,
            },
            triggered_by=None,
            triggered_rules=triggered_rules_chain,
        )

        # 6) Snapshot + increment time
        snapshot = state.create_snapshot([rule.id])
        state.history.append(snapshot)
        state.time_step += 1

        # Optional global metrics counters (if you want):
        if "rules_triggered_count" in state.global_metrics:
            state.global_metrics["rules_triggered_count"] += 1.0
        if "decision_count" in state.global_metrics:
            state.global_metrics["decision_count"] += 1.0

        return state, explanation
    