from pydantic import BaseModel
from typing import List, Dict, Optional
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .rule import Rule


class AgentState(BaseModel):
    id: str
    type: str  # tugboat / cargo_ship
    position_x: float
    position_y: float
    speed: float
    heading: float  # angle in degrees
    metadata: Optional[Dict] = None


class EnvironmentState(BaseModel):
    wind_speed: float
    wind_direction: float
    visibility: float  # in km
    zone: str = "open_water"  # current navigation zone (matches Zone enum values)
    berth_heading: Optional[float] = None  # target heading for berth alignment (degrees)
    metadata: Optional[Dict] = None


class StateSnapshot(BaseModel):
    """Immutable snapshot of system state at a specific time step (for history/replay)"""
    timestamp: int
    agents: Dict[str, AgentState]
    environment: EnvironmentState
    global_metrics: Dict[str, float]
    active_events: Dict[str, bool]  # which events were active at this time
    rules_triggered: List[str]  # rule IDs triggered at this time step


class SystemState(BaseModel):
    """
    Full mutable system state.

    agents          — named agents (tugboat, cargo_ship …)
    environment     — environmental conditions + current zone
    global_metrics  — numeric metrics shared across agents
    active_events   — events that are currently active (persist until cleared)
    time_step       — current simulation tick
    history         — list of past snapshots for replay / explanation rewind
    """
    agents: Dict[str, AgentState]
    environment: EnvironmentState
    global_metrics: Dict[str, float]
    active_events: Dict[str, bool] = {}  # keyed by event_type
    time_step: int = 0
    history: List[StateSnapshot] = []

    def create_snapshot(self, rules_triggered: Optional[List[str]] = None) -> StateSnapshot:
        """Capture current state into an immutable snapshot"""
        return StateSnapshot(
            timestamp=self.time_step,
            agents=dict(self.agents),
            environment=self.environment,
            global_metrics=dict(self.global_metrics),
            active_events=dict(self.active_events),
            rules_triggered=rules_triggered or [],
        )
