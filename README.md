# Gestor de Diagramas Web

Aplicación web full-stack para crear, editar y exportar diagramas **Mermaid** y **PlantUML** con renderizado offline.

![Angular](https://img.shields.io/badge/Angular-17-red?logo=angular)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)
![Railway](https://img.shields.io/badge/Deploy-Railway-purple?logo=railway)

---

## Funcionalidades

### Editor de diagramas
- **Dos pestañas independientes**: Mermaid y PlantUML, cada una con su propio editor y visor
- **Monaco Editor** — editor profesional con resaltado de sintaxis (el mismo motor que VS Code)
- **Paneles redimensionables** — arrastra la barra central para ajustar el espacio entre código y diagrama
- **Renderizado en tiempo real** — el diagrama se actualiza automáticamente al editar

### Visualización
- **Zoom y pan** con rueda del ratón y arrastre
- **Múltiples tamaños de página**: A4, A3, A5, Carta, Oficio y Personalizado
- **Color de fondo** configurable
- Mermaid se renderiza en el **navegador** (no requiere internet)
- PlantUML se renderiza en el **servidor** vía `plantuml.jar`

### Gestión de archivos
- **Guardar / Cargar** diagramas (`.mmd` para Mermaid, `.puml` para PlantUML)
- **Explorador de archivos** integrado con opciones de eliminar y subir
- **Directorio de trabajo** configurable desde la interfaz (⚙️)

### Exportación
- Formatos: **PNG**, **SVG**, **JPG**, **BMP**
- **Copiar al portapapeles** con un clic

### Auto-guardado
- Guarda automáticamente el diagrama cada **2.5 segundos** mientras editas

---

## Stack tecnológico

### Frontend
| Librería | Versión | Uso |
|---|---|---|
| Angular | 17.3 | Framework principal (standalone components) |
| Angular Material | 17.3 | Diálogos, pestañas, tooltips |
| PrimeNG + PrimeFlex | 17.18 / 4.0 | Componentes UI y utilidades CSS |
| Monaco Editor | 0.55 | Editor de código embebido |
| Mermaid | 11.15 | Renderizado de diagramas Mermaid (cliente) |
| html-to-image | 1.11 | Exportación a PNG/JPG/BMP/SVG |
| panzoom | 9.4 | Zoom y desplazamiento del diagrama |
| RxJS | 7.8 | Programación reactiva |

### Backend
| Librería | Versión | Uso |
|---|---|---|
| FastAPI | 0.115+ | API REST + sirviendo el frontend en producción |
| Uvicorn | 0.32+ | Servidor ASGI |
| Pydantic | 2.10+ | Validación de datos |
| aiofiles | 24.1+ | Operaciones de archivo asíncronas |
| python-multipart | 0.0.12+ | Subida de archivos |
| PlantUML (JAR) | 1.2024.8 | Renderizado PlantUML vía Java |

### Infraestructura
| Herramienta | Uso |
|---|---|
| Docker | Imagen multi-stage (Node → Python+Java) |
| Railway | Despliegue en la nube |
| Java 11+ | Requerido por `plantuml.jar` |

---

## API REST

Base URL: `/api`

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado del servidor |
| `GET` | `/api/config` | Obtener directorio de trabajo |
| `PUT` | `/api/config` | Actualizar directorio de trabajo |
| `GET` | `/api/files` | Listar archivos guardados |
| `POST` | `/api/files/save` | Guardar diagrama |
| `GET` | `/api/files/load/{filename}` | Cargar diagrama |
| `DELETE` | `/api/files/{filename}` | Eliminar diagrama |
| `POST` | `/api/files/upload` | Subir archivo |
| `POST` | `/api/mermaid/validate` | Validar sintaxis Mermaid |
| `POST` | `/api/plantuml/validate` | Validar sintaxis PlantUML |
| `POST` | `/api/plantuml/render` | Renderizar PlantUML a imagen |

Documentación interactiva: `http://localhost:8000/docs`

---

## Estructura del proyecto

```
gestor_diagramas_web/
├── backend/                    # FastAPI (Python)
│   ├── main.py                 # Punto de entrada + sirve frontend en prod
│   ├── config.py               # Gestión de configuración
│   ├── requirements.txt
│   └── routers/
│       ├── config_router.py
│       ├── files_router.py
│       ├── mermaid_router.py
│       └── plantuml_router.py
│
├── frontend/                   # Angular 17
│   └── src/
│       ├── app/
│       │   ├── components/     # Workspace, Editor, Viewer, Diálogos
│       │   ├── services/       # ApiService, AutosaveService
│       │   └── models/         # Interfaces TypeScript
│       └── environments/       # URLs por entorno (dev/prod)
│
├── Dockerfile                  # Build multi-stage para Railway
├── railway.json                # Configuración Railway
├── start_all.bat               # Inicio rápido Windows (desarrollo)
└── INSTRUCCIONES.md            # Documentación adicional
```

---

## Ejecución local (desarrollo)

### Requisitos previos
- **Node.js** 18+
- **Python** 3.10+
- **Java** 11+ (solo para PlantUML)
- `plantuml.jar` en la carpeta `backend/` — [Descargar aquí](https://plantuml.com/download)

### Inicio automático (Windows)
```bat
start_all.bat
```

### Inicio manual (dos terminales)

**Terminal 1 — Backend:**
```bat
start_backend.bat
```

**Terminal 2 — Frontend:**
```bat
start_frontend.bat
```

### URLs de desarrollo
| Servicio | URL |
|---|---|
| Frontend Angular | http://localhost:4200 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

---

## Despliegue en Railway

### Opción 1: Desde GitHub (recomendado)

1. Sube el repositorio a GitHub
2. En [railway.com](https://railway.com), crea un nuevo proyecto → **Deploy from GitHub repo**
3. Selecciona este repositorio — Railway detecta el `Dockerfile` automáticamente
4. El build descarga dependencias, construye Angular y arranca FastAPI

### Opción 2: Railway CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Variables de entorno opcionales
| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor (Railway lo inyecta automáticamente) | `8000` |
| `CORS_ORIGINS` | Orígenes permitidos para CORS | `https://mi-dominio.com` |

> En producción Railway sirve tanto la API como el frontend desde el mismo proceso (FastAPI → archivos estáticos de Angular). No se necesita configuración adicional de CORS.

---

## Docker local

```bash
# Construir la imagen
docker build -t gestor-diagramas .

# Ejecutar
docker run -p 8000:8000 gestor-diagramas
```

Accede en: http://localhost:8000
