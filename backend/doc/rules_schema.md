# Rules Schema Documentation

## Overview

This document describes the **enhanced, production-grade** schema for the rule-driven simulation system. The system supports:

- ✅ **Multi-agent scenarios** with named agents
- ✅ **Complex condition logic** (AND/OR)
- ✅ **Rule chaining** via events
- ✅ **Conflict resolution** with multiple strategies
- ✅ **Full causal chain tracking** for educational transparency
- ✅ **Historical state snapshots** for replay/rewind
- ✅ **Agent-to-agent comparisons**

## Architecture Overview

```
State (Dict[str, AgentState]) 
  ↓
Rule Evaluation (with AND/OR logic)
  ↓
Action Execution (SET/ADD/CLAMP/RECOMMEND/TRIGGER_RULE/LOG/SPAWN_EVENT)
  ↓
Event Generation (for rule chaining)
  ↓
Conflict Resolution (if needed)
  ↓
Explanation Generation (with full causal chain)
```

## State Model

### SystemState Structure

```python
SystemState:
  agents: Dict[str, AgentState]  # Keyed by agent ID
  environment: EnvironmentState
  global_metrics: Dict[str, float]  # e.g., {"collision_risk": 0.5}
  time_step: int
  history: List[StateSnapshot]  # For replay/explanation
```

### Field Paths

Field paths use **nested dot notation**:

- **Agent fields**: `agents.{agent_id}.{field}`
  - `agents.tugboat_1.speed`
  - `agents.cargo_ship.position_x`
  - `agents.tugboat_1.type`

- **Environment fields**: `environment.{field}`
  - `environment.wind_speed`
  - `environment.visibility`

- **Global metrics**: `global_metrics.{metric_name}`
  - `global_metrics.collision_risk`
  - `global_metrics.total_energy`

## Rule Structure

### Rule Fields

```yaml
id: string                    # Unique identifier
priority: integer             # Higher = executes first
conditions: array             # List of conditions
logic: "AND" | "OR"           # How to combine conditions
action: array                 # Actions to execute
explanation_template: string  # Template for explanation
metadata: object              # Optional metadata (tags, category)
```

### Condition Structure

**Enhanced condition** supporting nested paths and comparisons:

```yaml
left: string                  # Field path or value
operator: string              # "<", ">", "<=", ">=", "==", "in"
right: string | number | bool # Value OR another field path
```

**Key Features**:
- `left` and `right` can both be field paths → enables **agent-to-agent comparisons**
- Example: `agents.tugboat.speed > agents.cargo_ship.speed`

### Condition Logic

Rules support **AND/OR logic**:

```yaml
conditions:
  - left: "agents.tugboat.speed"
    operator: ">"
    right: 15.0
  - left: "environment.visibility"
    operator: "<"
    right: 0.3
logic: "AND"  # Both must be true
# OR
logic: "OR"   # At least one must be true
```

## Action Types

### Basic Actions

#### SET
Directly sets a field to a value.

```yaml
action:
  - type: "set"
    target: "agents.tugboat_1.speed"
    value: 0.0
```

#### ADD
Adds a value to the current field.

```yaml
action:
  - type: "add"
    target: "agents.tugboat_1.speed"
    value: 5.0
```

#### CLAMP
Restricts a field to min/max range.

```yaml
action:
  - type: "clamp"
    target: "agents.tugboat_1.speed"
    min_value: 0.0
    max_value: 15.0
```

#### RECOMMEND
Suggests a value (for educational purposes).

```yaml
action:
  - type: "recommend"
    target: "agents.tugboat_1.speed"
    value: 10.0
```

### Advanced Actions

#### TRIGGER_RULE
Triggers another rule (enables rule chaining).

```yaml
action:
  - type: "trigger_rule"
    rule_id: "emergency_protocol"
    metadata:
      triggered_by: "collision_detection"
```

#### SPAWN_EVENT
Generates an event for event-driven simulation.

```yaml
action:
  - type: "spawn_event"
    event_type: "storm_start"
    event_payload:
      severity: "critical"
      duration: 300
    metadata:
      source: "weather_system"
```

#### LOG
Records information for explanation/audit trail.

```yaml
action:
  - type: "log"
    log_level: "warning"
    log_message: "High wind speed detected"
    target: "global_metrics.warnings"
```

## Event System

Events enable **rule chaining** and **event-driven simulation**.

### Event Structure

