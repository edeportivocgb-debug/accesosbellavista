# Accesos Bellavista

Plataforma para gestionar el acceso de **proveedores, patrocinadores y staff externo** de Bellavista Golf & Country Club (Fomento Deportivo).

> **Estado (v2.2):** guarda los registros en **Supabase** (tabla `ab_db`; cada guardado conserva una versión en el historial). Hay también un *modo práctica* con datos ficticios. No envía correos. **Sin inicio de sesión:** quien abra el sitio puede leer y modificar los datos (ver [`docs/GUIA-SUPABASE-DATOS.md`](docs/GUIA-SUPABASE-DATOS.md)).

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
| `docs/` | Manual en PDF (describe la v2.0), guía y script de Supabase, y pendientes |
| `tests/` | Prueba de la conexión y sincronización con Supabase (simulada) |
| `.github/workflows/` | Publicación opcional en GitHub Pages |

## Cómo probarlo
1. Descarga o clona el repositorio.
2. Abre `site/index.html` en Chrome o Edge (doble clic), o sirve la carpeta: `cd site && python -m http.server 8000`.
3. Al abrir, el sitio pide el nombre de quien opera y se conecta a Supabase (ver la guía). *Modo práctica* usa datos ficticios en `localStorage` (clave `accesos-bellavista-v2`).
4. Pruebas de la capa de datos: `python tests/test_store.py site` (requiere Playwright; simula la API de Supabase).

## Alcance real de los enlaces
Los formularios abren sin pedir conexión y guardan directo en Supabase, pero **sin inicio de sesión ni verificación**: cualquiera con el enlace puede enviar datos (y, por la clave pública, también leerlos). Úsalo solo con datos ficticios hasta agregar inicio de sesión.

## Pendiente (fase 2: integración operativa)
Ver [`docs/PENDIENTES.md`](docs/PENDIENTES.md) y [`CHANGELOG.md`](CHANGELOG.md).

## Privacidad
**No subas a este repositorio (el del sitio)** datos reales; los datos viven solo en Supabase. Nunca datos reales de personas, identificaciones, importes de pago ni correos. Solo datos ficticios. Ver [`SECURITY.md`](SECURITY.md).
