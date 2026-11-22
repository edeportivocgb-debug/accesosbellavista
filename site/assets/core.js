'use strict';
/* ==========================================================================
   ACCESOS BELLAVISTA · NÚCLEO DE DATOS DEL PROTOTIPO (v2)
   Modo práctica: datos ficticios en localStorage. Modo producción: ver assets/store.js (GitHub).
   Lo comparten todas las páginas del sitio porque viven en el mismo origen.
   No es multiusuario, no envía correos y no está conectado a ninguna plataforma.
   ========================================================================== */
const STORE_KEY = 'accesos-bellavista-v2';
const BLOQUEO_POR_PERFIL = false; // Etapa de demostración: sin bloqueos. Cambiar a true al conectar cuentas reales.
const CFG = {
  tolMin: 30, // tolerancia de caseta para staff y proveedores [DATO]
  puertas: ['Acceso principal', 'Acceso de servicio'], // [DATO] catálogo provisional
  areas: ['Ludoteca', 'Fomento Deportivo', 'Eventos y patrocinios', 'Mantenimiento', 'Alimentos y bebidas', 'Albercas', 'Golf', 'Casa Club'],
  qrPrefijo: 'ACCESOS-BV:'
};
const FORMULARIOS = {
  proveedores: { tipo: 'proveedor', pref: 'PRV', titulo: 'Solicitud de acceso de proveedores', archivo: 'formularios/proveedores.html' },
  patrocinadores: { tipo: 'patrocinio', pref: 'PAT', titulo: 'Registro de patrocinadores', archivo: 'formularios/patrocinadores.html' },
  staff: { tipo: 'staff', pref: 'STF', titulo: 'Programación de staff externo', archivo: 'formularios/staff.html' }
};
const TIPOS = { proveedor: 'Proveedor', patrocinio: 'Patrocinador', staff: 'Staff externo' };
const MODALIDADES = { entrega: 'Entrega de mercancía', servicio: 'Servicio', instalacion: 'Instalación', paqueteria: 'Paquetería (repartidor desconocido)' };
const ESTADOS = { pendiente: ['Pendiente de revisión', 'pend'], correccion: ['Corrección solicitada', 'corr'], autorizado: ['Autorizado', 'ok'], rechazado: ['Rechazado', 'rej'], cancelado: ['Cancelado', 'can'] };
const PASES = { sin_pase: ['Sin pase', 'can'], espera_horario: ['Espera horario confirmado', 'pend'], generado: ['Pase generado', 'info'], enviado: ['Pase enviado', 'ok'], fallido: ['Envío fallido', 'rej'], suspendido: ['Pase suspendido', 'pend'], revocado: ['Pase revocado', 'can'] };
const LINEA_PAGO = { pendiente_asistencia: ['Pendiente de asistencia', 'pend'], asistencia_validada: ['Asistencia validada', 'info'], autorizado: ['Pago autorizado', 'ok'], pagado: ['Pagado', 'ok'], no_pagable: ['No pagable', 'can'] };
const SEGUIMIENTO = { programado: ['Programado', 'pend'], llego: ['Llegó', 'info'], listo: ['Listo para ingresar', 'corr'], ingreso: ['Ingresó', 'ok'], no_show: ['No se presentó', 'rej'] };
const PERFILES = { responsable: 'Responsable interno', logistica: 'Logística de patrocinios', rh: 'Recursos Humanos', vigilancia: 'Vigilancia', recepcion: 'Recepción', admin: 'Administrador' };
/* Estructura de permisos preparada (inactiva mientras BLOQUEO_POR_PERFIL = false) */
const PERM = {
  responsable: ['staff.programar', 'sol.verPropias', 'pago.confirmarServicio'],
  logistica: ['torneo.configurar', 'torneo.turnos', 'sol.verPatrocinios'],
  rh: ['sol.verTodas', 'sol.decidir', 'sol.cancelar', 'pase.enviar', 'pago.ver', 'pago.validar', 'pago.autorizar', 'doc.ver'],
  vigilancia: ['caseta.ver', 'caseta.registrar', 'qr.validar', 'paq.recibir', 'inc.crear'],
  recepcion: ['caseta.ver', 'paq.recibir'],
  admin: ['usuarios.admin', 'eventos.editar', 'hist.ver', 'sol.verTodas']
};

/* ---------- utilidades ---------- */
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dstr(new Date());
const addD = (s, n) => { const [y, m, d] = s.split('-').map(Number); return dstr(new Date(y, m - 1, d + n)); };
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const nowISO = () => today() + 'T' + nowHM();
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
function fmtD(s) { if (!s) return '—'; const [y, m, d] = s.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DIA[dt.getDay()]} ${d} ${MES[m - 1]}`; }
function fmtDT(iso) { if (!iso) return '—'; const [d, t] = iso.split('T'); return `${fmtD(d)} · ${t}`; }
const rango = (a, b) => !a ? '—' : a === b || !b ? fmtD(a) : `${fmtD(a)} al ${fmtD(b)}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
const emailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
const telOk = s => String(s || '').replace(/\D/g, '').length === 10;
const toMin = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return h * 60 + m; };
const fromMin = n => pad(Math.floor(n / 60)) + ':' + pad(n % 60);
const money = n => n == null || n === '' || isNaN(n) ? '—' : 'MXN ' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let _id = Math.floor(Math.random() * 1e5);
const nid = p => p + (Date.now() % 1e6).toString(36) + (++_id).toString(36);
function token() { const al = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const a = new Uint8Array(15); crypto.getRandomValues(a); const s = Array.from(a, b => al[b % al.length]).join(''); return s.slice(0, 5) + '-' + s.slice(5, 10) + '-' + s.slice(10, 15); }
const traslapa = (a, b) => a.fecha === b.fecha && toMin(a.hini) < toMin(b.hfin) && toMin(b.hini) < toMin(a.hfin);
class PermError extends Error { constructor(m) { super(m); this.name = 'PermError'; } }
class RuleError extends Error { constructor(m) { super(m); this.name = 'RuleError'; } }

