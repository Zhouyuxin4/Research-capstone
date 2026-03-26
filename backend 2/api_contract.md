# API Contract

Base URL: `http://localhost:8000`

## Overview
This API exposes the rule-driven simulation backend to the Unity frontend.
A typical flow is:

1. `POST /sessions` to create a session
2. `POST /sessions/{session_id}/start` to select a scenario
3. `POST /sessions/{session_id}/step` on every player action or tick
4. `GET /sessions/{session_id}/state` / `history` / `rules` for inspection
5. `DELETE /sessions/{session_id}` when the run ends

## Field Naming
Backend responses use `snake_case`. Unity should keep the same naming or map fields consistently.

---

## 1. Health Check
### `GET /health`
Response:
```json
{
  "status": "ok",
  "active_sessions": 1
}
```

## 2. List Scenarios
### `GET /scenarios`
Returns the available scenario presets.

## 3. Create Session
### `POST /sessions`
Request:
```json
{
  "scenario": "default"
}
```
Response:
```json
{
  "session_id": "uuid-string",
  "scenario": "default",
  "state": {}
}
```

## 4. Start / Reinitialize Session
### `POST /sessions/{session_id}/start`
Request:
```json
{
  "scenario": "fog"
}
```
Response contains the new scenario name and initialized state.

## 5. Advance One Step
### `POST /sessions/{session_id}/step`
Request:
```json
{
  "target_speed": 6.0,
  "target_heading": 90.0,
  "emergency_stop": false
}
```
Response:
```json
{
  "time_step": 1,
  "state": {},
  "explanations": [
    {
      "rule_id": "harbour_entry_speed_limit",
      "priority": 50,
      "triggered": true,
      "timestamp": 1,
      "logic_used": "AND",
      "message": "Entering the harbour zone requires slowing to 8 knots.",
      "conditions": [],
      "actions": [],
      "side_effects": [],
      "events_generated": [],
      "triggered_by": null,
      "triggered_rules": [],
      "educational_summary": {}
    }
  ],
  "rules_triggered": ["harbour_entry_speed_limit"]
}
```

### Traceability Logging
Every successful `/step` call appends one JSON record to:

`logs/decision_log.jsonl`

Each line includes:
- `timestamp`
- `session_id`
- `scenario`
- `time_step`
- `input`
- `state_before`
- `state_after`
- `rules_triggered`
- `explanations`

## 6. Reset Session
### `POST /sessions/{session_id}/reset`
Resets the current session back to its initial state for the active scenario.

## 7. Inspect Current State
### `GET /sessions/{session_id}/state`
Returns the current `SystemState`.

## 8. Inspect History
### `GET /sessions/{session_id}/history`
Returns all state snapshots captured so far.

## 9. Inspect Rules
### `GET /sessions/{session_id}/rules`
Returns a summary of all loaded rules for debug UI or panel display.

## 10. Delete Session
### `DELETE /sessions/{session_id}`
Ends the session and removes it from memory.

## Error Handling
- `400`: invalid request or unknown scenario
- `404`: session not found
- `500`: engine execution error
