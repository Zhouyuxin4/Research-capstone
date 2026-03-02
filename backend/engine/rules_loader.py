from __future__ import annotations
from typing import List
import yaml

from models.rule import Rule


def load_rules(yaml_path: str) -> List[Rule]:
    """
    Load rules from YAML in the format:
      rules:
        - id: ...
          priority: ...
          conditions: [...]
          logic: "AND"/"OR"
          action: [...]
          explanation_template: ...
    """
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    rules_data = data.get("rules", [])
    rules: List[Rule] = []
    for r in rules_data:
        rules.append(Rule.model_validate(r))
    return rules
