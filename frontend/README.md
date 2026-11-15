# Frontend · Flame Runner

Dashboard en React + Vite + Tailwind CSS 4 que consume la API de FastAPI del directorio `backend/`.

## Desarrollo

```bash
npm install
npm run dev
```

Con el backend corriendo en `http://localhost:8000` (`uvicorn backend.main:app --reload` desde la raíz del repo), Vite redirige `/api` al backend, así que no hace falta configurar nada.

## Producción

```bash
VITE_API_URL=https://tu-backend.onrender.com npm run build
```

`VITE_API_URL` es la URL pública del backend. En el backend, añade la URL del frontend a `ALLOWED_ORIGINS`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/lib` | Cliente de la API (`api.js`, `useApi.js`), rutas con `#/`, páginas, formatos e idioma (`i18n.js`) |
| `src/state` | Estado global: idioma, escenario de misión, filtro de área, buscador y visor de fuentes |
| `src/components` | Cabecera, buscador con asistente, visor de página, tarjeta de hallazgo, gráfico de dispersión |
| `src/pages` | Inicio, Misión, Fuego en microgravedad, Datos de la investigación e Historia |
| `src/content` | Textos narrativos e imágenes reales de la NASA con su crédito |
| `public/media` | Fotografías de las fichas y la guía de combustión de la NASA |

## Rutas de la API que usa cada página

| Página | Peticiones |
|---|---|
| Inicio | `/api/stats`, `/api/gaps`, `/api/scenarios` |
| Brechas y prioridades | `/api/gaps` |
| Qué dice la evidencia | `/api/findings?scenario&area&limit` |
| Extintores y agentes | `/api/suppressants`, `/api/findings?area=suppression&q` |
| Flujo, Oxígeno | `/api/tests?scenario`, `/api/findings?q&scenario` |
| Detección | `/api/findings?area=detection&type` |
| Investigaciones | `/api/investigations`, `/api/investigations/{acc}` |
| Resultados de pruebas | `/api/tests?scenario&fuel_class&only_in_scenario` |
| Ambiente operativo | `/api/investigations` (rangos de O₂, presión y flujo) |
| Mediciones | `/api/measurements`, `/api/measurements?quantity` |
| Documentos y publicaciones | `/api/library`, `/api/investigations/{acc}` |
| Buscador | `/api/search/all?q&area` y `POST /api/chat` (con `lang` es/en) |
| Visor de fuente | `/api/documents/{id}/pages/{n}?quote` |

## Idioma

El selector ES/EN de la cabecera cambia todo el sitio y el idioma de las respuestas del asistente. Los textos viven junto a cada componente como `tr("español", "english")` o como pares `["español", "english"]`. La elección se guarda en el navegador; la primera vez se usa el idioma del navegador.

## Asistente de evidencia

`POST /api/chat` filtra antes de llamar al modelo: las preguntas sin relación con el fuego en el espacio, las peticiones creativas o de código y los intentos de cambiar sus instrucciones reciben una respuesta fija con `off_topic` (`scope`, `task` o `manipulation`) y el panel muestra preguntas sugeridas. Si la pregunta parece una emergencia real en la Tierra, la respuesta incluye un aviso en `notice`.
