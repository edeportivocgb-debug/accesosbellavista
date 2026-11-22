# Accesos Bellavista

Plataforma para gestionar el acceso de **proveedores, patrocinadores y staff externo** de Bellavista Golf & Country Club (Fomento Deportivo).

> **Estado:** prototipo navegable con **datos ficticios**. Todo se guarda en el navegador de quien lo abre; no se envía correo ni se conecta con servicios externos.

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
| `docs/` | Manual de uso en PDF y notas del proyecto |
| `.github/workflows/` | Publicación opcional en GitHub Pages |

## Cómo probarlo
1. Descarga o clona el repositorio.
2. Abre `site/index.html` en Chrome o Edge (doble clic), o sirve la carpeta: `cd site && python -m http.server 8000`.
3. Los datos viven en `localStorage` (clave `accesos-bellavista-v2`) y se reinician cada día.

## Alcance real de los enlaces
Los enlaces de formularios funcionan **solo dentro del prototipo, en el mismo navegador**. No son formularios públicos publicados.

## Pendiente (fase 2: integración operativa)
Ver [`docs/PENDIENTES.md`](docs/PENDIENTES.md) y [`CHANGELOG.md`](CHANGELOG.md).

## Privacidad
**No subas a este repositorio** datos reales de personas, identificaciones, importes de pago ni correos. Solo datos ficticios. Ver [`SECURITY.md`](SECURITY.md).
