"""
session.py
==========
In-memory session manager for the simulation backend.

A "session" represents one museum visitor's run of the simulation.
Multiple sessions can coexist (e.g. multiple exhibit terminals).

Each session holds:
  - its own SystemState          (so visitors don't interfere)
  - its own RuleEngine instance  (same rules, isolated state)
  - a scenario name              (which variant was loaded)
"""

import uuid
import logging
from typing import Dict, Optional
from dataclasses import dataclass, field

from models.state import SystemState
from rule_engine import RuleEngine
from scenarios.vancouver_harbor import (
    create_initial_state,
    create_fog_scenario,
    create_docking_scenario,
    create_emergency_scenario,
)

logger = logging.getLogger("Session")

SCENARIO_FACTORIES = {
    "default":   create_initial_state,
    "fog":       create_fog_scenario,
    "docking":   create_docking_scenario,
    "emergency": create_emergency_scenario,
}

RULES_PATH = "rules/harbor_rules.yaml"


@dataclass
class Session:
    session_id: str
    scenario: str
    engine: RuleEngine
    state: SystemState


class SessionManager:
    """Thread-safe (single-threaded FastAPI) session store."""

    def __init__(self) -> None:
        self._sessions: Dict[str, Session] = {}

    # ------------------------------------------------------------------
    def create(self, scenario: str = "default") -> Session:
        if scenario not in SCENARIO_FACTORIES:
            raise ValueError(
                f"Unknown scenario {scenario!r}. "
                f"Available: {list(SCENARIO_FACTORIES)}"
            )
        session_id = str(uuid.uuid4())
        engine = RuleEngine(RULES_PATH)
        state = SCENARIO_FACTORIES[scenario]()
        session = Session(
            session_id=session_id,
            scenario=scenario,
            engine=engine,
            state=state,
        )
        self._sessions[session_id] = session
        logger.info("Created session %s (scenario=%s)", session_id, scenario)
        return session

    # ------------------------------------------------------------------
    def get(self, session_id: str) -> Optional[Session]:
        return self._sessions.get(session_id)

    def require(self, session_id: str) -> Session:
        session = self.get(session_id)
        if session is None:
            raise KeyError(f"Session not found: {session_id!r}")
        return session

    # ------------------------------------------------------------------
    def reset(self, session_id: str) -> Session:
        session = self.require(session_id)
        session.state = SCENARIO_FACTORIES[session.scenario]()
        logger.info("Reset session %s", session_id)
        return session

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    # ------------------------------------------------------------------
    @property
    def active_count(self) -> int:
        return len(self._sessions)
