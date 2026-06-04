from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from pathlib import Path
import subprocess
import tempfile
import os
import re
import base64
import shutil

router = APIRouter(prefix="/api/plantuml", tags=["plantuml"])

BASE_DIR = Path(__file__).parent.parent.resolve()
PLANTUML_JAR = BASE_DIR / "plantuml.jar"

PAGE_SIZES = {
    "A4": (794, 1123),
    "A3": (1123, 1587),
    "A5": (559, 794),
    "Letter": (816, 1056),
    "Legal": (816, 1344),
    "Custom": None,
}


def _find_java() -> str:
    # Search in known locations, prefer higher versions (sorted reverse)
    search_roots = [
        r"C:\Program Files\Java",
        r"C:\Program Files\Eclipse Adoptium",
        r"C:\Program Files\Microsoft",
        r"C:\Program Files\Eclipse Foundation",
        r"C:\Program Files\OpenJDK",
        r"C:\Program Files\BellSoft",
        r"C:\Program Files\Amazon Corretto",
        r"C:\Program Files (x86)\Java",
    ]
    candidates: list[tuple[str, Path]] = []
    for root in search_roots:
        p = Path(root)
        if not p.exists():
            continue
        for jdk in p.iterdir():
            jexe = jdk / "bin" / "java.exe"
            if jexe.exists():
                candidates.append((jdk.name, jexe))

    # Sort: put JDK 11+ first (class file 55+), higher version first
    def _version_key(name: str) -> int:
        import re
        m = re.search(r"(\d+)", name)
        return int(m.group(1)) if m else 0

    candidates.sort(key=lambda x: _version_key(x[0]), reverse=True)
    for name, jexe in candidates:
        v = _version_key(name)
        if v >= 11:
            return str(jexe)

    # Fallback: java on PATH
    java = shutil.which("java")
    if java:
        return java

    raise FileNotFoundError(
        "Java 11+ no encontrado. Instale JDK 11 o superior. "
        "JDK 21 detectado en: C:\\Program Files\\Java\\jdk-21.0.11"
    )


def _check_plantuml():
    if not PLANTUML_JAR.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                "plantuml.jar no encontrado. Descargue plantuml.jar desde "
                "https://plantuml.com/download y colóquelo en la carpeta backend/"
            ),
        )


class RenderRequest(BaseModel):
    code: str
    format: str = "png"  # png | svg | jpg
    page_size: str = "A4"
    background_color: str = "#FFFFFF"
    width: int = 0
    height: int = 0
    dpi: int = 150


class ValidateRequest(BaseModel):
    code: str


PLANTUML_KEYWORDS = [
    "@startuml", "@startmindmap", "@startsalt", "@startjson", "@startgantt",
    "@startwbs", "@startboard", "@startchronology",
]


def _validate_code(code: str) -> tuple[bool, list[str], list[str]]:
    errors = []
    warnings = []
    stripped = code.strip()

    if not stripped:
        errors.append("El código no puede estar vacío")
        return False, errors, warnings

    lower = stripped.lower()
    has_start = any(lower.startswith(kw) for kw in PLANTUML_KEYWORDS)
    has_end = "@enduml" in lower or "@endmindmap" in lower or "@endsalt" in lower \
              or "@endjson" in lower or "@endgantt" in lower or "@endwbs" in lower \
              or "@endboard" in lower or "@endchronology" in lower

    if not has_start:
        errors.append(
            "El diagrama debe comenzar con @startuml (u otro @start... válido de PlantUML)"
        )
    if not has_end:
        errors.append(
            "El diagrama debe terminar con @enduml (u otro @end... correspondiente)"
        )

    lines = stripped.split("\n")
    for i, line in enumerate(lines, 1):
        if len(line) > 500:
            warnings.append(f"Línea {i} es muy larga ({len(line)} caracteres), podría causar problemas")

    return len(errors) == 0, errors, warnings


@router.post("/validate")
def validate_plantuml(body: ValidateRequest):
    valid, errors, warnings = _validate_code(body.code)
    return {"valid": valid, "errors": errors, "warnings": warnings}


@router.post("/render")
def render_plantuml(body: RenderRequest):
    _check_plantuml()

    valid, errors, warnings = _validate_code(body.code)
    if not valid:
        raise HTTPException(status_code=400, detail={"errors": errors, "warnings": warnings})

    fmt = body.format.lower()
    if fmt not in ("png", "svg", "jpg"):
        fmt = "png"

    try:
        java_exe = _find_java()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Build skinparam for background color
    bg = body.background_color.strip()
    if not bg.startswith("#"):
        bg = "#" + bg

    code = body.code
    # Inject background color after @startuml
    inject = f"\nskinparam backgroundColor {bg}\n"
    code = re.sub(r"(@start\w+[^\n]*)", r"\1" + inject, code, count=1)

    # Page size dimensions
    if body.page_size in PAGE_SIZES and PAGE_SIZES[body.page_size]:
        w, h = PAGE_SIZES[body.page_size]
    elif body.width > 0 and body.height > 0:
        w, h = body.width, body.height
    else:
        w, h = 794, 1123  # A4 default

    with tempfile.TemporaryDirectory() as tmpdir:
        src_file = Path(tmpdir) / "diagram.puml"
        out_file = Path(tmpdir) / f"diagram.{fmt}"
        src_file.write_text(code, encoding="utf-8")

        cmd = [
            java_exe, "-jar", str(PLANTUML_JAR),
            f"-t{fmt}",
            f"-width", str(w),
            "-charset", "UTF-8",
            "-nometadata",
            str(src_file),
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=60,
                cwd=tmpdir,
            )
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="Tiempo de espera agotado al renderizar el diagrama")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al ejecutar PlantUML: {e}")

        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            stdout = result.stdout.decode("utf-8", errors="replace")
            detail = stderr or stdout or "Error desconocido de PlantUML"
            raise HTTPException(status_code=400, detail=f"Error de PlantUML: {detail}")

        if not out_file.exists():
            raise HTTPException(status_code=500, detail="PlantUML no generó el archivo de salida")

        content = out_file.read_bytes()

    content_type_map = {
        "png": "image/png",
        "svg": "image/svg+xml",
        "jpg": "image/jpeg",
    }
    encoded = base64.b64encode(content).decode("utf-8")
    return {
        "data": encoded,
        "format": fmt,
        "content_type": content_type_map[fmt],
        "warnings": warnings,
    }
