"""
Application configuration. Loads default setback distances from
config/setbacks.yaml and a couple of environment-driven values
(CORS origins, data directory) so the same image works in Docker
and on a bare local checkout.
"""
import os
from pathlib import Path

import yaml
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("DATA_DIR", BASE_DIR / "data"))
SETBACKS_PATH = Path(os.environ.get("SETBACKS_PATH", BASE_DIR / "config" / "setbacks.yaml"))


class Setbacks(BaseModel):
    wetlands_m: float = 30
    flood_zone_m: float = 0
    transmission_lines_m: float = 30
    buildings_m: float = 5


def load_default_setbacks() -> Setbacks:
    if SETBACKS_PATH.exists():
        with open(SETBACKS_PATH) as f:
            raw = yaml.safe_load(f) or {}
        return Setbacks(**raw)
    return Setbacks()


class Settings(BaseModel):
    cors_origins: list[str] = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(",")
    data_dir: Path = DATA_DIR
    default_setbacks: Setbacks = load_default_setbacks()


settings = Settings()
