'use strict';
/* ==========================================================================
   ACCESOS BELLAVISTA · ALMACENAMIENTO EN SUPABASE
   Guarda la base completa como un documento (tabla ab_db, fila 'main').
   Cada guardado incrementa 'rev' y el servidor conserva la versión anterior en
   ab_db_versions (historial que el sitio no puede leer ni borrar).
   - Sin inicio de sesión: usa la clave pública (publishable) de config.js.
   - Varias personas: si dos guardan a la vez, se fusionan por registro (id).
   - Sin red: los cambios quedan en este navegador y se envían al reconectar.
   Límites: no envía correos. SIN inicio de sesión, quien abra el sitio puede leer y modificar los datos.
   ========================================================================== */
const ABStore = (() => {
  const LS_CONN = 'ab-conexion', LS_MODO = 'ab-modo', LS_CACHE = 'ab-cache-nube';
  const CFG0 = (typeof AB_CONFIG !== 'undefined' && AB_CONFIG) || { modo: 'produccion', datos: {} };
  const _load = loadDB, _save = saveDB, _reset = resetDB;
  const S = { sha: null, base: null, estado: 'inicio', ultimo: '', msg: '', onChange: null, timer: null, deb: null };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { } };
  const SB = CFG0.datos || {}, TABLA = SB.tabla || 'ab_db', FILA = SB.id || 'main';
  const esExterno = () => !!(document.body && document.body.dataset && document.body.dataset.page);
  const modoPractica = () => lsGet(LS_MODO) === 'practica' || (CFG0.modo === 'practica' && lsGet(LS_MODO) !== 'nube');
  const conn = () => { try { let c = JSON.parse(lsGet(LS_CONN) || 'null'); if ((!c || !c.operador) && esExterno()) c = { operador: 'Formulario externo' }; if (!c || !c.operador) return null; return Object.assign({ repo: 'supabase' }, c); } catch (e) { return null; } };
  const hora = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const pretty = o => JSON.stringify(o, null, 1);

  /* ---------- Supabase (API REST) ---------- */
  async function sb(method, path, body, extra) {
    const h = Object.assign({ apikey: SB.key }, extra || {});
    if (!/^sb_/.test(SB.key || '')) h.Authorization = 'Bearer ' + SB.key;
    if (body) h['Content-Type'] = 'application/json';
    return fetch(SB.url + '/rest/v1/' + path, { method, cache: 'no-store', headers: h, body: body ? JSON.stringify(body) : undefined });
  }
  async function errDe(r) {
    const m = { 401: 'Supabase rechazó el acceso. Revisa las reglas de la tabla ab_db (docs/supabase-setup.sql).', 403: 'Supabase rechazó el acceso. Revisa las reglas de la tabla ab_db (docs/supabase-setup.sql).', 404: 'No se encontró la tabla ab_db en Supabase. Ejecuta docs/supabase-setup.sql.' }[r.status] || ('Supabase respondió con el código ' + r.status + '.');
    const e = new Error(m); e.status = r.status; return e;
  }

  async function traerRemoto() {
    if (!SB.url || !SB.key) { const e = new Error('Falta la configuración de Supabase en config.js.'); e.status = 0; throw e; }
    const r = await sb('GET', `${TABLA}?id=eq.${encodeURIComponent(FILA)}&select=data,rev`);
    if (!r.ok) throw await errDe(r);
    const rows = await r.json(); if (!rows.length) return null;
    const d = rows[0].data; if (!d || d.v !== 2) { const e = new Error('El registro de datos no tiene el formato esperado.'); e.status = 0; throw e; }
    return { sha: rows[0].rev, db: d };
  }
  async function enviar(txt, msg) {
    const c = conn(); const data = JSON.parse(txt); const base = { mensaje: String(msg || '').slice(0, 500), updated_by: c.operador };
    const rep = { Prefer: 'return=representation' };
    if (S.sha == null) {
      const r = await sb('POST', TABLA, Object.assign({ id: FILA, data, rev: 1 }, base), rep);
      if (r.status === 201) { const j = await r.json(); S.sha = j[0].rev; return 'ok'; }
      if (r.status === 409) return 'conflicto';
      throw await errDe(r);
    }
    const r = await sb('PATCH', `${TABLA}?id=eq.${encodeURIComponent(FILA)}&rev=eq.${S.sha}`, Object.assign({ data, rev: S.sha + 1, updated_at: new Date().toISOString() }, base), rep);
    if (r.ok) { const j = await r.json(); if (j.length) { S.sha = j[0].rev; return 'ok'; } return 'conflicto'; }
    throw await errDe(r);
  }

  /* ---------- fusión por registro (3 vías: base, local, remoto) ---------- */
  const keyOf = it => (it && (it.id || it.eventoId || it.token)) || JSON.stringify(it);
  function fusionarArr(b, l, r, ord) {
    const mb = new Map(b.map(x => [keyOf(x), JSON.stringify(x)])), ml = new Map(l.map(x => [keyOf(x), x]));
    const out = r.slice(); const idx = new Map(out.map((x, i) => [keyOf(x), i]));
    for (const [k, x] of ml) {
      const sj = JSON.stringify(x);
      if (!mb.has(k)) { if (!idx.has(k)) { idx.set(k, out.length); out.push(x); } else if (JSON.stringify(out[idx.get(k)]) !== sj && ord !== 'hist') out[idx.get(k)] = x; }
      else if (mb.get(k) !== sj) { if (idx.has(k)) out[idx.get(k)] = x; else { idx.set(k, out.length); out.push(x); } }
    }
    const borrar = new Set(); for (const [k, sj] of mb) if (!ml.has(k) && idx.has(k) && JSON.stringify(out[idx.get(k)]) === sj) borrar.add(k);
    const res = out.filter(x => !borrar.has(keyOf(x)));
    if (ord === 'hist') res.sort((a, z) => String(z.cuando).localeCompare(String(a.cuando)));
    return res;
  }
  function fusionar(b, l, r) {
    b = b || {}; const out = JSON.parse(JSON.stringify(r));
    for (const k of Object.keys(l)) {
      if (Array.isArray(l[k])) out[k] = fusionarArr(b[k] || [], l[k], r[k] || [], (k === 'hist' || k === 'notifs') ? 'hist' : '');
      else if (k === 'seq') { out.seq = Object.assign({}, r.seq); for (const p of Object.keys(l.seq || {})) out.seq[p] = Math.max(l.seq[p] || 0, (r.seq || {})[p] || 0); }
      else if (JSON.stringify(l[k]) !== JSON.stringify(b[k])) out[k] = l[k];
    }
    return out;
  }

  /* ---------- caché local y estado ---------- */
  function cacheGuardar() { const c = conn(); lsSet(LS_CACHE, JSON.stringify({ repo: c && c.repo, db: pretty(db), base: S.base, sha: S.sha })); }
  function cacheLeer() { try { const x = JSON.parse(lsGet(LS_CACHE) || 'null'); const c = conn(); return x && c && x.repo === c.repo ? x : null; } catch (e) { return null; } }
  function setEstado(e, msg) { S.estado = e; S.msg = msg || ''; if (e === 'ok') S.ultimo = hora(); refrescarBarra(); }
  const pendiente = () => S.base !== null && pretty(db) !== S.base || S.base === null && !!db;
  function mensaje() {
    try { const b = S.base ? JSON.parse(S.base) : null; if (!b) return 'Inicialización de la base de datos'; const n = db.hist.length - b.hist.length; if (n > 0) { const h = db.hist[0]; return `${h.accion}${h.folio && h.folio !== '—' ? ' · ' + h.folio : ''} · ${h.usuario}` + (n > 1 ? ` (+${n - 1} más)` : ''); } } catch (e) { }
    return 'Actualización de datos';
  }

  /* ---------- sincronización (en cola, una a la vez) ---------- */
  let cola = Promise.resolve();
  const enCola = fn => { cola = cola.then(fn).catch(manejar); return cola; };
  function manejar(e) {
    if (e && e.status && e.status !== 0 && !(e instanceof TypeError)) { setEstado('error', e.message); }
    else if (e instanceof TypeError || !e || !e.status) { setEstado('sinred'); }
    else setEstado('error', e.message);
    clearTimeout(S.timer); S.timer = setTimeout(() => sincronizar(), 30000);
  }
  async function empujar() {
    for (let i = 0; i < 5; i++) {
      const txt = pretty(db); if (txt === S.base) { cacheGuardar(); return; }
      const res = await enviar(txt, mensaje());
      if (res === 'ok') { S.base = txt; cacheGuardar(); setEstado('ok'); return; }
      const rem = await traerRemoto();
      if (!rem) { S.sha = null; continue; }
      db = fusionar(S.base ? JSON.parse(S.base) : null, db, rem.db); S.sha = rem.sha; S.base = pretty(rem.db); cacheGuardar();
      if (S.onChange) S.onChange();
    }
    throw new Error('No se pudo guardar por cambios simultáneos. Intenta de nuevo.');
  }
  async function traer() {
    await empujar();
    const rem = await traerRemoto(); if (!rem) return;
    if (rem.sha !== S.sha) { db = rem.db; S.sha = rem.sha; S.base = pretty(db); cacheGuardar(); if (S.onChange) S.onChange(); }
    setEstado('ok');
  }
  const sincronizar = () => enCola(async () => { await traer(); });
  const actualizar = () => cola = cola.then(async () => { try { await traer(); } catch (e) { manejar(e); } });

  /* ---------- sustitutos de loadDB / saveDB / resetDB ---------- */
  loadDB = function () { if (modoPractica()) return _load(); if (!db) { const c = cacheLeer(); if (c) { db = JSON.parse(c.db); } } return 'local'; };
  saveDB = function () {
    if (modoPractica()) return _save();
    if (!db) return; cacheGuardar(); setEstado('pendiente');
    clearTimeout(S.deb); S.deb = setTimeout(() => enCola(empujar), 400);
  };
  resetDB = function () { if (modoPractica()) return _reset(); };

  function seedProduccion() {
    const d = seed(); d.creado = nowISO(); d.modo = 'produccion';
    d.usuarios = [
      { id: 'u-are', nombre: 'Responsable de Ludoteca', perfil: 'responsable', area: 'Ludoteca', correo: '' },
      { id: 'u-fd', nombre: 'Coordinación Fomento Deportivo', perfil: 'responsable', area: 'Fomento Deportivo', correo: '' },
      { id: 'u-fer', nombre: 'Logística de patrocinios', perfil: 'logistica', area: 'Eventos y patrocinios', correo: '' },
      { id: 'u-rh', nombre: 'Recursos Humanos (autoriza)', perfil: 'rh', area: 'Recursos Humanos', correo: '' },
      { id: 'u-rh2', nombre: 'Recursos Humanos (segundo autorizador)', perfil: 'rh', area: 'Recursos Humanos', correo: '' },
      { id: 'u-vig1', nombre: 'Vigilancia · Acceso principal', perfil: 'vigilancia', area: 'Vigilancia', puerta: 'Acceso principal' },
      { id: 'u-vig2', nombre: 'Vigilancia · Acceso de servicio', perfil: 'vigilancia', area: 'Vigilancia', puerta: 'Acceso de servicio' },
      { id: 'u-rec', nombre: 'Recepción', perfil: 'recepcion', area: 'Recepción' },
      { id: 'u-adm', nombre: 'Administración del sistema', perfil: 'admin', area: 'Sistemas' }
    ];
    d.eventos = []; d.torneos = []; return d;
  }

  async function arrancar() {
    const rem = await traerRemoto(); const cache = cacheLeer();
    if (!rem) { db = cache ? JSON.parse(cache.db) : seedProduccion(); S.sha = null; S.base = null; await empujar(); return; }
    S.sha = rem.sha;
    if (cache && cache.base && cache.db !== cache.base) { db = fusionar(JSON.parse(cache.base), JSON.parse(cache.db), rem.db); S.base = pretty(rem.db); await empujar(); }
    else { db = rem.db; S.base = pretty(db); cacheGuardar(); setEstado('ok'); }
  }

  /* ---------- pantalla de conexión ---------- */
  function pedirConexion(aviso) {
    return new Promise(resolve => {
      const cprev = (() => { try { return JSON.parse(lsGet(LS_CONN) || '{}'); } catch (e) { return {}; } })();
      const d = document.createElement('div'); d.id = 'ab-conn';
      d.setAttribute('style', 'position:fixed;inset:0;z-index:9999;background:rgba(20,32,26,.78);display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto');
      const f = 'width:100%;padding:9px 10px;margin:4px 0 12px;border:1px solid var(--line,#d5ddd5);border-radius:8px;font:inherit;box-sizing:border-box';
      d.innerHTML = `<form style="background:#fff;color:#14201a;max-width:520px;width:100%;border-radius:12px;padding:24px;font-family:'Source Sans 3',system-ui,sans-serif;border-top:5px solid #1c4a36"><h2 style="margin:0 0 6px;font-family:Marcellus,serif;color:#1c4a36">Accesos Bellavista</h2>
      <p style="margin:0 0 14px;color:#56645c;font-size:14px">Los registros se guardan en la base de datos del club (Supabase). Cada guardado deja una versión en el historial.</p>
      <div id="ab-err" role="alert" style="display:${aviso ? 'block' : 'none'};background:#fbe9e7;color:#8a1c0e;padding:8px 10px;border-radius:8px;margin-bottom:10px;font-size:14px">${esc(aviso || '')}</div>
      <label>Tu nombre (aparece en el historial)<input id="ab-op" style="${f}" value="${esc(cprev.operador || '')}" required autocomplete="off"></label>
      <button id="ab-go" class="btn primary" type="submit" style="background:#1c4a36;color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;font-weight:600;cursor:pointer">Entrar</button>
      <button id="ab-prac" type="button" style="margin-left:8px;background:none;border:0;color:#1c4a36;text-decoration:underline;cursor:pointer;font:inherit">Modo práctica con datos ficticios</button>
      <p style="margin:14px 0 0;color:#56645c;font-size:12px">Guía: docs/GUIA-SUPABASE-DATOS.md.</p></form>`;
      document.body.appendChild(d);
      const err = m => { const e = d.querySelector('#ab-err'); e.textContent = m; e.style.display = 'block'; };
      d.querySelector('#ab-prac').onclick = () => { d.remove(); resolve('practica'); };
      d.querySelector('form').onsubmit = async ev => {
        ev.preventDefault(); const b = d.querySelector('#ab-go'); b.disabled = true; b.textContent = 'Verificando…';
        const c = { operador: d.querySelector('#ab-op').value.trim() };
        try {
          if (!SB.url || !SB.key) throw new Error('Falta la configuración de Supabase en config.js.');
          const r = await sb('GET', TABLA + '?select=id&limit=1'); if (!r.ok) throw await errDe(r);
          lsSet(LS_CONN, JSON.stringify(c)); lsSet(LS_MODO, 'nube'); d.remove(); resolve(c);
        } catch (ex) { b.disabled = false; b.textContent = 'Entrar'; err(ex instanceof TypeError ? 'No hay conexión con Supabase. Revisa tu internet.' : ex.message); }
      };
    });
  }

  async function ready() {
    if (modoPractica()) { S.estado = 'practica'; return _load(); }
    let aviso = '';
    for (;;) {
      if (!conn()) { const r = await pedirConexion(aviso); if (r === 'practica') { lsSet(LS_MODO, 'practica'); S.estado = 'practica'; return _load(); } }
      try { await arrancar(); break; }
      catch (e) {
        if (e instanceof TypeError || !e.status) { const c = cacheLeer(); if (c) { db = JSON.parse(c.db); S.sha = c.sha; S.base = c.base; setEstado('sinred'); manejar(e); break; } aviso = 'No hay conexión con Supabase y no hay datos guardados en este navegador.'; lsDel(LS_CONN); }
        else { aviso = e.message; lsDel(LS_CONN); }
      }
    }
    setInterval(() => { if (!document.hidden) actualizar(); }, 60000);
    window.addEventListener('focus', () => actualizar());
    window.addEventListener('online', () => sincronizar());
    window.addEventListener('beforeunload', e => { if (!modoPractica() && db && pretty(db) !== S.base) { e.preventDefault(); e.returnValue = ''; } });
    return 'nube';
  }

  /* ---------- barra de estado ---------- */
  function barHTML(extra) {
    if (modoPractica()) return `<div class="sim-bar" role="note"><b>Modo práctica con datos ficticios.</b> Se guarda solo en este navegador; no es multiusuario y no envía correos.${extra || ''} <button data-ab="conectar">Conectar a Supabase</button></div>`;
    const c = conn() || {}; const e = S.estado;
    const t = { ok: 'Guardado en Supabase' + (S.ultimo ? ' · ' + S.ultimo : ''), pendiente: 'Guardando cambios…', sinred: 'Sin conexión: los cambios se enviarán al reconectar', error: S.msg || 'No se pudo guardar', inicio: 'Conectando…' }[e] || '';
    return `<div class="sync-bar ${e}" role="status"><span class="dot"></span><b>${esc(t)}</b><span class="meta">Supabase · ${esc(c.operador || '')} · Avisos por correo: pendientes de conectar</span><span class="acts"><button data-ab="sync">Sincronizar</button><button data-ab="salir">Cerrar conexión</button></span></div>`;
  }
  function refrescarBarra() { document.querySelectorAll('.sync-bar').forEach(el => { el.outerHTML = barHTML(); }); }
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-ab]'); if (!b) return; const a = b.dataset.ab;
    if (a === 'sync') { setEstado('pendiente'); sincronizar(); }
    if (a === 'conectar') { lsDel(LS_MODO); location.reload(); }
    if (a === 'salir') { if (db && pretty(db) !== S.base && !confirm('Hay cambios sin enviar a Supabase. Si cierras la conexión se perderán en este navegador. ¿Continuar?')) return; lsDel(LS_CONN); lsDel(LS_CACHE); location.reload(); }
  });

  return { ready, actualizar, sincronizar, barHTML, modoPractica, operador: () => (conn() || {}).operador || '', get onChange() { return S.onChange; }, set onChange(f) { S.onChange = f; }, _fusionar: fusionar };
})();
