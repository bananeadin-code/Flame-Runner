# Recursos del reto Flame in Freefall

Material de partida para la base de datos del proyecto. Todo procede de los recursos oficiales del reto (NASA Space Apps 2026).

## Contenido

| Carpeta | Qué hay | Origen |
|---|---|---|
| `psi/investigations_index.json` | Ficha resumida de las 24 investigaciones de Combustion Science | API pública de PSI |
| `psi/investigations/PSI-*.json` | Ficha completa de cada investigación: objetivos, hipótesis, enfoque, hardware, publicaciones con DOI, tabla experimental | API pública de PSI |
| `psi/inventory.csv` | Inventario de **todos** los archivos de las 24 investigaciones (63 432 filas, ~14 TB contando versiones) con categoría, tamaño y prioridad (`tier`) | API pública de PSI |
| `psi/files/` | Archivos descargados (no se sube a git, ver abajo) | PSI (S3) |
| `pdf/` | Fichas oficiales de ACME, BASS, DAFT, FLEX, SAME, SPICE, SAFFIRE y SLICE, y la guía *Combustion in Reduced Gravity* (2015) | nasa.gov |
| `web/` | Páginas de los recursos del reto: Combustion Science, guía del investigador, Apollo 1, Apollo 13, incendio de la Mir y tres spinoffs | nasa.gov, sma.nasa.gov, spinoff.nasa.gov |

No incluido: el vídeo de YouTube (*ScienceCasts*) y los PDF de Apollo alojados en `history.nasa.gov` y `govinfo.gov`.

## Descargar los archivos de datos de PSI

Los archivos pesan demasiado para git. Cada integrante los descarga con:

```bash
pip install -r requirements.txt
python -m backend.ingest.psi download                  # core: ~2 400 archivos, ~4.7 GB
python -m backend.ingest.psi download --only PSI-25    # solo una investigación
python -m backend.ingest.psi download --tier context   # + presentaciones e ingeniería (~5.4 GB)
python -m backend.ingest.psi catalog                   # vuelve a generar el inventario
```

Se puede interrumpir y reanudar; los archivos completos se saltan.

### Prioridades (`tier` en `inventory.csv`)

- **core**: tablas experimentales, informes, documentos científicos, datos analizados y de referencia, metadatos, y cualquier PDF u Office aunque esté en *Raw Data* (en FLEX, BASS y SLICE los artículos están ahí).
- **context**: presentaciones, documentos de ingeniería e imágenes representativas.
- **raw**: vídeo, imágenes y telemetría cruda. Es casi todo el volumen y no hace falta para la base de datos.

## Las 24 investigaciones

| PSI | Siglas | Tipo | Título |
|---|---|---|---|
| PSI-10 | ACME/Flame Design | Microgravedad (ISS) | Advanced Combustion via Microgravity Experiments / Flame Design |
| PSI-20 | ACME BRE | Microgravedad (ISS) | ACME - Burning Rate Emulator |
| PSI-21 | ACME CLD Flame | Microgravedad (ISS) | ACME / Coflow Laminar Diffusion Flame |
| PSI-22 | ACME E-FIELD Flames | Microgravedad (ISS) | ACME Electric-Field Effects on Laminar Diffusion Flames |
| PSI-23 | ACME s-Flame | Microgravedad (ISS) | ACME - Structure and Response of Spherical Diffusion Flames |
| PSI-25 | BASS-II | Microgravedad (ISS) | Burning and Suppression of Solids - II |
| PSI-26 | BASS | Microgravedad (ISS) | Burning and Suppression of Solids |
| PSI-39 | CFI | Microgravedad (ISS) | Cool Flames Investigation |
| PSI-47 | DAFT / DAFT-2 | Microgravedad (ISS) | Dust and Aerosol Measurement Feasibility Test 1 y 2 |
| PSI-60 | — | Tierra | Computational and Experimental Analysis of SPICE Data Sets |
| PSI-62 | — | Tierra | Concurrent Flame Spread Modeling (Flamelet Generated Manifolds) vs. BASS |
| PSI-68 | FLEX-2 | Microgravedad (ISS) | Flame Extinguishment Experiment - 2 |
| PSI-69 | FLEX | Microgravedad (ISS) | Flame Extinguishment Experiment |
| PSI-98 | SAFFIRE-I | Microgravedad (Cygnus) | Spacecraft Fire Safety Experiment-I |
| PSI-99 | SAFFIRE-II | Microgravedad (Cygnus) | Spacecraft Fire Experiment-II |
| PSI-100 | SAFFIRE-III | Microgravedad (Cygnus) | Spacecraft Fire Experiment-III |
| PSI-101 | SAME-R | Microgravedad (ISS) | Smoke Aerosol Measurement Experiment-Reflight |
| PSI-102 | SAME | Microgravedad (ISS) | Smoke and Aerosol Measurement Experiment |
| PSI-106 | SLICE | Microgravedad (ISS) | Structure and Liftoff In Combustion Experiment |
| PSI-107 | SPICE | Microgravedad (ISS) | Smoke Point In Co-flow Experiment |
| PSI-115 | — | Tierra | SAME data for modeling smoke generation in microgravity |
| PSI-117 | — | Tierra | Thermo-convective perturbation on cool flame dynamics (CFD) |
| PSI-142 | — | Tierra | Cool flame transitions at radiation / stretch extinction (counterflow) |
| PSI-159 | ACME CFI-G | Microgravedad (ISS) | ACME / Cool Flames Investigation with Gases |

### Relación con la seguridad contra incendios

- **Prevención** (inflamabilidad de materiales, límites de extinción): BASS, BASS-II, SAFFIRE I–III, PSI-62.
- **Detección** (humo y aerosoles): SAME, SAME-R, DAFT, SAFFIRE, SPICE, PSI-115.
- **Supresión** (extinción, diluyentes como CO₂ y He, llamas frías): FLEX, FLEX-2, CFI, ACME CFI-G, PSI-117, PSI-142.
- **Base científica de llamas** (estructura, hollín, despegue de llama): ACME, SLICE, SPICE, PSI-60.
