from enum import Enum


class Operator(str, Enum):
    LT = "<"
    GT = ">"
    LE = "<="
    GE = ">="
    EQ = "=="
    IN = "in"


class ActionType(str, Enum):
    SET = "set"
    ADD = "add"
    CLAMP = "clamp"
    RECOMMEND = "recommend"
    TRIGGER_RULE = "trigger_rule"  # Chain rule execution
    LOG = "log"                    # Record to explanation audit trail
    SPAWN_EVENT = "spawn_event"    # Activate a named event in state


class ConditionLogic(str, Enum):
    AND = "AND"
    OR = "OR"


class ConflictStrategy(str, Enum):
    PRIORITY = "priority"              # Higher priority rule wins
    LAST_WRITE_WINS = "last_write_wins"  # Last action overwrites
    MERGE = "merge"                    # Attempt to merge (e.g. clamp ranges)
    MANUAL_REVIEW = "manual_review"    # Flag for human review


class Zone(str, Enum):
    """Navigation zones used in harbour_rules.yaml"""
    OPEN_WATER = "open_water"
    HARBOUR_ENTRY = "harbour_entry"
    NO_WAKE_ZONE = "no_wake_zone"
    ESCORT_CORRIDOR = "escort_corridor"
    DOCKING_ZONE = "docking_zone"
