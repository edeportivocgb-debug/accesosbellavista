# Guía: guardar registros en GitHub (versión 2.1)

## Cómo funciona
Se usan **dos repositorios**:

| Repositorio | Visibilidad | Qué contiene |
|---|---|---|
| `accesos-bellavista` (este) | Público o el plan que permita Pages | Solo el sitio (código). **Nunca datos.** |
| `accesos-bellavista-datos` | **Privado** | `data/db.json`: todos los registros. Cada guardado es un commit = historial. |

El sitio publicado lee y escribe `data/db.json` en el repositorio privado usando el **token personal** de quien lo abre. El sitio no verifica nada si el token no lo tiene.

## 1. Crear el repositorio de datos
1. GitHub → New repository → nombre `accesos-bellavista-datos` → **Private** → marca *Add a README* → Create.
2. Settings → Collaborators → agrega a cada persona que va a operar (cada una con su propia cuenta de GitHub).

## 2. Crear el token (cada persona el suyo)
1. Foto de perfil → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. Resource owner: la cuenta dueña del repositorio de datos. Expiration: 90 días.
3. Repository access: **Only select repositories** → `accesos-bellavista-datos`.
4. Permissions → Repository permissions → **Contents: Read and write**.
5. Generate token y cópialo (solo se muestra una vez).

## 3. Conectar el sitio
1. Abre el sitio (Pages o `site/index.html` servido por un servidor local).
2. Escribe `usuario/accesos-bellavista-datos`, pega el token y tu nombre.
3. La primera conexión crea `data/db.json` vacío (sin datos de ejemplo). La barra superior muestra *Guardado en GitHub · hora*.
4. Si el repositorio es público, el sitio **se niega a conectar**.

## 4. Dónde ver el historial
En el repositorio de datos: pestaña *Commits*, o *History* sobre `data/db.json`. Cada commit dice la acción, el folio y quién la hizo. La pestaña "Historial e incidencias" del sitio muestra la misma bitácora.

## Qué hacer primero
1. Catálogo de eventos: dar de alta los eventos reales (están vacíos).
2. Revisar los nombres de las cuentas por área (Recursos Humanos, Vigilancia, etc.): son genéricos.

## Limitaciones (importantes)
- **Los externos no pueden capturar solos.** Los formularios y las vistas de pase/expediente necesitan token. Hoy las captura personal del club en nombre del proveedor. Para formularios públicos reales se necesita una base con acceso anónimo controlado (Supabase, Microsoft 365 o similar).
- **Sin envío de correos.** Los avisos y pases por correo siguen siendo simulados.
- **Sin inicio de sesión por perfil.** Quien tenga token puede operar como cualquier área; el nombre que escribe queda en el historial.
- **Copias de credencial:** solo se guarda el nombre del archivo, no el archivo.
- **Simultaneidad:** si dos personas guardan a la vez se fusionan por registro; dos folios nuevos al mismo segundo podrían repetirse (poco probable; se actualiza antes de enviar cada formulario).
- **Tamaño:** todo vive en un solo archivo; es adecuado para el piloto, no para años de operación.
- **Privacidad:** datos personales en GitHub (servidores fuera de México). [VERIFICAR] con Sistemas y el aviso de privacidad del club antes de usar datos reales.
- **Token en el navegador:** quien use la computadora puede usarlo. Cierra la conexión (barra superior) en equipos compartidos y revoca el token si se pierde.