/* ---------- datos ficticios ---------- */
function seed() {
  const t = today(), D = n => addD(t, n);
  const db = { v: 2, creado: nowISO(), seq: { PRV: 0, PAT: 0, STF: 0, PAG: 0 }, usuarios: [], eventos: [], empresas: [], personas: [], solicitudes: [], participantes: [], jornadas: [], vehiculos: [], materiales: [], pases: [], movs: [], torneos: [], turnos: [], pagos: [], lineasPago: [], incid: [], hist: [], notifs: [] };
  db.usuarios = [
    { id: 'u-are', nombre: 'Are (Ludoteca)', perfil: 'responsable', area: 'Ludoteca', correo: 'are.ludoteca@ejemplo.com' },
    { id: 'u-fd', nombre: 'Coordinación Fomento Deportivo', perfil: 'responsable', area: 'Fomento Deportivo', correo: 'fomento@ejemplo.com' },
    { id: 'u-fer', nombre: 'Fer (Logística de patrocinios)', perfil: 'logistica', area: 'Eventos y patrocinios', correo: 'fer.patrocinios@ejemplo.com' },
    { id: 'u-rh', nombre: 'Mariana Ortega · RH (ficticio)', perfil: 'rh', area: 'Recursos Humanos', correo: 'rh@ejemplo.com' },
    { id: 'u-rh2', nombre: 'Luis Prieto · RH (ficticio)', perfil: 'rh', area: 'Recursos Humanos', correo: 'rh2@ejemplo.com' },
    { id: 'u-vig1', nombre: 'Of. Jorge Torres (ficticio)', perfil: 'vigilancia', area: 'Vigilancia', puerta: 'Acceso principal' },
    { id: 'u-vig2', nombre: 'Of. Raúl Salas (ficticio)', perfil: 'vigilancia', area: 'Vigilancia', puerta: 'Acceso de servicio' },
    { id: 'u-rec', nombre: 'Recepción (ficticio)', perfil: 'recepcion', area: 'Recepción' },
    { id: 'u-adm', nombre: 'Administración del sistema', perfil: 'admin', area: 'Sistemas' }
  ];
  const fuente = 'Ejemplo ficticio — sustituir por el calendario del área';
  db.eventos = [
    { id: 'EV-MCH', nombre: 'MasterChef (ejemplo)', area: 'Ludoteca', fini: t, ffin: D(1), lugar: 'Ludoteca y terraza', aforo: 40, estadoFecha: 'por_revisar', fuente, tipo: 'evento' },
    { id: 'EV-HAL', nombre: 'Festival de Halloween (ejemplo)', area: 'Ludoteca', fini: D(14), ffin: D(14), lugar: 'Jardín principal', aforo: 120, estadoFecha: 'confirmada', fuente, tipo: 'evento' },
    { id: 'EV-OTO', nombre: 'Torneo de Otoño (ficticio)', area: 'Golf', fini: D(1), ffin: D(1), lugar: 'Campo de golf', aforo: 144, estadoFecha: 'confirmada', fuente, tipo: 'torneo' },
    { id: 'EV-INV', nombre: 'Copa Invierno (ficticio)', area: 'Golf', fini: D(28), ffin: D(29), lugar: 'Campo de golf', aforo: null, estadoFecha: 'por_revisar', fuente, tipo: 'torneo' },
    { id: 'EV-NAT', nombre: 'Clínica de natación (ejemplo)', area: 'Albercas', fini: D(7), ffin: D(9), lugar: 'Alberca semiolímpica', aforo: 25, estadoFecha: 'confirmada', fuente, tipo: 'evento' }
  ];
  db.torneos = [
    { eventoId: 'EV-OTO', fechaMontaje: t, lugar: 'Hoyo 1 y casa club', puerta: 'Acceso de servicio', zona: 'Explanada de carritos', ingresoIni: '07:00', ingresoFin: '11:00', turnoMin: 30, capVeh: 2, tolMin: 15, cierreRegistro: D(-1) + 'T18:00', descarga: ['07:00', '09:00'], montaje: ['07:00', '13:00'], desmontaje: [D(1), '17:00', '20:00'], controlObjetos: true, objetosNota: 'Todo objeto que entra al campo se revisa al salir.', enlace: token(), publicado: true },
    { eventoId: 'EV-INV', fechaMontaje: D(27), lugar: 'Hoyo 10', puerta: 'Acceso de servicio', zona: 'Estacionamiento norte', ingresoIni: '07:00', ingresoFin: '10:00', turnoMin: 30, capVeh: 2, tolMin: 15, cierreRegistro: D(20) + 'T18:00', descarga: ['07:00', '08:30'], montaje: ['07:00', '12:00'], desmontaje: [D(29), '16:00', '19:00'], controlObjetos: true, objetosNota: '', enlace: token(), publicado: true }
  ];
  return db;
}
/* El resto de los datos de ejemplo se crea con la misma API que usan los formularios, para que sigan exactamente las reglas. */
function seedFlujos() {
  const t = today(), D = n => addD(t, n);
  const are = U('u-are'), fer = U('u-fer'), rh = U('u-rh'), v2 = U('u-vig2'), v1 = U('u-vig1');
  // Staff: Are programa a Jimena en dos eventos
  const s1 = api.enviarProgramacion(are, { departamento: 'Ludoteca', mes: t.slice(0, 7), motivo: 'Apoyo en eventos de Ludoteca', personas: [
    { nueva: { nombre: 'Jimena Robles (ficticio)', tel: '5550101010', correo: 'jimena.robles@ejemplo.com', puesto: 'Auxiliar de Ludoteca', idNomina: '', tipoNomina: '' }, correoPase: 'jimena.robles@ejemplo.com',
      jornadas: [{ eventoId: 'EV-MCH', funcion: 'Apoyo en estaciones de cocina', fecha: t, hini: '00:30', hfin: '23:30', obs: 'Jornada amplia para la demostración' }, { eventoId: 'EV-MCH', funcion: 'Apoyo en estaciones de cocina', fecha: D(1), hini: '10:00', hfin: '14:00', obs: '' }, { eventoId: 'EV-HAL', funcion: 'Coordinación de juegos', fecha: D(14), hini: '16:00', hfin: '20:00', obs: '' }] }
  ] });
  api.decidir(rh, s1.folio, { decision: 'autorizado', confirmado: true });
  const jim = s1.participantes()[0];
  api.registrarMov(v1, { folio: s1.folio, personaId: jim.personaId, tipo: 'entrada', idVerificado: true, materialOk: true, motivo: '' });
  // Staff: guardia sin evento, pendiente
  api.enviarProgramacion(U('u-fd'), { departamento: 'Fomento Deportivo', mes: D(7).slice(0, 7), motivo: 'Guardia de fin de semana', personas: [
    { nueva: { nombre: 'Diego Salinas (ficticio)', tel: '5550202020', correo: 'diego.salinas@ejemplo.com', puesto: 'Salvavidas eventual', idNomina: '', tipoNomina: '' }, correoPase: 'diego.salinas@ejemplo.com',
      jornadas: [{ eventoId: null, actividad: 'Guardia de alberca (sin evento)', funcion: 'Salvavidas', fecha: D(7), hini: '08:00', hfin: '14:00', obs: '' }, { eventoId: 'EV-NAT', funcion: 'Apoyo en clínica', fecha: D(8), hini: '09:00', hfin: '12:00', obs: '' }] }
  ] });
  // Proveedores
  const p1 = api.recibirFormulario('proveedores', { modalidad: 'entrega', empresa: { razon: 'Uniformes Ejemplo S.A. de C.V.', comercial: 'Uniformes Ejemplo', contratista: '' }, contacto: { nombre: 'Rosa Díaz (ficticio)', correo: 'rosa.diaz@ejemplo.com', tel: '5550303030' }, personas: [{ nombre: 'Rosa Díaz (ficticio)', tel: '5550303030', correo: 'rosa.diaz@ejemplo.com', responsable: true }], recibe: { area: 'Ludoteca', persona: 'Are' }, fini: t, ffin: t, hini: '00:30', hfin: '23:30', mercancia: [{ desc: 'Playeras de Ludoteca', cant: 30, marca: '' }], retira: [], equipo: [], vehiculos: [{ marca: 'Nissan', modelo: 'March', color: 'Gris', placas: 'ABC-123-D' }], obs: '' });
  api.decidir(rh, p1.folio, { decision: 'autorizado', confirmado: true, puerta: 'Acceso de servicio' });
  api.recibirFormulario('proveedores', { modalidad: 'instalacion', empresa: { razon: 'Inflables Ejemplo S. de R.L.', comercial: 'Inflables Ejemplo', contratista: 'Inflables Ejemplo' }, contacto: { nombre: 'Hugo Reyes (ficticio)', correo: 'hugo.reyes@ejemplo.com', tel: '5550404040' }, personas: [{ nombre: 'Hugo Reyes (ficticio)', tel: '5550404040', correo: 'hugo.reyes@ejemplo.com', responsable: true }, { nombre: 'Pedro Ávila (ficticio)', tel: '', correo: '', responsable: false }], recibe: { area: 'Ludoteca', persona: 'Are' }, fini: D(14), ffin: D(15), hini: '08:00', hfin: '21:00', mercancia: [], retira: [{ desc: 'Inflable tipo castillo', cant: 1, marca: '' }, { desc: 'Soplador eléctrico', cant: 2, marca: '' }], equipo: [{ desc: 'Caja de herramienta', cant: 1, marca: '' }], vehiculos: [{ marca: 'Ford', modelo: 'F-350', color: 'Blanco', placas: 'INF-22-10' }], obs: 'Se retira el día siguiente.' });
  const p3 = api.recibirFormulario('proveedores', { modalidad: 'paqueteria', empresa: { razon: 'Papelería Ejemplo S.A.', comercial: 'Papelería Ejemplo', contratista: '' }, contacto: { nombre: 'Ventas Papelería (ficticio)', correo: 'ventas@ejemplo.com', tel: '5550505050' }, personas: [], recibe: { area: 'Ludoteca', persona: 'Are' }, fini: t, ffin: D(1), hini: '09:00', hfin: '18:00', paq: { guia: 'EJ-7781-2290', paqueteria: 'Paquetería ejemplo', bultos: 3 }, mercancia: [{ desc: 'Material didáctico', cant: 3, marca: '' }], retira: [], equipo: [], vehiculos: [], obs: '' });
  api.decidir(rh, p3.folio, { decision: 'autorizado', confirmado: true, condiciones: 'Entrega en caseta. El repartidor no ingresa.' });
  // Patrocinadores del Torneo de Otoño (registro ya cerrado: se registran con fecha anterior)
  const oto = db.torneos.find(x => x.eventoId === 'EV-OTO');
  // [razón social, responsable, participante, requiere descarga, vehículos]
  const spons = [
    ['Bebidas del Valle S.A. de C.V.', 'Fernanda Ibarra (ficticio)', 'Óscar Luna (ficticio)', true, 1],
    ['Seguros Horizonte S.A.', 'Gabriela Núñez (ficticio)', 'Tomás Vega (ficticio)', true, 1],
    ['Autos Ejemplo S.A. de C.V.', 'Ricardo Mora (ficticio)', 'Elena Cruz (ficticio)', true, 2],
    ['Relojes Ejemplo S.A.', 'Sergio Lara (ficticio)', '', true, 1],
    ['Ferretería Ejemplo S.A.', 'Mónica Ríos (ficticio)', '', true, 2],
    ['Joyería Ejemplo S.A.', 'Raúl Peña (ficticio)', '', true, 2],
    ['Café Ejemplo S. de R.L.', 'Paola Méndez (ficticio)', '', false, 1]
  ];
  const regs = spons.map((x, i) => api.recibirFormulario('patrocinadores', { enlace: oto.enlace, _forzarFecha: D(-3) + 'T1' + i + ':00', empresa: { razon: x[0] }, personas: [{ nombre: x[1], tel: '55506060' + pad(i), correo: 'resp' + i + '@ejemplo.com', responsable: true }].concat(x[2] ? [{ nombre: x[2], tel: '', correo: '', responsable: false }] : []), idConfirmada: true, vehiculos: Array.from({ length: x[4] }, (_, k) => ({ marca: 'Vehículo', modelo: 'Utilitario', color: '', placas: 'PAT-' + i + k + '-00' })), equipo: [{ desc: 'Toldo', cant: 1, marca: '' }], instalaciones: x[3] ? 'Stand de 3 × 3 m' : 'Mesa de degustación', montaje: { descarga: x[3], necesidades: x[3] ? 'Descarga en explanada' : '' }, objetosCampo: [{ desc: 'Mesa plegable', cant: 2 }, { desc: 'Bandera publicitaria', cant: 1 }], obs: '' }));
  [0, 1, 2, 6].forEach(i => { api.decidir(rh, regs[i].folio, { decision: 'autorizado', confirmado: true }); api.confirmarTurno(fer, regs[i].folio); });
  api.marcarSeguimiento(fer, regs[0].folio, 'llego'); api.marcarSeguimiento(fer, regs[0].folio, 'listo');
  const r0 = solByFolio(regs[0].folio); const pr0 = db.participantes.find(p => p.folio === r0.folio);
  api.registrarMov(v2, { folio: r0.folio, personaId: pr0.personaId, tipo: 'entrada', idVerificado: true, materialOk: true, motivo: 'Demostración', forzar: true });
  api.marcarSeguimiento(fer, regs[2].folio, 'llego');
  api.marcarSeguimiento(fer, regs[6].folio, 'llego');
  api.cancelar(fer, regs[1].folio, 'El patrocinador desistió de participar.');
  // Copa Invierno: un registro abierto
  const inv = db.torneos.find(x => x.eventoId === 'EV-INV');
  api.recibirFormulario('patrocinadores', { enlace: inv.enlace, empresa: { razon: 'Banca Ejemplo S.A.' }, personas: [{ nombre: 'Andrea Solís (ficticio)', tel: '5550707070', correo: 'andrea.solis@ejemplo.com', responsable: true }], idConfirmada: true, vehiculos: [{ marca: 'Toyota', modelo: 'Hiace', color: 'Blanco', placas: 'BAN-77-01' }], equipo: [{ desc: 'Pantalla', cant: 1, marca: '' }], instalaciones: 'Carpa 6 × 3 m', montaje: { descarga: true, necesidades: 'Corriente eléctrica 110 V' }, objetosCampo: [{ desc: 'Carpa', cant: 1 }], obs: '' });
  db.notifs.forEach(n => n.leida = true);
}

