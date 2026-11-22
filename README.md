# Accesos Bellavista

Plataforma para gestionar el acceso de **proveedores, patrocinadores y staff externo** de Bellavista Golf & Country Club (Fomento Deportivo).

> **Estado (v2.1):** guarda los registros en un repositorio **privado** de GitHub (cada guardado es un commit). Hay también un *modo práctica* con datos ficticios. No envía correos. Ver [`docs/GUIA-GITHUB-DATOS.md`](docs/GUIA-GITHUB-DATOS.md).

## Principios de operación
- Recursos Humanos autoriza una vez; Vigilancia consulta la decisión vigente.
- El QR solo ubica el permiso: no contiene identificaciones ni datos de pago y nunca sustituye la autorización ni la verificación de identidad.
- Enviar una solicitud **no** autoriza el acceso.
- Tres formularios con enlace independiente (proveedores, patrocinadores, staff).

## Estructura
| Carpeta | Contenido |
|---|---|
| `site/` | Sitio estático (abrir `site/index.html`) |
| `site/formularios/` | Los tres formularios con enlace propio |
| `site/externo/` | Vistas del externo (pase y expediente) |
| `site/assets/` | `core.js` (datos y reglas), `ui.js`, `admin.js`, `ext.js`, `styles.css` |
| `docs/` | Manual en PDF (describe la v2.0), guía de GitHub y pendientes |
| `tests/` | Prueba de la conexión y sincronización con GitHub |
| `.github/workflows/` | Publicación opcional en GitHub Pages |

## Cómo probarlo
1. Descarga o clona el repositorio.
2. Abre `site/index.html` en Chrome o Edge (doble clic), o sirve la carpeta: `cd site && python -m http.server 8000`.
3. Al abrir, el sitio pide conectar con el repositorio de datos (ver la guía). *Modo práctica* usa datos ficticios en `localStorage` (clave `accesos-bellavista-v2`).
4. Pruebas de la capa de datos: `python tests/test_store.py site` (requiere Playwright; simula la API de GitHub).

## Alcance real de los enlaces
Los formularios requieren que el navegador esté conectado con token; hoy los captura personal del club. No son formularios públicos para externos.

## Pendiente (fase 2: integración operativa)
Ver [`docs/PENDIENTES.md`](docs/PENDIENTES.md) y [`CHANGELOG.md`](CHANGELOG.md).

## Privacidad
**No subas a este repositorio (el del sitio)** datos reales; los datos viven solo en el repositorio privado de datos. Nunca datos reales de personas, identificaciones, importes de pago ni correos. Solo datos ficticios. Ver [`SECURITY.md`](SECURITY.md).
