import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()
CONFIG_FILE = BASE_DIR / "app_config.json"
DEFAULT_WORK_DIR = str(BASE_DIR)


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"directorio_trabajo": DEFAULT_WORK_DIR}


def save_config(data: dict) -> None:
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_work_dir() -> Path:
    cfg = load_config()
    work_dir = Path(cfg.get("directorio_trabajo", DEFAULT_WORK_DIR))
    work_dir.mkdir(parents=True, exist_ok=True)
    return work_dir
