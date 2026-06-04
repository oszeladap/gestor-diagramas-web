from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from config import load_config, save_config, get_work_dir

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    directorio_trabajo: str


@router.get("")
def get_config():
    cfg = load_config()
    work_dir = get_work_dir()
    return {
        "directorio_trabajo": str(work_dir),
        "directorio_trabajo_config": cfg.get("directorio_trabajo", ""),
    }


@router.put("")
def update_config(body: ConfigUpdate):
    path = Path(body.directorio_trabajo)
    try:
        path.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo crear el directorio: {e}")
    if not path.is_dir():
        raise HTTPException(status_code=400, detail="La ruta no es un directorio válido")
    cfg = load_config()
    cfg["directorio_trabajo"] = str(path.resolve())
    save_config(cfg)
    return {"directorio_trabajo": str(path.resolve()), "ok": True}