```yaml
id: string              # Unique event ID
source_rule: string     # Rule that generated this event
timestamp: integer      # Time step
event_type: string      # "storm_start", "collision_risk", etc.
payload: object         # Event-specific data
severity: string        # "normal", "warning", "critical"
```

### Rule Chaining Example

```yaml
rules:
  - id: "detect_collision_risk"
    priority: 20
    conditions:
      - left: "agents.tugboat_1.position_x"
        operator: ">"
        right: 100.0
    action:
      - type: "spawn_event"
        event_type: "collision_risk"
        event_payload:
          agent_id: "tugboat_1"
          risk_level: "high"
  
  - id: "handle_collision_risk"
    priority: 25
    conditions:
      - left: "events.collision_risk"
        operator: "=="
        right: true
    action:
      - type: "set"
        target: "agents.tugboat_1.speed"
        value: 0.0
      - type: "trigger_rule"
        rule_id: "emergency_protocol"
```

## Conflict Resolution

When multiple rules try to modify the same field, conflicts are resolved using strategies:

### Conflict Strategies

1. **PRIORITY** (default): Higher priority rule wins
2. **LAST_WRITE_WINS**: Last action overwrites previous
3. **MERGE**: Attempt to merge actions (e.g., clamp ranges)
4. **MANUAL_REVIEW**: Flag for human review

### Conflict Record

All conflicts are recorded for explanation:

```python
ConflictRecord:
  timestamp: int
  conflicting_rules: List[str]
  conflicting_actions: List[Action]
  resolution_strategy: ConflictStrategy
  resolution_result: Dict
  resolved: bool
```

## Explanation System

### Enhanced Explanation Structure

```python
Explanation:
  rule_id: str
  priority: int
  triggered: bool
  timestamp: int
  
  # Condition evaluation details
  conditions_evaluated: List[ConditionEvaluation]
  logic_used: str  # "AND" or "OR"
  
  # Action application details
  actions_applied: List[ActionApplication]
  
  # Side effects
  side_effects: List[str]
  events_generated: List[str]
  conflicts_encountered: List[str]
  
  # Causal chain
  triggered_by: Optional[str]  # Rule that triggered this
  triggered_rules: List[str]   # Rules triggered by this
  
  # Human-readable
  message: str
  cause: Dict
  effect: Dict
```

### Educational Format

Explanations can be formatted for educational display, showing:
- **Why** the rule triggered (condition evaluation)
- **What** happened (action application)
- **Side effects** (events, triggered rules)
- **Causal chain** (what triggered this, what this triggered)

## Example: Complex Rule

```yaml
rules:
  - id: "multi_agent_collision_avoidance"
    priority: 30
    conditions:
      - left: "agents.tugboat_1.position_x"
        operator: ">"
        right: 90.0
      - left: "agents.tugboat_1.speed"
        operator: ">"
        right: 10.0
      - left: "agents.cargo_ship.position_x"
        operator: "<"
        right: 110.0
    logic: "AND"  # All conditions must be true
    action:
      - type: "set"
        target: "agents.tugboat_1.speed"
        value: 0.0
      - type: "spawn_event"
        event_type: "collision_avoidance_activated"
        event_payload:
          agent_1: "tugboat_1"
          agent_2: "cargo_ship"
          distance: "{{calculate_distance}}"
      - type: "log"
        log_level: "warning"
        log_message: "Collision avoidance activated between tugboat_1 and cargo_ship"
    explanation_template: "Collision risk detected. Tugboat speed reduced to 0. Distance: {{distance}}"
    metadata:
      category: "safety"
      tags: ["collision", "multi-agent"]
```

## Migration from Simple Schema

### Old Schema → New Schema

| Old | New |
|-----|-----|
| `condition` | `conditions` |
| `field` | `left` |
| `value` | `right` |
| `agent.speed` | `agents.{agent_id}.speed` |
| Implicit AND | Explicit `logic: "AND"` |

### Backward Compatibility

The rule engine should support both formats during migration:
- Old format: `field` + `value` → convert to `left` + `right`
- Old format: `condition` → convert to `conditions` with `logic: "AND"`

## Best Practices

1. **Use descriptive rule IDs**: `collision_avoidance_tugboat_cargo` not `rule_1`
2. **Set appropriate priorities**: Safety rules (20+), warnings (10-19), recommendations (1-9)
3. **Use metadata**: Tag rules for filtering, categorization
4. **Document in explanation_template**: Clear, educational messages
5. **Chain rules via events**: Don't duplicate logic, use event-driven chaining
6. **Record conflicts**: Always log conflicts for transparency
