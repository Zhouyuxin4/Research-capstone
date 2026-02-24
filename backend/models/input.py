from pydantic import BaseModel
from typing import Optional


class UserInput(BaseModel):
    target_speed: Optional[float] = None
    target_heading: Optional[float] = None
    emergency_stop: Optional[bool] = False
