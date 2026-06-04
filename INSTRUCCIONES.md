# Gestor de Diagramas Web

Sistema web para crear y visualizar diagramas Mermaid y PlantUML.

## Requisitos Previos

- **Node.js** 18+
- **Python** 3.10+
- **Java** 11+ (solo para PlantUML)
- `plantuml.jar` (solo para PlantUML)

## Instalación de plantuml.jar

Para usar diagramas PlantUML, descargue el JAR y colóquelo en la carpeta `backend/`:

1. Descargue desde: https://plantuml.com/download
2. Coloque el archivo como: `backend/plantuml.jar`

## Cómo Iniciar

### Opción 1: Inicio Automático (recomendado)
```
Doble clic en: start_all.bat
```

### Opción 2: Manual (dos terminales)

**Terminal 1 - Backend:**
```bat
start_backend.bat
```

**Terminal 2 - Frontend:**
```bat
start_frontend.bat
```

### URLs
- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- Documentación API: http://localhost:8000/docs

## Características

1. **Dos pestañas**: Mermaid y PlantUML
2. **Editor con resaltado de sintaxis** (Monaco Editor)
3. **Paneles redimensionables** - arrastre la barra central
4. **Visualización offline** - no requiere internet
5. **Autoguardado** - guarda automáticamente cada 2.5 segundos
6. **Exportación**: PNG, SVG, JPG, BMP
7. **Copiar al portapapeles**
8. **Zoom y pan** en el diagrama (rueda del ratón o arrastre)
9. **Múltiples tamaños**: A4, A3, A5, Carta, Oficio, Personalizado
10. **Color de fondo** configurable
11. **Directorio de trabajo** configurable desde la interfaz

## Archivos de Diagramas

- Mermaid: extensión `.mmd`
- PlantUML: extensión `.puml`

Los archivos se guardan en el **directorio de trabajo** del servidor (configurable
desde el ícono ⚙️ en la barra de título).

## Estructura del Proyecto

```
gestor_diagramas_web/
├── backend/           # FastAPI (Python)
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   ├── plantuml.jar   ← Colocar aquí
│   └── routers/
├── frontend/          # Angular
│   └── src/
├── start_backend.bat
├── start_frontend.bat
└── start_all.bat
```
