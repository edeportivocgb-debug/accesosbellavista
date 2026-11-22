# Historial de cambios

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [2.2.0] – 2026-11-22
### Cambiado
- El guardado de registros pasa de un repositorio privado de GitHub a **Supabase** (`ab_db` + historial `ab_db_versions`); script en `docs/supabase-setup.sql`.
- Se retiró el token de GitHub: la pantalla de entrada solo pide el nombre de quien opera.
- Los formularios y vistas del externo abren sin pedir conexión (operador "Formulario externo").
- Pruebas (`tests/test_store.py`) adaptadas a una API de Supabase simulada.
### Seguridad (importante)
- **Sin inicio de sesión:** las reglas (RLS) permiten a cualquiera leer y actualizar la fila `main`. No se pueden borrar registros ni leer el historial desde el sitio. No usar con datos reales hasta agregar Supabase Auth.

## [2.1.0] – 2026-11-22
### Agregado
- Guardado de registros en `data/db.json` de un repositorio privado de GitHub; cada guardado es un commit descriptivo.
- Fusión por registro cuando varias personas guardan a la vez; cola de cambios sin conexión.
- Pantalla de conexión (repositorio, token, nombre del operador); rechaza repositorios públicos.
- Barra de estado de guardado; se retiró la leyenda de prototipo y el botón de restablecer en modo producción.
- Base inicial vacía (sin datos de ejemplo ni nombres de personas); *modo práctica* conserva los datos ficticios.
- Vista de patrocinios con estado vacío cuando no hay torneos.

## [Sin publicar] – Actualización 3
### Pendiente de implementar
- Navegación en seis apartados con subpestañas: Inicio, Vigilancia, Proveedores, Patrocinios, Staff externo, Recursos Humanos.
- Vigilancia como prioridad (abre en "Accesos de hoy"; botones visibles Validar QR y Buscar sin QR).
- Presentación corporativa: menú verde oscuro, áreas de trabajo marfil, sin etiquetas de "prototipo/demostración".
- Confirmación uniforme tras enviar formularios: "Solicitud recibida / Folio / Estado: Pendiente de aprobación / Conserva tu folio…".
- Guía de presentación separada del sitio.

## [2.0.0] – 2026-10-17
- Sitio multipágina: matriz interna, tres formularios con enlace propio, pase y expediente del externo.
- Modelo relacional: solicitudes, personas, jornadas, vehículos, materiales, pases, movimientos, torneos, turnos, pagos.
- Programación de staff, solicitudes de pago, logística de patrocinios con turnos y lista de espera.
- 91 pruebas automatizadas (fuera de este repositorio; ver pendientes).

## [1.0.0] – 2026-10-15
- Prototipo de un solo archivo con datos ficticios.

## Documentación
- 2026-10-20: Manual de uso en PDF (`docs/`).
