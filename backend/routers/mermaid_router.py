from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import re

router = APIRouter(prefix="/api/mermaid", tags=["mermaid"])

VALID_DIAGRAM_TYPES = {
    "graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
    "stateDiagram-v2", "erDiagram", "journey", "gantt", "pie", "quadrantChart",
    "requirementDiagram", "gitGraph", "mindmap", "timeline", "sankey-beta",
    "xychart-beta", "block-beta", "packet-beta", "architecture-beta",
    "zenuml", "C4Context", "C4Container", "C4Component", "C4Dynamic", "C4Deployment",
}


class ValidateRequest(BaseModel):
    code: str


@router.post("/validate")
def validate_mermaid(body: ValidateRequest):
    code = body.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="El código no puede estar vacío")

    errors = []
    warnings = []

    lines = code.split("\n")
    first_non_empty = next((l.strip() for l in lines if l.strip() and not l.strip().startswith("%%")), "")

    if not first_non_empty:
        errors.append("El diagrama está vacío o sólo contiene comentarios")
        return {"valid": False, "errors": errors, "warnings": warnings}

    detected_type = None
    for dtype in VALID_DIAGRAM_TYPES:
        pattern = r"^\s*" + re.escape(dtype) + r"(\s|$|[-\s])"
        if re.match(pattern, first_non_empty, re.IGNORECASE):
            detected_type = dtype
            break

    if detected_type is None:
        errors.append(
            f"Tipo de diagrama no reconocido. La primera línea debe indicar el tipo (ej: graph TD, sequenceDiagram, etc.). "
            f"Línea detectada: '{first_non_empty[:60]}'"
        )
        return {"valid": False, "errors": errors, "warnings": warnings}

    # Basic structural checks
    open_brackets = code.count("{") - code.count("}")
    open_parens = code.count("(") - code.count(")")
    open_squares = code.count("[") - code.count("]")

    if open_brackets != 0:
        warnings.append(f"Posible desequilibrio de llaves {{}} (diferencia: {open_brackets})")
    if open_parens != 0:
        warnings.append(f"Posible desequilibrio de paréntesis () (diferencia: {open_parens})")
    if open_squares != 0:
        warnings.append(f"Posible desequilibrio de corchetes [] (diferencia: {open_squares})")

    # Check for common syntax issues
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped and not stripped.startswith("%%") and "\t" in stripped:
            warnings.append(f"Línea {i}: Se detectaron tabulaciones; se recomienda usar espacios")
            break

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "diagram_type": detected_type,
    }
