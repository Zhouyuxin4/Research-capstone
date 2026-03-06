from __future__ import annotations
from typing import Any
from models.state import SystemState


def _normalize_path(path: str) -> str:
    """
    Support schema examples like:
      - events.collision_risk   (maps to active_events.collision_risk)
    """
    if path.startswith("events."):
        return "active_events." + path[len("events."):]
    return path


def get_value(state: SystemState, path: str, default: Any = None) -> Any:
    """
    Get nested values using dot-notation paths.
    """
    path = _normalize_path(path)
    parts = path.split(".")
    current: Any = state

    for part in parts:
        if current is None:
            return default

        if isinstance(current, dict):
            current = current.get(part, default)
        else:
            current = getattr(current, part, default)

    return current


def set_value(state: SystemState, path: str, value: Any) -> None:
    """
    Set nested values using dot-notation paths.
    """
    path = _normalize_path(path)
    parts = path.split(".")
    if len(parts) == 1:
        setattr(state, parts[0], value)
        return

    current: Any = state
    for part in parts[:-1]:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            current = getattr(current, part)

        if current is None:
            raise KeyError(f"Cannot set path '{path}': '{part}' is None/missing.")

    last = parts[-1]
    if isinstance(current, dict):
        current[last] = value
    else:
        setattr(current, last, value)


def is_probable_path(s: str) -> bool:
    """
    Decide whether a string is a state path or just a literal string.
    """
    return s.startswith(("agents.", "environment.", "global_metrics.", "active_events.", "events."))