/* ---------- almacenamiento local (simulación) ---------- */
let db;
function loadDB() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const d = JSON.parse(raw); if (d && d.v === 2 && d.creado && d.creado.slice(0, 10) === today()) { db = d; return 'local'; } } } catch (e) { }
  resetDB(); return 'seed';
}
function saveDB() { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { } }
function resetDB() { db = seed(); seedFlujos(); db.hist.forEach(h => h.demo = true); saveDB(); }

/* ---------- consultas básicas ---------- */
const U = id => db.usuarios.find(u => u.id === id);
const solByFolio = f => db.solicitudes.find(s => s.folio === f);
const persona = id => db.personas.find(p => p.id === id);
const evento = id => db.eventos.find(e => e.id === id);
const torneo = eid => db.torneos.find(t => t.eventoId === eid);
const empresa = id => db.empresas.find(e => e.id === id);
const partsDe = f => db.participantes.filter(p => p.folio === f);
const jornadasDe = f => db.jornadas.filter(j => j.folio === f).sort((a, b) => (a.fecha + a.hini).localeCompare(b.fecha + b.hini));
const vehDe = f => db.vehiculos.filter(v => v.folio === f);
const matDe = f => db.materiales.filter(m => m.folio === f);
const pasesDe = f => db.pases.filter(p => p.folio === f);
const paseDe = (f, pid) => db.pases.find(p => p.folio === f && p.personaId === pid);
const turnoDe = f => db.turnos.find(t => t.folio === f);
const movsDe = (f, pid) => db.movs.filter(m => m.folio === f && (!pid || m.personaId === pid)).sort((a, b) => a.cuando.localeCompare(b.cuando));
const dentroAhora = (f, pid) => { const l = movsDe(f, pid).at(-1); return !!l && l.tipo === 'entrada'; };
const can = (u, p) => !!u && (!BLOQUEO_POR_PERFIL || (PERM[u.perfil] || []).includes(p));
function need(u, p) { if (!u) throw new PermError('Elija quién está actuando.'); if (!can(u, p)) throw new PermError('Su perfil no tiene permiso para esta acción.'); }
function nombreLog(u) { const b = typeof u === 'string' ? u : u.nombre; const op = (typeof ABStore !== 'undefined' && ABStore.operador()) || ''; return op && !b.includes(op) ? b + ' · ' + op : b; }
function log(usuario, accion, folio, detalle) { db.hist.unshift({ cuando: nowISO(), usuario: nombreLog(usuario), accion, folio: folio || '—', detalle: detalle || '' }); }
function notify(n) { db.notifs.unshift(Object.assign({ id: nid('n'), cuando: nowISO(), estado: 'simulado', leida: false }, n)); }
function nuevoFolio(pref) { db.seq[pref] = (db.seq[pref] || 0) + 1; return `${pref}-26-${String(db.seq[pref]).padStart(4, '0')}`; }
function nombreSol(s) { const e = s.empresaId ? empresa(s.empresaId) : null; return e ? (e.comercial || e.razon) : s.departamento || '—'; }
/* Ficha única de persona: reutiliza si ya existe (mismo nombre y correo o teléfono) */
function upsertPersona(d) {
  const n = norm(d.nombre);
  let p = db.personas.find(x => norm(x.nombre) === n && ((d.correo && norm(x.correo) === norm(d.correo)) || (d.tel && x.tel === d.tel) || (!d.correo && !d.tel)));
  if (p) { ['tel', 'correo', 'puesto'].forEach(k => { if (d[k] && !p[k]) p[k] = d[k]; }); return p; }
  p = { id: nid('per'), nombre: d.nombre.trim(), tel: (d.tel || '').replace(/\D/g, ''), correo: (d.correo || '').trim(), puesto: d.puesto || '', idNomina: d.idNomina || '', tipoNomina: d.tipoNomina || '', idEstado: d.idEstado || 'pendiente', empresaId: d.empresaId || null, creado: nowISO() };
  db.personas.push(p); return p;
}
function upsertEmpresa(e) { const k = norm(e.razon); let x = db.empresas.find(y => norm(y.razon) === k); if (!x) { x = { id: nid('emp'), razon: e.razon.trim(), comercial: (e.comercial || '').trim(), contratista: (e.contratista || '').trim() }; db.empresas.push(x); } return x; }

/* ---------- turnos de torneo ---------- */
function slotsTorneo(tc) { const out = []; for (let m = toMin(tc.ingresoIni); m < toMin(tc.ingresoFin); m += tc.turnoMin) out.push(fromMin(m)); return out; }
function ocupacion(tc) { const o = {}; slotsTorneo(tc).forEach(s => o[s] = 0); db.turnos.filter(t => t.eventoId === tc.eventoId && t.turno && t.estado !== 'cancelado').forEach(t => { o[t.turno] = (o[t.turno] || 0) + t.vehiculos; }); return o; }
function asignarProvisional(s) {
  const tc = torneo(s.eventoId); const veh = vehDe(s.folio).length; const o = ocupacion(tc);
  const descarga = s.montaje && s.montaje.descarga;
  const libre = slotsTorneo(tc).find(sl => (!descarga || (toMin(sl) >= toMin(tc.descarga[0]) && toMin(sl) < toMin(tc.descarga[1]))) && o[sl] + veh <= tc.capVeh);
  const orden = db.turnos.filter(t => t.eventoId === tc.eventoId).length + 1;
  const tr = { folio: s.folio, eventoId: tc.eventoId, turno: libre || null, vehiculos: veh, estado: libre ? 'provisional' : 'espera', orden, recibido: s.entrega, seguimiento: 'programado', historial: [{ cuando: nowISO(), de: null, a: libre || 'Lista de espera', por: 'Sistema', motivo: libre ? 'Asignación provisional por orden de recepción' : 'Sin capacidad en turnos compatibles', comunicado: false }], cambioPendiente: null };
  db.turnos.push(tr); return tr;
}

/* ---------- vigencia (unificada por ventanas autorizadas) ---------- */
function ventanasPersona(s, pid) {
  if (s.tipo === 'staff') return jornadasDe(s.folio).filter(j => j.personaId === pid && j.aut === true).map(j => ({ fecha: j.fecha, hini: j.hini, hfin: j.hfin, jornadaId: j.id, etiqueta: (j.eventoId ? evento(j.eventoId).nombre : j.actividad) + ' · ' + j.funcion }));
  if (!s.aut) return [];
  if (s.tipo === 'patrocinio') {
    const tc = torneo(s.eventoId); const tr = turnoDe(s.folio); if (!tr || tr.estado !== 'confirmado') return [];
    const ev = evento(s.eventoId); const out = [{ fecha: tc.fechaMontaje, hini: fromMin(Math.max(0, toMin(tr.turno) - tc.tolMin)), hfin: tc.montaje[1], etiqueta: 'Montaje · turno ' + tr.turno }];
    // Días de torneo: de inicio de ingreso a cierre de desmontaje (supuesto, ajustar con Logística)
    for (let d = ev.fini; d <= ev.ffin; d = addD(d, 1)) if (d !== tc.fechaMontaje) out.push({ fecha: d, hini: tc.ingresoIni, hfin: tc.desmontaje[2] || tc.montaje[1], etiqueta: d === tc.desmontaje[0] ? 'Torneo y desmontaje' : 'Día de torneo' });
    if (tc.desmontaje[0] && !out.some(o => o.fecha === tc.desmontaje[0])) out.push({ fecha: tc.desmontaje[0], hini: tc.desmontaje[1], hfin: tc.desmontaje[2], etiqueta: 'Desmontaje' });
    return out;
  }
  const out = []; for (let d = s.aut.fini; d <= s.aut.ffin; d = addD(d, 1)) out.push({ fecha: d, hini: s.aut.hini, hfin: s.aut.hfin, etiqueta: 'Acceso autorizado' }); return out;
}
function vigencia(s, pid, fecha, hora, puerta) {
  const r = { ok: false, codigo: 'no_vigente', motivo: '', avisos: [], ventana: null };
  if (s.estado === 'cancelado') { r.codigo = 'cancelado'; r.motivo = 'Solicitud cancelada'; return r; }
  if (s.estado !== 'autorizado') { r.motivo = s.version > 1 ? 'Cambio en revisión: requiere nueva autorización de RH' : 'Sin autorización de RH (' + ESTADOS[s.estado][0].toLowerCase() + ')'; return r; }
  const part = db.participantes.find(p => p.folio === s.folio && p.personaId === pid);
  if (!part || part.aut !== true) { r.motivo = 'Esta persona no fue autorizada'; return r; }
  if (s.tipo === 'patrocinio') { const tr = turnoDe(s.folio); if (!tr || tr.estado !== 'confirmado') { r.motivo = 'Sin horario confirmado por Logística'; return r; } }
  const ven = ventanasPersona(s, pid); const tol = s.tipo === 'patrocinio' ? 0 : CFG.tolMin;
  const hoy = ven.filter(v => v.fecha === fecha);
  if (!hoy.length) { const prox = ven.filter(v => v.fecha > fecha).sort((a, b) => (a.fecha + a.hini).localeCompare(b.fecha + b.hini))[0]; r.motivo = 'No tiene jornada o acceso autorizado para hoy' + (prox ? ` (siguiente: ${fmtD(prox.fecha)} ${prox.hini}–${prox.hfin})` : ''); return r; }
  const h = toMin(hora); const dentro = hoy.find(v => h >= toMin(v.hini) - tol && h <= toMin(v.hfin) + tol);
  if (!dentro) { r.motivo = 'Fuera del horario autorizado de hoy: ' + hoy.map(v => v.hini + '–' + v.hfin).join(', '); r.codigo = 'fuera_horario'; r.ventanasHoy = hoy; return r; }
  r.ok = true; r.codigo = 'vigente'; r.ventana = dentro;
  const pAut = s.tipo === 'patrocinio' ? torneo(s.eventoId).puerta : s.aut && s.aut.puerta; if (puerta && pAut && puerta !== pAut) r.avisos.push('Puerta autorizada: ' + pAut);
  return r;
}

