from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from config import get_work_dir
import os

router = APIRouter(prefix="/api/files", tags=["files"])

ALLOWED_EXTENSIONS = {".mmd", ".puml"}


def _safe_path(filename: str) -> Path:
    work_dir = get_work_dir()
    path = (work_dir / filename).resolve()
    if not str(path).startswith(str(work_dir.resolve())):
        raise HTTPException(status_code=400, detail="Ruta no permitida")
    return path


class SaveRequest(BaseModel):
    filename: str
    content: str
    diagram_type: str  # "mermaid" | "plantuml"


@router.get("")
def list_files():
    work_dir = get_work_dir()
    files = []
    for ext in ALLOWED_EXTENSIONS:
        for f in work_dir.glob(f"*{ext}"):
            files.append({
                "name": f.name,
                "size": f.stat().st_size,
                "modified": f.stat().st_mtime,
                "type": "mermaid" if ext == ".mmd" else "plantuml",
            })
    files.sort(key=lambda x: x["modified"], reverse=True)
    return files


@router.post("/save")
def save_file(body: SaveRequest):
    ext = ".mmd" if body.diagram_type == "mermaid" else ".puml"
    name = body.filename
    if not name.endswith(ext):
        name = name + ext
    # sanitize filename
    name = Path(name).name
    path = _safe_path(name)
    try:
        path.write_text(body.content, encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar: {e}")
    return {"filename": name, "path": str(path), "ok": True}


@router.get("/load/{filename}")
def load_file(filename: str):
    path = _safe_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    try:
        content = path.read_text(encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer: {e}")
    ext = path.suffix.lower()
    diagram_type = "mermaid" if ext == ".mmd" else "plantuml"
    return {"filename": filename, "content": content, "diagram_type": diagram_type}


@router.delete("/{filename}")
def delete_file(filename: str):
    path = _safe_path(filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    try:
        path.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar: {e}")
    return {"ok": True}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Extensión no permitida. Use: {', '.join(ALLOWED_EXTENSIONS)}")
    name = Path(file.filename).name
    path = _safe_path(name)
    try:
        content = await file.read()
        path.write_bytes(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {e}")
    diagram_type = "mermaid" if ext == ".mmd" else "plantuml"
    return {"filename": name, "content": content.decode("utf-8", errors="replace"), "diagram_type": diagram_type}
