# Guía: guardar registros en Supabase (versión 2.2)

## Cómo funciona
El sitio (GitHub Pages) guarda **toda la base como un documento** en la tabla `ab_db`, fila `main`, de tu proyecto de Supabase. Cada guardado sube el contador `rev`; si dos personas guardan a la vez, el sitio fusiona los cambios por registro.

| Tabla | Para qué sirve | Acceso desde el sitio |
|---|---|---|
| `ab_db` | La base actual (fila `main`) | Leer, crear y actualizar. **No borrar.** |
| `ab_db_versions` | Historial: una copia por cada guardado, con descripción y quién | Ninguno (no se puede leer ni borrar desde el sitio) |

## 1. Crear las tablas (una sola vez)
1. Supabase → tu proyecto → **SQL Editor** → New query.
2. Pega el contenido de [`supabase-setup.sql`](supabase-setup.sql) y pulsa **Run** (confirma el aviso de operaciones destructivas: solo aplica a objetos que el script mismo crea).
3. Comprueba en **Table Editor** que existen `ab_db` y `ab_db_versions` con RLS activado.

## 2. Conectar el sitio
`site/assets/config.js` ya trae la URL del proyecto y la **clave publishable** (`sb_publishable_…`), que está pensada para ir en el navegador. **Nunca** pongas ahí una clave `secret` ni `service_role`.

Al abrir el sitio solo pide tu nombre (queda en el historial). La primera vez crea la base vacía, sin datos de ejemplo.

## 3. Dónde ver el historial
- En el sitio: pestaña "Historial e incidencias".
- En Supabase: Table Editor → `ab_db_versions` (una fila por guardado; `rev`, `mensaje`, `operador`, `created_at`). Para recuperar una versión, copia su `data` a `ab_db.data` y sube `rev`.

## Seguridad: léelo antes de usar datos reales
- **No hay inicio de sesión.** Como el sitio es público y la clave va en el navegador, **cualquier persona que abra el sitio (o use la clave) puede leer y modificar todos los registros**, incluidos los de proveedores y staff. Los formularios externos también cargan la base completa.
- Lo que sí está protegido: no se puede borrar `ab_db`, no se pueden crear otras filas y el historial (`ab_db_versions`) no se puede leer ni alterar desde el sitio, así que un cambio malintencionado se puede deshacer desde Supabase.
- **Usa solo datos ficticios** hasta agregar Supabase Auth (correo y contraseña para el personal) y reglas por perfil. Está en [`PENDIENTES.md`](PENDIENTES.md).
- Si la clave se abusa: Supabase → Settings → API Keys → crear una nueva publishable y borrar la anterior, y actualizar `config.js`.

## Limitaciones
- **Sin envío de correos.** Los avisos y pases por correo siguen siendo simulados.
- **Sin inicio de sesión por perfil.** El nombre que se escribe solo queda en el historial; no se verifica.
- Plan gratuito de Supabase: el proyecto se pausa tras una semana sin actividad.
