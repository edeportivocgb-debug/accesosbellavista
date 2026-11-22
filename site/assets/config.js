/* Configuración de la conexión de datos.
   modo: 'produccion' guarda los registros en Supabase (tabla ab_db).
         'practica'   usa datos ficticios solo en el navegador (como la versión 2.0).
   La clave 'publishable' de Supabase está pensada para ir en el navegador; la seguridad depende de las reglas (RLS) de la tabla.
   NUNCA pongas aquí una clave 'secret' ni 'service_role'. */
const AB_CONFIG = {
  modo: 'produccion',
  datos: {
    url: 'https://ynljuxfnlgzuxxfohpnb.supabase.co',
    key: 'sb_publishable_trjLcnkZ7VZh4DASJZFnlg_S5J7qn_i',
    tabla: 'ab_db',
    id: 'main'
  }
};
