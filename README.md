# A Decision-Driven, Explainable System Architecture for Interactive Museum Exhibits under Resource Constraints

## 1. Project Overview

This project implements a decision-driven educational simulation system designed to model tugboat navigation scenarios in a transparent and explainable way.

Unlike traditional immersive simulation systems that prioritize visual realism, our architecture emphasizes:

- Explicit rule-based decision logic
- Prioritized rule execution
- Transparent explanation of cause-and-effect
- Lightweight Unity visualization for clarity

The system is designed to foreground educational reasoning rather than high-fidelity rendering.

---

## 2. High-Level Architecture

```
+-------------------+
|    Input Layer    |
+-------------------+
          ↓
+-------------------+
|   Decision Engine |
|  (Rule Evaluation |
|   Explanation)    |
+-------------------+
          ↓
+-------------------+
|   Output Layer    |
+-------------------+
```

### Components

**1. Input Layer**
Receives:
- User actions (e.g., adjust speed, change direction)
- Environmental updates (e.g., vessel distance change)

**2. Decision Engine**
- Evaluates rules
- Resolves conflicts using priority
- Updates system state

**3. Output Layer**
- Updates simulation state
- Sends visual feedback to Unity

**4. Explanation Layer** *(Key Contribution)*
- Identifies which rule was triggered
- Displays why it was triggered
- Explains resulting consequences
- Makes decision logic transparent

---

## 3. Core Data Structures

### 3.1 State Object

Represents the full system condition.

```yaml
State:
  agents:
    tugboat:
      speed: 6 knots
      angle: 15 degrees
      position: (x, y)
    cargo_ship:
      speed: 4 knots
      position: (x, y)

  environment:
    distance_between_vessels: 20 meters
    harbor_zone: docking_area

  system_flags:
    collision_risk: false
    docking_mode: true
```

The state stores all measurable parameters used by rule conditions.

### 3.2 Input Object

Represents user or environment changes.

```yaml
Input:
  type: "adjust_speed"
  value: 8 knots
```

Other input types include:
- `change_angle`
- `activate_docking_mode`
- `sensor_update_distance`

Inputs modify the state and may trigger rule evaluation.

### 3.3 Rule Object

Each rule is modular and contains:

```yaml
Rule:
  id: R3
  priority: 5
  condition:
    - distance_between_vessels < 25
    - tugboat_speed > 7
  action:
    - set collision_risk = true
    - reduce speed to 5
  explanation_template:
    "When the vessel is too close and speed exceeds safe limits,
     collision risk increases."
```

| Attribute | Description |
|---|---|
| `id` | Unique identifier |
| `priority` | Integer (1–5, higher = stronger) |
| `condition` | Logical requirements |
| `action` | State modification |
| `explanation_template` | Human-readable reasoning |

---

## 4. Rule Execution Flow

### Step 1 – Input Received

User increases tugboat speed:
```yaml
Input:
  adjust_speed = 8 knots
```

### Step 2 – State Update
```
tugboat.speed = 8 knots
```

### Step 3 – Rule Evaluation

System evaluates all rules in descending priority order:
```
R1 (priority 3) → not triggered
R2 (priority 4) → not triggered
R3 (priority 5) → condition satisfied
```

### Step 4 – Conflict Resolution

If multiple rules are satisfied:
- Highest priority rule executes first
- Lower priority rules may be skipped or re-evaluated

This ensures deterministic and transparent behavior.

### Step 5 – Action Execution
```
collision_risk = true
tugboat.speed = 5 knots
```

### Step 6 – Explanation Layer Activation

The system generates a structured explanation:

```
Triggered Rule: R3
Reason:
  - Distance below safety threshold
  - Speed above safe limit
Consequence:
  - Collision risk activated
  - Speed automatically reduced
Recommendation:
  - Maintain speed under 6 knots in docking zone
```

Instead of hiding internal logic, the system explicitly exposes the causal chain to the learner.

---

## 5. Educational Design Rationale

**Traditional immersive systems:**
```
Input → Simulation → Output
```
The decision process is hidden (black box).

**Our system:**
```
Input → Rule Evaluation → Prioritized Decision
      → State Change → Explanation
```

**Educational benefits:**
- Makes cause-and-effect explicit
- Encourages reflective reasoning
- Reduces cognitive distraction from excessive visual detail
- Supports transparent learning of domain rules

---

## 6. Scalability

The architecture is modular:
- New rules can be added without redesigning the system
- Agents and metrics are abstracted
- Different maritime scenarios can reuse the same decision engine

To extend the system:
1. Add new rule sets
2. Modify state variables
3. Define new explanation templates

---

## 7. Current Limitations

- Only one primary scenario implemented (Vancouver harbor tugboat case)
- No user study validation yet
- Rule-based system may require expansion for highly dynamic environments

**Future work includes:**
- Scenario expansion
- User testing
- Adaptive rule weighting

---

## 8. Key Contribution

This project demonstrates that:

> **Educational effectiveness can be supported through transparent decision logic and explainable rule systems, without relying on high-fidelity visual simulation.**
