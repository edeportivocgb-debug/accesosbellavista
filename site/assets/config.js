/* Configuración de la conexión de datos.
   modo: 'produccion' guarda los registros en un repositorio PRIVADO de GitHub.
         'practica'   usa datos ficticios solo en el navegador (como la versión 2.0).
   datos.repo: puede dejarse vacío; cada persona lo escribe al conectar (usuario/repositorio). */
const AB_CONFIG = {
  modo: 'produccion',
  datos: { repo: '', rama: '', ruta: 'data/db.json' }
};