/* ---------- API simulada ---------- */
const api = {
  /* 1) Formularios con enlace propio. El tipo lo fija el formulario de origen y se vuelve a validar aquí. */
  recibirFormulario(formId, d) {
    const F = FORMULARIOS[formId]; if (!F) throw new RuleError('Formulario desconocido.');
    if (d.tipo && d.tipo !== F.tipo) throw new RuleError('El tipo enviado no corresponde al formulario de origen. Registro rechazado.');
    if (formId === 'staff') throw new RuleError('La programación de staff se envía con enviarProgramacion.');
    const errs = formId === 'proveedores' ? validarProveedor(d) : validarPatrocinador(d); if (errs.length) throw new RuleError(errs.join(' '));
    const emp = upsertEmpresa(d.empresa);
    const folio = nuevoFolio(F.pref); const entrega = d._forzarFecha || nowISO();
    const s = { folio, tipo: F.tipo, formulario: formId, modalidad: d.modalidad || null, eventoId: null, departamento: d.recibe ? d.recibe.area : 'Eventos y patrocinios', solicitanteId: null, contacto: d.contacto || null, empresaId: emp.id, entrega, estado: 'pendiente', version: 1, decisiones: [{ estado: 'pendiente', por: 'Formulario: ' + F.titulo, cuando: entrega, nota: 'Solicitud recibida' }], rhVisto: false, rhNovedad: false, obs: d.obs || '', aut: null, recibe: d.recibe || null, paq: d.paq || null, sol: null, montaje: null, instalaciones: '' };
    if (formId === 'proveedores') { s.sol = { fini: d.fini, ffin: d.ffin, hini: d.hini, hfin: d.hini && d.hfin, puerta: null }; s.sol.hfin = d.hfin; }
    if (formId === 'patrocinadores') {
      const tc = db.torneos.find(x => x.enlace === d.enlace); s.eventoId = tc.eventoId; s.montaje = d.montaje || { descarga: false, necesidades: '' }; s.instalaciones = d.instalaciones || ''; s.idConfirmada = !!d.idConfirmada;
      s.solicitanteId = 'u-fer';
    }
    db.solicitudes.unshift(s);
    (d.personas || []).forEach(p => { const per = upsertPersona({ nombre: p.nombre, tel: p.tel, correo: p.correo, empresaId: emp.id, idEstado: p.responsable ? 'pendiente' : 'no_requerida' }); db.participantes.push({ id: nid('pa'), folio, personaId: per.id, rol: p.responsable ? 'responsable' : 'participante', aut: null, correoPase: (p.correo || '').trim() }); });
    (d.vehiculos || []).forEach(v => db.vehiculos.push({ id: nid('ve'), folio, marca: v.marca, modelo: v.modelo, color: v.color || '', placas: String(v.placas || '').toUpperCase(), aut: null }));
    (d.mercancia || []).forEach(m => db.materiales.push({ id: nid('ma'), folio, clase: 'mercancia', desc: m.desc, cant: +m.cant, marca: m.marca || '' }));
    (d.retira || []).forEach(m => db.materiales.push({ id: nid('ma'), folio, clase: 'retira', desc: m.desc, cant: +m.cant, marca: m.marca || '' }));
    (d.equipo || []).forEach(m => db.materiales.push({ id: nid('ma'), folio, clase: 'equipo', desc: m.desc, cant: +m.cant, marca: m.marca || '' }));
    (d.objetosCampo || []).forEach(m => db.materiales.push({ id: nid('ma'), folio, clase: 'campo', desc: m.desc, cant: +m.cant, marca: '' }));
    let tr = null; if (formId === 'patrocinadores') tr = asignarProvisional(s);
    log('Formulario externo', 'Solicitud recibida por enlace', folio, F.titulo + (tr ? ' · turno ' + (tr.turno || 'en espera') : ''));
    notify({ tipo: 'recibida', para: 'Recursos Humanos', paraPerfil: 'rh', folio, texto: `Nueva solicitud ${folio} desde "${F.titulo}".` });
    const correo = d.contacto ? d.contacto.correo : (d.personas || []).find(p => p.responsable)?.correo;
    if (correo) notify({ tipo: 'recibida', para: correo, folio, texto: `Recibimos su solicitud ${folio}. Enviarla no autoriza el acceso.` + (tr ? (tr.turno ? ` Turno provisional: ${tr.turno}.` : ' Quedó en lista de espera de turno.') : '') });
    saveDB(); return { folio, turno: tr ? { turno: tr.turno, estado: tr.estado } : null };
  },
  /* 2) Programación de staff (Are y otros responsables) */
  verificarTraslapes(personaId, jornadasNuevas) {
    const out = []; const existentes = personaId ? db.jornadas.filter(j => j.personaId === personaId && solByFolio(j.folio) && !['cancelado', 'rechazado'].includes(solByFolio(j.folio).estado) && j.aut !== false) : [];
    jornadasNuevas.forEach((a, i) => { jornadasNuevas.forEach((b, k) => { if (k > i && traslapa(a, b)) out.push(`${fmtD(a.fecha)} ${a.hini}–${a.hfin} se traslapa con ${b.hini}–${b.hfin} en esta misma programación`); }); existentes.forEach(b => { if (traslapa(a, b)) out.push(`${fmtD(a.fecha)} ${a.hini}–${a.hfin} se traslapa con ${b.folio} (${b.hini}–${b.hfin})`); }); });
    return out;
  },
  enviarProgramacion(u, d) {
    need(u, 'staff.programar');
    const errs = []; if (!d.departamento) errs.push('Elija el departamento.'); if (!d.personas || !d.personas.length) errs.push('Agregue al menos una persona con jornadas.');
    (d.personas || []).forEach((p, i) => {
      const nom = p.personaId ? (persona(p.personaId) || {}).nombre : p.nueva && p.nueva.nombre;
      if (!nom) errs.push(`Persona ${i + 1}: falta el nombre.`);
      if (p.nueva && !telOk(p.nueva.tel)) errs.push(`${nom || 'Persona ' + (i + 1)}: el teléfono debe tener 10 dígitos.`);
      if (!emailOk(p.correoPase)) errs.push(`${nom || 'Persona ' + (i + 1)}: escriba el correo donde recibirá su pase.`);
      if (!p.jornadas || !p.jornadas.length) errs.push(`${nom}: agregue al menos una jornada.`);
      (p.jornadas || []).forEach((j, k) => { if (!j.fecha || !j.hini || !j.hfin || !j.funcion) errs.push(`${nom}, jornada ${k + 1}: fecha, horario y función son obligatorios.`); else if (toMin(j.hfin) <= toMin(j.hini)) errs.push(`${nom}, jornada ${k + 1}: la hora de término debe ser posterior a la de inicio.`); if (!j.eventoId && !String(j.actividad || '').trim()) errs.push(`${nom}, jornada ${k + 1}: elija un evento o describa la guardia o actividad.`); if (j.eventoId && !evento(j.eventoId)) errs.push(`Evento inexistente en la jornada ${k + 1}.`); });
      const tras = api.verificarTraslapes(p.personaId, p.jornadas || []); if (tras.length && !d.aceptarTraslapes) errs.push(`${nom}: hay horarios traslapados (${tras.join('; ')}). Corríjalos o confirme que son intencionales.`);
    });
    if (errs.length) throw new RuleError(errs.join(' '));
    const folio = nuevoFolio('STF');
    const s = { folio, tipo: 'staff', formulario: 'staff', modalidad: null, eventoId: null, departamento: d.departamento, solicitanteId: u.id, contacto: null, empresaId: null, entrega: nowISO(), estado: 'pendiente', version: 1, decisiones: [{ estado: 'pendiente', por: u.nombre, cuando: nowISO(), nota: 'Programación enviada a RH' }], rhVisto: false, rhNovedad: false, obs: d.motivo || '', mes: d.mes, aut: null };
    db.solicitudes.unshift(s);
    d.personas.forEach(p => {
      let per;
      if (p.personaId) { per = persona(p.personaId); if (p.actualizar) { Object.entries(p.actualizar).forEach(([k, v]) => { if (v && per[k] !== v) { log(u, 'Ficha actualizada', folio, `${per.nombre}: ${k}`); per[k] = v; } }); } }
      else per = upsertPersona(Object.assign({ idEstado: 'pendiente' }, p.nueva));
      db.participantes.push({ id: nid('pa'), folio, personaId: per.id, rol: 'trabajador', aut: null, correoPase: p.correoPase.trim() });
      p.jornadas.forEach(j => db.jornadas.push({ id: nid('jo'), folio, personaId: per.id, eventoId: j.eventoId || null, actividad: j.eventoId ? '' : j.actividad.trim(), funcion: j.funcion.trim(), fecha: j.fecha, hini: j.hini, hfin: j.hfin, obs: j.obs || '', aut: null }));
    });
    // Borrador de pago vinculado (no se calcula nada todavía)
    const pago = { id: nid('pg'), folioPago: nuevoFolio('PAG'), origen: folio, departamento: d.departamento, motivo: d.motivo || '', obsGenerales: '', fechaSolicitud: today(), solicitanteId: u.id, estado: 'borrador', consolidado: false, creado: nowISO() };
    db.pagos.unshift(pago);
    jornadasDe(folio).forEach(j => db.lineasPago.push({ id: nid('lp'), pagoId: pago.id, jornadaId: j.id, personaId: j.personaId, modalidad: '', tarifa: null, unidades: null, importeAutorizado: null, confirmServicio: null, validaAsistencia: null, autorizacion: null, pagoReg: null, obs: '', estado: 'pendiente_asistencia' }));
    log(u, 'Programación enviada a RH', folio, `${d.personas.length} persona(s), ${jornadasDe(folio).length} jornada(s); borrador ${pago.folioPago}`);
    notify({ tipo: 'recibida', para: 'Recursos Humanos', paraPerfil: 'rh', folio, texto: `${u.nombre} envió la programación ${folio} (${jornadasDe(folio).length} jornadas).` });
    notify({ tipo: 'recibida', para: u.nombre, paraUserId: u.id, folio, texto: `Su programación ${folio} quedó pendiente de RH. Se creó el borrador de pago ${pago.folioPago}.` });
    saveDB();
    return { folio, pago: pago.folioPago, participantes: () => partsDe(folio) };
  },
  /* 3) Autorización de RH */
  marcarVisto(u, folio) { const s = solByFolio(folio); if (s && (!s.rhVisto || s.rhNovedad) && u && u.perfil === 'rh') { s.rhVisto = true; s.rhNovedad = false; saveDB(); } },
  decidir(u, folio, o) {
    need(u, 'sol.decidir');
    const s = solByFolio(folio); if (!s) throw new RuleError('No existe el folio.');
    if (s.solicitanteId && s.solicitanteId === u.id) throw new RuleError('No puede decidir sobre una solicitud que usted envió.');
    if (o.confirmado !== true) throw new RuleError('La decisión no se aplicó: falta confirmarla con su cuenta.');
    if (!['pendiente', 'correccion'].includes(s.estado)) throw new RuleError('Solo se deciden solicitudes pendientes.');
    if (['correccion', 'rechazado'].includes(o.decision) && !String(o.nota || '').trim()) throw new RuleError('Escriba el motivo para el solicitante.');
    const cuando = nowISO();
    if (o.decision === 'autorizado') {
      const parts = partsDe(folio);
      if (s.tipo === 'staff') {
        const js = jornadasDe(folio); js.forEach(j => j.aut = o.jornadas ? o.jornadas[j.id] !== false : true);
        if (!js.some(j => j.aut)) throw new RuleError('Autorice al menos una jornada o rechace la solicitud.');
        parts.forEach(p => p.aut = js.some(j => j.personaId === p.personaId && j.aut));
        db.lineasPago.filter(l => js.some(j => j.id === l.jornadaId && j.aut === false)).forEach(l => { l.estado = 'no_pagable'; l.obs = 'Jornada no autorizada por RH'; });
      } else {
        parts.forEach(p => p.aut = o.personas ? o.personas[p.personaId] !== false : true);
        if (s.modalidad !== 'paqueteria' && !parts.some(p => p.aut)) throw new RuleError('Autorice al menos a una persona o rechace la solicitud.');
        vehDe(folio).forEach(v => v.aut = o.vehiculos ? o.vehiculos[v.id] !== false : true);
        if (s.tipo === 'proveedor') s.aut = { fini: o.fini || s.sol.fini, ffin: o.ffin || s.sol.ffin, hini: o.hini || s.sol.hini, hfin: o.hfin || s.sol.hfin, puerta: o.puerta || CFG.puertas[1], reingreso: !!o.reingreso, condiciones: o.condiciones || '' };
        else s.aut = { condiciones: o.condiciones || '' };
        if (s.aut.ffin && s.aut.ffin < s.aut.fini) throw new RuleError('La fecha de término autorizada es anterior a la de inicio.');
      }
      s.aut = Object.assign(s.aut || {}, { por: u.nombre, cuando, version: s.version });
      s.estado = 'autorizado'; s.decisiones.push({ estado: 'autorizado', por: u.nombre, cuando, nota: o.nota || '' });
      log(u, 'Acceso autorizado', folio, `${parts.filter(p => p.aut).length} de ${parts.length} personas · versión ${s.version}`);
      const sol = s.solicitanteId ? U(s.solicitanteId) : null;
      if (sol) notify({ tipo: 'autorizacion', para: sol.nombre, paraUserId: sol.id, folio, texto: `RH autorizó ${folio}.` + (s.tipo === 'staff' ? ' El pase se envía directamente al correo de cada trabajador; usted no tiene que reenviarlo.' : '') });
      api._habilitarPases(u, folio);
    } else {
      s.estado = o.decision; s.decisiones.push({ estado: o.decision, por: u.nombre, cuando, nota: o.nota });
      log(u, ESTADOS[o.decision][0], folio, o.nota);
      if (o.decision === 'rechazado') db.lineasPago.filter(l => jornadasDe(folio).some(j => j.id === l.jornadaId)).forEach(l => { l.estado = 'no_pagable'; l.obs = 'Solicitud rechazada'; });
      const sol = s.solicitanteId ? U(s.solicitanteId) : null;
      notify({ tipo: o.decision === 'correccion' ? 'correccion' : 'rechazo', para: sol ? sol.nombre : (s.contacto ? s.contacto.correo : 'Solicitante'), paraUserId: sol ? sol.id : null, folio, texto: `${ESTADOS[o.decision][0]} en ${folio}: ${o.nota}` });
    }
    s.rhVisto = true; s.rhNovedad = false; saveDB(); return s;
  },
  /* Pases: permiso autorizado ≠ pase generado ≠ pase enviado */
  _habilitarPases(u, folio) {
    const s = solByFolio(folio); if (s.estado !== 'autorizado') return;
    const tr = s.tipo === 'patrocinio' ? turnoDe(folio) : null;
    partsDe(folio).forEach(p => {
      let pa = paseDe(folio, p.personaId);
      if (!p.aut) { if (pa && pa.token) pa.estado = 'revocado'; return; }
      if (s.tipo === 'patrocinio' && (!tr || tr.estado !== 'confirmado')) { if (!pa) { pa = { id: nid('ps'), folio, personaId: p.personaId, token: null, estado: 'espera_horario', destinatario: '', intentos: 0, historial: [] }; db.pases.push(pa); } else pa.estado = 'espera_horario'; return; }
      if (!pa) { pa = { id: nid('ps'), folio, personaId: p.personaId, token: null, estado: 'sin_pase', destinatario: '', intentos: 0, historial: [] }; db.pases.push(pa); }
      if (!pa.token) pa.token = token();
      if (pa.estado !== 'enviado') { pa.estado = 'generado'; pa.historial.push({ cuando: nowISO(), resultado: 'generado' }); }
    });
    api.enviarPases(u, folio, true);
  },
  enviarPases(u, folio, interno) {
    if (!interno) need(u, 'pase.enviar');
    const s = solByFolio(folio); if (s.estado !== 'autorizado') throw new RuleError('El pase solo se envía con una autorización vigente.');
    const resp = partsDe(folio).find(p => p.rol === 'responsable' && emailOk(p.correoPase || persona(p.personaId).correo));
    const out = { enviados: 0, fallidos: 0 };
    pasesDe(folio).filter(pa => ['generado', 'fallido'].includes(pa.estado)).forEach(pa => {
      const part = db.participantes.find(p => p.folio === folio && p.personaId === pa.personaId);
      const per = persona(pa.personaId);
      const dest = emailOk(part.correoPase) ? part.correoPase : emailOk(per.correo) ? per.correo : resp ? (resp.correoPase || persona(resp.personaId).correo) : (part.correoPase || '');
      pa.intentos++; pa.destinatario = dest;
      if (emailOk(dest)) { pa.estado = 'enviado'; out.enviados++; pa.historial.push({ cuando: nowISO(), resultado: 'enviado', a: dest }); notify({ tipo: 'pase_enviado', para: dest, folio, texto: `Pase de ${per.nombre} enviado a ${dest} (simulado).` }); }
      else { pa.estado = 'fallido'; out.fallidos++; pa.historial.push({ cuando: nowISO(), resultado: 'fallido', a: dest }); notify({ tipo: 'pase_fallido', para: 'Recursos Humanos', paraPerfil: 'rh', folio, estado: 'fallido', texto: `No se pudo enviar el pase de ${per.nombre}${dest ? ' a ' + dest : ': sin correo'}.` }); }
    });
    if (s.tipo === 'staff' && out.enviados && s.solicitanteId) notify({ tipo: 'pase_enviado', para: U(s.solicitanteId).nombre, paraUserId: s.solicitanteId, folio, texto: `Confirmación: ${out.enviados} pase(s) de ${folio} se enviaron directamente a los trabajadores.` });
    log(u, 'Envío de pases (simulado)', folio, `${out.enviados} enviados, ${out.fallidos} fallidos`);
    saveDB(); return out;
  },
  corregirCorreoPase(u, folio, personaId, correo) {
    if (!emailOk(correo)) throw new RuleError('Escriba un correo válido, por ejemplo nombre@empresa.com.');
    const p = db.participantes.find(x => x.folio === folio && x.personaId === personaId); p.correoPase = correo.trim();
    const per = persona(personaId); if (!emailOk(per.correo)) per.correo = correo.trim();
    log(u, 'Destinatario del pase corregido', folio, per.nombre); saveDB();
    const pa = paseDe(folio, personaId); if (pa && pa.estado === 'fallido') return api.enviarPases(u, folio, true);
    return { enviados: 0, fallidos: 0 };
  },
  cancelar(u, folio, motivo) {
    const s = solByFolio(folio); if (!s) throw new RuleError('No existe el folio.');
    if (['cancelado', 'rechazado'].includes(s.estado)) throw new RuleError('La solicitud ya está ' + ESTADOS[s.estado][0].toLowerCase() + '.');
    if (!String(motivo || '').trim()) throw new RuleError('Escriba el motivo de la cancelación.');
    s.estado = 'cancelado'; s.decisiones.push({ estado: 'cancelado', por: u.nombre, cuando: nowISO(), nota: motivo });
    pasesDe(folio).forEach(p => { if (p.token) p.estado = 'revocado'; });
    const tr = turnoDe(folio); if (tr) { tr.estado = 'cancelado'; tr.historial.push({ cuando: nowISO(), de: tr.turno, a: 'Cancelado', por: u.nombre, motivo, comunicado: true }); }
    db.lineasPago.filter(l => jornadasDe(folio).some(j => j.id === l.jornadaId) && ['pendiente_asistencia'].includes(l.estado)).forEach(l => { l.estado = 'no_pagable'; l.obs = 'Solicitud cancelada'; });
    partsDe(folio).filter(p => dentroAhora(folio, p.personaId)).forEach(p => db.incid.unshift({ id: nid('in'), folio, nombre: persona(p.personaId).nombre, tipo: 'Cancelación con persona dentro', desc: 'Registrar su salida y avisar al responsable.', cuando: nowISO(), por: u.nombre, estado: 'abierta' }));
    log(u, 'Cancelado', folio, motivo);
    notify({ tipo: 'cancelacion', para: 'Vigilancia', paraPerfil: 'vigilancia', folio, texto: `${folio} fue cancelado; caseta ya no lo ve vigente.` });
    saveDB(); return s;
  },
  /* Cambio de jornadas después de autorizar: vuelve a revisión y suspende pases */
  modificarJornadas(u, folio, cambios) {
    const s = solByFolio(folio); if (s.tipo !== 'staff') throw new RuleError('Solo aplica a staff.');
    if (s.solicitanteId !== u.id) throw new RuleError('Solo quien envió la programación puede modificarla.');
    if (['cancelado', 'rechazado'].includes(s.estado)) throw new RuleError('No se puede modificar.');
    (cambios.agregar || []).forEach(j => { const per = j.personaId; const tras = api.verificarTraslapes(per, [j]); if (tras.length) throw new RuleError('Traslape: ' + tras.join('; ')); const nj = { id: nid('jo'), folio, personaId: per, eventoId: j.eventoId || null, actividad: j.actividad || '', funcion: j.funcion, fecha: j.fecha, hini: j.hini, hfin: j.hfin, obs: j.obs || '', aut: null }; db.jornadas.push(nj); const pago = db.pagos.find(p => p.origen === folio && !['cancelado'].includes(p.estado)); if (pago) db.lineasPago.push({ id: nid('lp'), pagoId: pago.id, jornadaId: nj.id, personaId: per, modalidad: '', tarifa: null, unidades: null, importeAutorizado: null, confirmServicio: null, validaAsistencia: null, autorizacion: null, pagoReg: null, obs: '', estado: 'pendiente_asistencia' }); });
    if (s.estado === 'autorizado') { s.estado = 'pendiente'; s.version++; s.rhNovedad = true; pasesDe(folio).forEach(p => { if (p.token) p.estado = 'suspendido'; }); s.decisiones.push({ estado: 'pendiente', por: u.nombre, cuando: nowISO(), nota: 'Se agregaron jornadas: requiere nueva autorización' }); }
    log(u, 'Jornadas modificadas', folio, `${(cambios.agregar || []).length} nueva(s)`); saveDB(); return s;
  },
  /* 4) Turnos de patrocinadores (Fer) */
  configurarTorneo(u, eventoId, cfg) {
    need(u, 'torneo.configurar'); const ev = evento(eventoId); if (!ev || ev.tipo !== 'torneo') throw new RuleError('Elija un torneo del catálogo.');
    const errs = []; ['fechaMontaje', 'puerta', 'zona', 'ingresoIni', 'ingresoFin', 'cierreRegistro'].forEach(k => { if (!cfg[k]) errs.push('Falta ' + k + '.'); });
    if (!(cfg.turnoMin > 0)) errs.push('La duración del turno debe ser mayor a cero.'); if (!(cfg.capVeh > 0)) errs.push('Indique la capacidad de vehículos por turno.');
    if (toMin(cfg.ingresoFin) <= toMin(cfg.ingresoIni)) errs.push('El cierre del ingreso debe ser posterior al inicio.');
    if (errs.length) throw new RuleError(errs.join(' '));
    let tc = torneo(eventoId); if (!tc) { tc = { eventoId, enlace: token(), publicado: false }; db.torneos.push(tc); }
    Object.assign(tc, cfg); log(u, 'Torneo configurado', eventoId, ev.nombre); saveDB(); return tc;
  },
  publicarEnlace(u, eventoId) { need(u, 'torneo.configurar'); const tc = torneo(eventoId); tc.publicado = true; log(u, 'Enlace de registro preparado', eventoId, tc.enlace); saveDB(); return tc.enlace; },
  confirmarTurno(u, folio) {
    need(u, 'torneo.turnos'); const tr = turnoDe(folio); if (!tr || !tr.turno) throw new RuleError('Este registro no tiene turno asignado.');
    if (tr.estado === 'confirmado') return tr; tr.estado = 'confirmado'; tr.historial.push({ cuando: nowISO(), de: tr.turno, a: tr.turno, por: u.nombre, motivo: 'Turno confirmado', comunicado: true });
    log(u, 'Turno confirmado', folio, tr.turno);
    const s = solByFolio(folio); const resp = partsDe(folio).find(p => p.rol === 'responsable');
    notify({ tipo: 'turno', para: resp ? resp.correoPase : 'Patrocinador', folio, texto: `Su turno de ingreso para ${evento(s.eventoId).nombre} es a las ${tr.turno} (simulado).` });
    if (s.estado === 'autorizado') api._habilitarPases(u, folio); saveDB(); return tr;
  },
  marcarSeguimiento(u, folio, estado) {
    const tr = turnoDe(folio); if (!SEGUIMIENTO[estado]) throw new RuleError('Estado desconocido.');
    if (estado === 'listo') { const s = solByFolio(folio); if (s.estado !== 'autorizado' || tr.estado !== 'confirmado') throw new RuleError('Solo puede marcarse listo un registro autorizado por RH y con turno confirmado.'); }
    tr.seguimiento = estado; tr.historial.push({ cuando: nowISO(), de: null, a: SEGUIMIENTO[estado][0], por: u.nombre, motivo: 'Seguimiento', comunicado: true });
    log(u, 'Seguimiento: ' + SEGUIMIENTO[estado][0], folio, ''); saveDB(); return tr;
  },
  adelantarTurno(u, folio, nuevo, motivo) {
    need(u, 'torneo.turnos'); const s = solByFolio(folio); const tr = turnoDe(folio); const tc = torneo(s.eventoId);
    if (s.estado !== 'autorizado') throw new RuleError('Solo se adelanta a un patrocinador autorizado por RH.');
    if (!['llego', 'listo'].includes(tr.seguimiento)) throw new RuleError('Solo se adelanta a quien ya está presente. Para un ausente, registre una propuesta y comuníquela antes de aplicarla.');
    if (!(toMin(nuevo) < toMin(tr.turno))) throw new RuleError('El nuevo turno debe ser anterior al actual.');
    const o = ocupacion(tc); if (o[nuevo] + tr.vehiculos > tc.capVeh) throw new RuleError('El turno elegido no tiene capacidad de vehículos.');
    if (!String(motivo || '').trim()) throw new RuleError('Escriba el motivo del cambio.');
    tr.historial.push({ cuando: nowISO(), de: tr.turno, a: nuevo, por: u.nombre, motivo, comunicado: true }); const de = tr.turno; tr.turno = nuevo;
    log(u, 'Turno adelantado', folio, `${de} → ${nuevo}: ${motivo}`);
    notify({ tipo: 'turno', para: 'Vigilancia', paraPerfil: 'vigilancia', folio, texto: `${folio} adelantó su turno de ${de} a ${nuevo}. El pase vigente ya refleja el cambio.` });
    saveDB(); return tr;
  },
  proponerCambio(u, folio, nuevo, motivo) {
    need(u, 'torneo.turnos'); const tr = turnoDe(folio); if (!String(motivo || '').trim()) throw new RuleError('Escriba el motivo.');
    tr.cambioPendiente = { a: nuevo, motivo, por: u.nombre, cuando: nowISO() }; log(u, 'Cambio de turno propuesto (sin aplicar)', folio, `${tr.turno} → ${nuevo}`); saveDB(); return tr;
  },
  aplicarCambioComunicado(u, folio, comunicado) {
    need(u, 'torneo.turnos'); const tr = turnoDe(folio); const p = tr.cambioPendiente; if (!p) throw new RuleError('No hay cambio pendiente.');
    if (!comunicado) throw new RuleError('El cambio no se aplica hasta confirmar que se comunicó al patrocinador. Su turno actual sigue vigente.');
    const tc = torneo(tr.eventoId); const o = ocupacion(tc); if (o[p.a] + tr.vehiculos > tc.capVeh) throw new RuleError('El turno propuesto ya no tiene capacidad.');
    tr.historial.push({ cuando: nowISO(), de: tr.turno, a: p.a, por: u.nombre, motivo: p.motivo, comunicado: true }); tr.turno = p.a; tr.cambioPendiente = null; if (tr.estado === 'espera') tr.estado = 'provisional';
    log(u, 'Cambio de turno comunicado y aplicado', folio, p.a); saveDB(); return tr;
  },
  /* 5) Caseta */
  accesosHoy() {
    const t = today(); const out = [];
    db.solicitudes.forEach(s => { if (!['autorizado', 'cancelado'].includes(s.estado) && !(s.estado === 'pendiente' && s.version > 1)) return;
      partsDe(s.folio).forEach(p => {
        const ven = s.estado === 'autorizado' ? ventanasPersona(s, p.personaId).filter(v => v.fecha === t) : [];
        const dentro = dentroAhora(s.folio, p.personaId); const autDecidido = s.decisiones.some(d => d.estado === 'autorizado');
        if (!ven.length && !dentro && !(s.estado === 'cancelado' && autDecidido && cubreHoy(s)) && !(s.estado === 'pendiente' && cubreHoy(s)) && !(s.estado === 'autorizado' && p.aut === false && cubreHoy(s))) return;
        let est; if (dentro) est = 'dentro'; else if (s.estado === 'cancelado') est = 'cancelado'; else if (s.estado !== 'autorizado') est = 'en_revision'; else if (p.aut !== true) est = 'no_autorizado';
        else if (s.tipo === 'patrocinio' && turnoDe(s.folio).estado !== 'confirmado') est = 'sin_horario'; else if (movsDe(s.folio, p.personaId).some(m => m.tipo === 'salida' && m.cuando.startsWith(t))) est = 'salio'; else est = 'esperado';
        out.push({ s, p, per: persona(p.personaId), est, ventanas: ven, ultimo: movsDe(s.folio, p.personaId).at(-1) || null });
      }); });
    return out;
  },
  dentro() { const out = []; db.participantes.forEach(p => { const l = movsDe(p.folio, p.personaId).at(-1); if (l && l.tipo === 'entrada') { const s = solByFolio(p.folio); const ven = ventanasPersona(s, p.personaId).filter(v => v.fecha === l.cuando.slice(0, 10)); const fin = ven.length ? ven.map(v => v.hfin).sort().at(-1) : null; const vencida = l.cuando.slice(0, 10) < today() || (fin && toMin(nowHM()) > toMin(fin) + CFG.tolMin); out.push({ s, p, per: persona(p.personaId), entrada: l.cuando, puerta: l.puerta, fin, vencida }); } }); return out.sort((a, b) => (b.vencida - a.vencida) || a.entrada.localeCompare(b.entrada)); },
  validarQR(u, ref, opts = {}) {
    need(u, 'qr.validar'); if (opts.fallo) return { codigo: 'error', motivo: 'No se pudo verificar: sin conexión con la base de autorizaciones.' };
    const tk = String(ref || '').replace(CFG.qrPrefijo, '').trim().toUpperCase(); if (!tk) return { codigo: 'no_encontrado', motivo: 'Escriba o lea una referencia.' };
    const pa = db.pases.find(p => p.token === tk); if (!pa) return { codigo: 'no_encontrado', motivo: 'La referencia no corresponde a ningún pase. Busque por nombre o folio.' };
    const s = solByFolio(pa.folio); const v = vigencia(s, pa.personaId, today(), nowHM(), u.puerta);
    if (pa.estado === 'revocado' && v.codigo !== 'cancelado') { v.ok = false; v.codigo = 'no_vigente'; v.motivo = 'Pase revocado'; }
    if (pa.estado === 'suspendido') { v.ok = false; v.codigo = 'no_vigente'; v.motivo = 'Pase suspendido: hay un cambio en revisión de RH'; }
    log(u, 'Consulta de pase', s.folio, persona(pa.personaId).nombre + ' · ' + v.codigo); saveDB();
    return Object.assign(v, { folio: s.folio, personaId: pa.personaId, nombre: persona(pa.personaId).nombre, tipo: s.tipo, empresa: nombreSol(s), ventanasHoy: ventanasPersona(s, pa.personaId).filter(x => x.fecha === today()) });
  },
  registrarMov(u, o) {
    need(u, 'caseta.registrar'); const s = solByFolio(o.folio); if (!s) throw new RuleError('No existe el folio.');
    const part = db.participantes.find(p => p.folio === o.folio && p.personaId === o.personaId); if (!part) throw new RuleError('La persona no pertenece a este folio.');
    const per = persona(o.personaId); const dentro = dentroAhora(o.folio, o.personaId); let jornadaId = null;
    if (o.tipo === 'entrada') {
      if (dentro) throw new RuleError(`${per.nombre} ya tiene una entrada sin salida.`);
      const v = vigencia(s, o.personaId, today(), nowHM(), u.puerta);
      if (!v.ok && !(o.forzar && v.codigo === 'fuera_horario')) throw new RuleError('No se puede registrar la entrada: ' + v.motivo + '.');
      if (!o.idVerificado) throw new RuleError('Confirme que verificó la identificación oficial contra el nombre autorizado.');
      const salioHoy = movsDe(o.folio, o.personaId).some(m => m.tipo === 'salida' && m.cuando.startsWith(today()));
      if (salioHoy && s.tipo === 'proveedor' && !(s.aut && s.aut.reingreso)) throw new RuleError('Reingreso no autorizado: ya salió hoy.');
      if (v.avisos.length && !String(o.motivo || '').trim()) throw new RuleError('Hay avisos (' + v.avisos.join('; ') + '). Escriba el motivo para continuar.');
      if (v.avisos.length) db.incid.unshift({ id: nid('in'), folio: s.folio, nombre: per.nombre, tipo: v.avisos.join('; '), desc: o.motivo, cuando: nowISO(), por: u.nombre, estado: 'abierta' });
      jornadaId = v.ventana && v.ventana.jornadaId || null;
      if (s.tipo === 'patrocinio') { const tr = turnoDe(s.folio); tr.seguimiento = 'ingreso'; }
    } else { if (!dentro) throw new RuleError(`${per.nombre} no tiene una entrada abierta.`); jornadaId = movsDe(o.folio, o.personaId).at(-1).jornadaId; }
    if (matDe(s.folio).length && o.materialOk === false) db.incid.unshift({ id: nid('in'), folio: s.folio, nombre: per.nombre, tipo: 'Material no coincide (' + o.tipo + ')', desc: o.obs || 'Sin observaciones', cuando: nowISO(), por: u.nombre, estado: 'abierta' });
    const m = { id: nid('mv'), folio: s.folio, personaId: o.personaId, jornadaId, tipo: o.tipo, cuando: nowISO(), puerta: u.puerta || '—', oficial: u.nombre, idVerificado: !!o.idVerificado, materialOk: matDe(s.folio).length ? o.materialOk !== false : null, obs: o.obs || '' };
    db.movs.push(m); log(u, o.tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada', s.folio, per.nombre);
    notify({ tipo: o.tipo, para: s.solicitanteId ? U(s.solicitanteId).nombre : 'Contacto', paraUserId: s.solicitanteId, folio: s.folio, texto: `${o.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada: ${per.nombre} · ${m.puerta}.` });
    saveDB(); return m;
  },
  recibirPaquete(u, folio) { need(u, 'paq.recibir'); const s = solByFolio(folio); if (!s || !s.paq) throw new RuleError('No hay entrega esperada con ese folio.'); if (s.estado !== 'autorizado') throw new RuleError('La entrega no está autorizada.'); if (s.paq.recibido) throw new RuleError('Esta entrega ya se registró como recibida.'); s.paq.recibido = { por: u.nombre, cuando: nowISO() }; log(u, 'Paquete recibido en caseta', folio, 'Guía ' + s.paq.guia); saveDB(); },
  /* 6) Pagos: tres procesos separados */
  asistenciaDeJornada(j) { const ms = db.movs.filter(m => m.folio === j.folio && m.personaId === j.personaId && (m.jornadaId === j.id || (!m.jornadaId && m.cuando.startsWith(j.fecha)))).sort((a, b) => a.cuando.localeCompare(b.cuando)); const e = ms.find(m => m.tipo === 'entrada'); const sa = ms.filter(m => m.tipo === 'salida').at(-1); return { entrada: e ? e.cuando : null, salida: sa ? sa.cuando : null }; },
  confirmarServicio(u, lineaId, obs) {
    const l = db.lineasPago.find(x => x.id === lineaId); const j = db.jornadas.find(x => x.id === l.jornadaId); const s = solByFolio(j.folio);
    if (j.aut !== true) throw new RuleError('La jornada no tiene acceso autorizado.');
    const as = api.asistenciaDeJornada(j); if (!as.entrada) throw new RuleError('No hay entrada registrada por Vigilancia para esta jornada. No se puede confirmar el servicio.');
    if (BLOQUEO_POR_PERFIL && u.id !== s.solicitanteId) throw new PermError('Solo el responsable que programó confirma el servicio.');
    l.confirmServicio = { por: u.nombre, cuando: nowISO(), obs: obs || '' }; log(u, 'Servicio confirmado por el responsable', s.folio, persona(j.personaId).nombre + ' · ' + fmtD(j.fecha)); saveDB(); return l;
  },
  validarAsistencia(u, lineaId, d) {
    need(u, 'pago.validar'); const l = db.lineasPago.find(x => x.id === lineaId); const j = db.jornadas.find(x => x.id === l.jornadaId);
    if (!l.confirmServicio) throw new RuleError('Falta la confirmación del servicio por el responsable.');
    const as = api.asistenciaDeJornada(j); if (!as.entrada || !as.salida) throw new RuleError('Faltan la entrada o la salida reales registradas por Vigilancia.');
    if (!['hora', 'jornada', 'evento'].includes(d.modalidad)) throw new RuleError('Elija la modalidad de pago: hora, jornada o evento.');
    if (!(Number(d.unidades) > 0)) throw new RuleError('Escriba las unidades pagables validadas. No se calculan automáticamente con la permanencia.');
    if (d.tarifa === '' || d.tarifa == null || !(Number(d.tarifa) >= 0)) throw new RuleError('Escriba la tarifa acordada. El sistema no propone tarifas.');
    Object.assign(l, { modalidad: d.modalidad, unidades: Number(d.unidades), tarifa: Number(d.tarifa), obs: d.obs || l.obs, validaAsistencia: { por: u.nombre, cuando: nowISO() }, estado: 'asistencia_validada' });
    log(u, 'Asistencia y unidades validadas', j.folio, `${persona(j.personaId).nombre} · ${fmtD(j.fecha)} · ${l.unidades} ${l.modalidad}`); saveDB(); return l;
  },
  autorizarPago(u, lineaId, importe, obs) {
    need(u, 'pago.autorizar'); const l = db.lineasPago.find(x => x.id === lineaId);
    if (l.estado !== 'asistencia_validada') throw new RuleError('Primero valide asistencia y unidades.');
    if (!(Number(importe) >= 0) || importe === '') throw new RuleError('Escriba el importe autorizado.');
    if (l.validaAsistencia && l.validaAsistencia.por === u.nombre && BLOQUEO_POR_PERFIL) throw new RuleError('Quien valida la asistencia no autoriza el mismo pago.');
    l.importeAutorizado = Number(importe); l.autorizacion = { por: u.nombre, cuando: nowISO(), obs: obs || '' }; l.estado = 'autorizado';
    log(u, 'Importe autorizado', '—', `${persona(l.personaId).nombre} · ${money(l.importeAutorizado)}`); saveDB(); return l;
  },
  registrarPago(u, lineaId, fecha, referencia) {
    need(u, 'pago.autorizar'); const l = db.lineasPago.find(x => x.id === lineaId);
    if (l.estado !== 'autorizado') throw new RuleError('Solo se registra el pago de un importe autorizado.');
    if (!fecha || !String(referencia || '').trim()) throw new RuleError('Escriba la fecha y la referencia o comprobante del pago.');
    l.pagoReg = { fecha, referencia: referencia.trim(), por: u.nombre, cuando: nowISO() }; l.estado = 'pagado';
    log(u, 'Pago registrado', '—', `${persona(l.personaId).nombre} · ref. ${referencia}`); saveDB(); return l;
  },
  marcarNoPagable(u, lineaId, motivo) { const l = db.lineasPago.find(x => x.id === lineaId); if (!String(motivo || '').trim()) throw new RuleError('Escriba el motivo.'); if (['autorizado', 'pagado'].includes(l.estado)) throw new RuleError('Ya está autorizado o pagado.'); l.estado = 'no_pagable'; l.obs = motivo; log(u, 'Jornada marcada como no pagable', '—', motivo); saveDB(); },
  pagoActivoDeJornada(jornadaId, exceptPagoId) { return db.lineasPago.find(l => l.jornadaId === jornadaId && l.pagoId !== exceptPagoId && l.estado !== 'no_pagable' && (db.pagos.find(p => p.id === l.pagoId) || {}).estado !== 'cancelado' && !(db.pagos.find(p => p.id === l.pagoId) || {}).absorbido); },
  consolidar(u, f) {
    need(u, 'pago.ver'); if (!f.desde || !f.hasta) throw new RuleError('Indique el periodo.');
    const lineas = db.lineasPago.filter(l => { const j = db.jornadas.find(x => x.id === l.jornadaId); const pg = db.pagos.find(p => p.id === l.pagoId); return j && !pg.consolidado && pg.estado !== 'cancelado' && !pg.absorbido && l.estado !== 'no_pagable' && j.fecha >= f.desde && j.fecha <= f.hasta && (!f.departamento || pg.departamento === f.departamento) && (!f.personaId || l.personaId === f.personaId); });
    if (!lineas.length) throw new RuleError('No hay jornadas disponibles para consolidar con esos filtros (o ya están en una solicitud consolidada activa).');
    const ya = lineas.filter(l => db.lineasPago.some(x => x.jornadaId === l.jornadaId && x.id !== l.id && x.estado !== 'no_pagable' && (db.pagos.find(p => p.id === x.pagoId) || {}).consolidado && (db.pagos.find(p => p.id === x.pagoId) || {}).estado !== 'cancelado'));
    if (ya.length) throw new RuleError('Alguna jornada ya está incluida en otra solicitud de pago activa.');
    const pago = { id: nid('pg'), folioPago: nuevoFolio('PAG'), origen: 'Consolidado', departamento: f.departamento || 'Varios', motivo: f.motivo || 'Pago de días adicionales', obsGenerales: f.obs || '', fechaSolicitud: today(), solicitanteId: u.id, estado: 'borrador', consolidado: true, periodo: [f.desde, f.hasta], personaId: f.personaId || null, creado: nowISO() };
    db.pagos.unshift(pago);
    lineas.forEach(l => { const pgOld = db.pagos.find(p => p.id === l.pagoId); l.pagoId = pago.id; l.origenPago = pgOld.folioPago; });
    db.pagos.filter(p => !p.consolidado && !db.lineasPago.some(l => l.pagoId === p.id)).forEach(p => { p.absorbido = true; p.estado = 'consolidado'; p.consolidadoEn = pago.folioPago; });
    log(u, 'Solicitud de pago consolidada', pago.folioPago, `${lineas.length} jornada(s) · ${f.desde} a ${f.hasta}`); saveDB(); return pago;
  },
  actualizarPersona(u, id, d) { const p = persona(id); ['puesto', 'idNomina', 'tipoNomina', 'tel', 'correo'].forEach(k => { if (d[k] !== undefined && d[k] !== p[k]) p[k] = d[k]; }); log(u, 'Ficha de persona actualizada', '—', p.nombre); saveDB(); return p; },
  incidencia(u, o) { db.incid.unshift({ id: nid('in'), folio: o.folio || '—', nombre: o.nombre || '—', tipo: o.tipo, desc: o.desc, cuando: nowISO(), por: u.nombre, estado: 'abierta' }); log(u, 'Incidencia registrada', o.folio, o.tipo); saveDB(); },
  atender(u, id) { const i = db.incid.find(x => x.id === id); i.estado = 'atendida'; i.atendio = u.nombre; log(u, 'Incidencia atendida', i.folio, i.tipo); saveDB(); },
  guardarEvento(u, e) { if (!e.nombre || !e.fini || !e.area) throw new RuleError('Nombre, área y fecha de inicio son obligatorios.'); if (e.ffin && e.ffin < e.fini) throw new RuleError('El término no puede ser anterior al inicio.'); if (e.id) Object.assign(evento(e.id), e); else { e.id = nid('EV'); e.fuente = e.fuente || 'Captura manual'; db.eventos.push(e); } log(u, 'Evento guardado', e.id, e.nombre); saveDB(); return e; },
  /* Vistas externas: solo por referencia no predecible */
  expediente(tk) { const pa = db.pases.find(p => p.token === tk); if (!pa) return null; const s = solByFolio(pa.folio); const per = persona(pa.personaId); return { token: tk, folio: s.folio, tipo: s.tipo, estado: s.estado, paseEstado: pa.estado, nombre: per.nombre, idEstado: per.idEstado, empresa: s.empresaId ? empresa(s.empresaId).razon : s.departamento, ventanas: ventanasPersona(s, pa.personaId).map(v => ({ fecha: v.fecha, hini: v.hini, hfin: v.hfin, etiqueta: v.etiqueta })), puerta: s.tipo === 'patrocinio' ? torneo(s.eventoId).puerta : s.aut && s.aut.puerta || 'Se indica en caseta' }; },
  subirDocumento(tk, archivo) { const pa = db.pases.find(p => p.token === tk); if (!pa) throw new RuleError('La referencia no es válida.'); const s = solByFolio(pa.folio); if (s.estado === 'cancelado') throw new RuleError('La solicitud fue cancelada.'); const per = persona(pa.personaId); per.idEstado = 'recibida'; s.rhNovedad = true; log(per.nombre + ' (externo)', 'Identificación recibida', s.folio, (archivo || 'archivo') + ' · no se guarda en el prototipo'); notify({ tipo: 'recibida', para: 'Recursos Humanos', paraPerfil: 'rh', folio: s.folio, texto: `${per.nombre} completó su identificación.` }); saveDB(); return true; },
  torneoPorEnlace(enlace) { const tc = db.torneos.find(t => t.enlace === enlace && t.publicado); if (!tc) return null; const ev = evento(tc.eventoId); return { nombre: ev.nombre, fini: ev.fini, ffin: ev.ffin, lugar: tc.lugar, puerta: tc.puerta, zona: tc.zona, fechaMontaje: tc.fechaMontaje, ingresoIni: tc.ingresoIni, ingresoFin: tc.ingresoFin, turnoMin: tc.turnoMin, tolMin: tc.tolMin, descarga: tc.descarga, montaje: tc.montaje, desmontaje: tc.desmontaje, cierreRegistro: tc.cierreRegistro, abierto: nowISO() <= tc.cierreRegistro, controlObjetos: tc.controlObjetos, objetosNota: tc.objetosNota }; }
};
function cubreHoy(s) { const t = today(); if (s.tipo === 'staff') return jornadasDe(s.folio).some(j => j.fecha === t); if (s.tipo === 'patrocinio') { const tc = torneo(s.eventoId); const ev = evento(s.eventoId); return t === tc.fechaMontaje || (t >= ev.fini && t <= ev.ffin); } const r = s.aut || s.sol; return r && t >= r.fini && t <= r.ffin; }

function validarProveedor(d) {
  const e = [];
  if (!MODALIDADES[d.modalidad]) e.push('Elija el tipo de visita: entrega, servicio, instalación o paquetería.');
  if (!d.empresa || !String(d.empresa.razon || '').trim()) e.push('Escriba la razón social de la empresa que provee.');
  if (!d.contacto || !String(d.contacto.nombre || '').trim() || !emailOk(d.contacto.correo)) e.push('Escriba el nombre y un correo válido de contacto.');
  if (!d.recibe || !d.recibe.area || !String(d.recibe.persona || '').trim()) e.push('Indique el área y la persona que recibe.');
  if (!d.fini || !d.ffin) e.push('Indique las fechas.'); else if (d.ffin < d.fini) e.push('La fecha de término no puede ser anterior a la de inicio.');
  if (!d.hini || !d.hfin) e.push('Indique el horario.'); else if (toMin(d.hfin) <= toMin(d.hini)) e.push('La hora de salida debe ser posterior a la de ingreso.');
  if (d.modalidad === 'paqueteria') { if (!d.paq || !String(d.paq.guia || '').trim()) e.push('Escriba la guía o referencia de la entrega.'); }
  else {
    if (!(d.personas || []).length) e.push('Indique la persona que efectivamente ingresará.');
    if (!(d.personas || []).some(p => p.responsable)) e.push('Marque a un responsable.');
    (d.personas || []).filter(p => p.responsable).forEach(p => { if (!telOk(p.tel)) e.push(`El teléfono de ${p.nombre || 'el responsable'} debe tener 10 dígitos.`); });
    const seen = {}; (d.personas || []).forEach(p => { const k = norm(p.nombre); if (seen[k]) e.push(`"${p.nombre}" está repetido.`); seen[k] = 1; });
    if (d.modalidad === 'entrega' && !(d.mercancia || []).length) e.push('Describa la mercancía que se entrega.');
  }
  (d.vehiculos || []).forEach((v, i) => { if (!v.marca || !v.modelo || !v.placas) e.push(`Vehículo ${i + 1}: marca, modelo y placas son obligatorios.`); });
  ['mercancia', 'retira', 'equipo'].forEach(k => (d[k] || []).forEach((m, i) => { if (!m.desc || !(m.cant > 0)) e.push(`Material ${i + 1}: escriba descripción y cantidad.`); }));
  return e;
}
function validarPatrocinador(d) {
  const e = []; const tc = db.torneos.find(x => x.enlace === d.enlace && x.publicado);
  if (!tc) { e.push('El enlace del torneo no es válido.'); return e; }
  if (!d._forzarFecha && nowISO() > tc.cierreRegistro) e.push('El registro de este torneo ya cerró.');
  if (d.eventoId && d.eventoId !== tc.eventoId) e.push('El torneo enviado no corresponde al enlace. Registro rechazado.');
  if (!d.empresa || !String(d.empresa.razon || '').trim()) e.push('Escriba la razón social.');
  if (d.empresa && d.empresa.comercial) e.push('Este formulario no recibe nombre comercial.');
  if (!(d.personas || []).some(p => p.responsable)) e.push('Registre al menos un responsable.');
  (d.personas || []).filter(p => p.responsable).forEach(p => { if (!telOk(p.tel) || !emailOk(p.correo)) e.push(`${p.nombre || 'Responsable'}: teléfono de 10 dígitos y correo válido son obligatorios.`); });
  const seen = {}; (d.personas || []).forEach(p => { if (!String(p.nombre || '').trim()) e.push('Hay una persona sin nombre.'); const k = norm(p.nombre); if (seen[k]) e.push(`"${p.nombre}" está repetido.`); seen[k] = 1; });
  if (!d.idConfirmada) e.push('Confirme que cada persona presentará identificación oficial.');
  (d.vehiculos || []).forEach((v, i) => { if (!v.marca || !v.modelo || !v.placas) e.push(`Vehículo ${i + 1}: marca, modelo y placas son obligatorios.`); });
  return e;
}
