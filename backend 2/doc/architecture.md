# Architecture Upgrade: From Simple to Production-Grade Rule System

## 🎯 Upgrade Summary

This document describes the major architectural upgrade from a simple rule system to a **production-grade, research-quality** rule-driven simulation framework.

## 📊 Before vs After

### Before (Simple Version)
- ✅ Basic state model (List[AgentState])
- ✅ Simple conditions (field + operator + value)
- ✅ Basic actions (SET, ADD, CLAMP, RECOMMEND)
- ✅ Flat rule structure
- ✅ Simple explanations

### After (Enhanced Version)
- ✅ **Multi-agent support** with Dict[str, AgentState]
- ✅ **Complex conditions** with AND/OR logic, agent-to-agent comparisons
- ✅ **Advanced actions** (TRIGGER_RULE, SPAWN_EVENT, LOG)
- ✅ **Event system** for rule chaining
- ✅ **Conflict resolution** with multiple strategies
- ✅ **Full causal chain tracking** in explanations
- ✅ **Historical snapshots** for replay/rewind
- ✅ **Global metrics** for system-wide tracking

## 🏗️ Key Architectural Changes

### 1. State Model Enhancement

**Before:**
```python
SystemState:
  agents: List[AgentState]
  environment: EnvironmentState
  time_step: int
```

**After:**
```python
SystemState:
  agents: Dict[str, AgentState]  # O(1) lookup, named agents
  environment: EnvironmentState
  global_metrics: Dict[str, float]  # System-wide metrics
  time_step: int
  history: List[StateSnapshot]  # For replay/explanation
```

**Benefits:**
- Named agents enable multi-agent scenarios
- History enables educational replay/rewind
- Global metrics support system-wide rules

### 2. Condition System Enhancement

**Before:**
```python
Condition:
  field: str
  operator: Operator
  value: Union[float, str, bool]
```

**After:**
```python
Condition:
  left: str  # Field path or value
  operator: Operator
  right: Union[str, float, int, bool]  # Value or field path
```

**New Capabilities:**
- Agent-to-agent comparisons: `agents.tugboat.speed > agents.cargo_ship.speed`
- Nested path support: `agents.tugboat_1.position_x`
- AND/OR logic in rules

### 3. Rule Logic Enhancement

**Before:**
- Implicit AND (all conditions must be true)

**After:**
```python
Rule:
  conditions: List[Condition]
  logic: ConditionLogic  # AND or OR
```

**Example:**
```yaml
conditions:
  - left: "agents.tugboat.speed"
    operator: ">"
    right: 15.0
  - left: "environment.visibility"
    operator: "<"
    right: 0.3
logic: "OR"  # At least one condition must be true
```

### 4. Action System Enhancement

**New Action Types:**
- `TRIGGER_RULE`: Chain rule execution
- `SPAWN_EVENT`: Generate events for event-driven simulation
- `LOG`: Record information for audit/explanation

**Enhanced Action:**
```python
Action:
  type: ActionType
  target: str
  value: Optional[Any]
  metadata: Optional[Dict]
  rule_id: Optional[str]  # For TRIGGER_RULE
  event_type: Optional[str]  # For SPAWN_EVENT
  event_payload: Optional[Dict]  # For SPAWN_EVENT
```

### 5. Event System (New)

**Purpose:** Enable rule chaining and event-driven simulation

```python
Event:
  id: str
  source_rule: str
  timestamp: int
  event_type: str
  payload: Dict[str, Any]
  severity: str
```

**Use Case:**
```yaml
# Rule 1: Detects condition and spawns event
action:
  - type: "spawn_event"
    event_type: "collision_risk"
    event_payload:
      agent_id: "tugboat_1"
      risk_level: "high"

# Rule 2: Reacts to event
conditions:
  - left: "events.collision_risk"
    operator: "=="
    right: true
```

### 6. Conflict Resolution (New)

**Purpose:** Handle conflicts when multiple rules modify the same field

```python
ConflictResolution:
  strategy: ConflictStrategy  # priority, last_write_wins, merge, manual_review
  priority_threshold: Optional[int]
  merge_rules: Optional[List[str]]
  manual_review_rules: Optional[List[str]]
```

**Strategies:**
- `PRIORITY`: Higher priority wins (default)
- `LAST_WRITE_WINS`: Last action overwrites
- `MERGE`: Attempt to merge (e.g., clamp ranges)
- `MANUAL_REVIEW`: Flag for human review

### 7. Explanation System Enhancement

**Before:**
```python
Explanation:
  rule_id: str
  triggered: bool
  message: str
  cause: Dict
  effect: Dict
```

**After:**
```python
Explanation:
  rule_id: str
  priority: int
  triggered: bool
  timestamp: int
  
  # Detailed condition evaluation
  conditions_evaluated: List[ConditionEvaluation]
  logic_used: str
  
  # Detailed action application
  actions_applied: List[ActionApplication]
  
  # Side effects and chain reactions
  side_effects: List[str]
  events_generated: List[str]
  conflicts_encountered: List[str]
  
  # Causal chain
  triggered_by: Optional[str]
  triggered_rules: List[str]
  
  # Human-readable
  message: str
  cause: Dict
  effect: Dict
```

**Educational Benefits:**
- Shows **why** rule triggered (condition evaluation details)
- Shows **what** happened (action application details)
- Shows **side effects** (events, triggered rules)
- Shows **causal chain** (what triggered this, what this triggered)

## 📁 New Files

1. **`models/event.py`**: Event model for rule chaining
2. **`models/conflict_resolution.py`**: Conflict resolution models

## 🔄 Migration Guide

### Updating Rules

**Old format:**
```yaml
condition:
  - field: "agent.speed"
    operator: ">"
    value: 15.0
```

**New format:**
```yaml
conditions:
  - left: "agents.tugboat_1.speed"
    operator: ">"
    right: 15.0
logic: "AND"
```

### Updating State

**Old:**
```python
state = SystemState(
    agents=[AgentState(...)],
    environment=EnvironmentState(...),
    time_step=0
)
```

**New:**
```python
state = SystemState(
    agents={"tugboat_1": AgentState(id="tugboat_1", ...)},
    environment=EnvironmentState(...),
    global_metrics={},
    time_step=0,
    history=[]
)
```

## 🎓 Research Contributions

This architecture upgrade enables:

1. **Educational Transparency**: Full causal chain tracking
2. **Multi-Agent Scenarios**: Named agents, agent-to-agent comparisons
3. **Rule Chaining**: Event-driven rule execution
4. **Conflict Analysis**: Transparent conflict resolution
5. **Historical Replay**: State snapshots for educational rewind
6. **Extensibility**: Easy to add new action types, operators, strategies

## 🚀 Next Steps

1. **Update Rule Engine**: Implement evaluation logic for new features
2. **Update YAML Rules**: Migrate existing rules to new format
3. **Implement Event System**: Add event queue and processing
4. **Implement Conflict Resolution**: Add conflict detection and resolution
5. **Update Explanation Generator**: Generate enhanced explanations
6. **Add Tests**: Comprehensive tests for new features

## 📚 References

- See `rules_schema.md` for complete schema documentation
- See individual model files for detailed field descriptions
