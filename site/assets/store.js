'use strict';
/* ==========================================================================
   ACCESOS BELLAVISTA · ALMACENAMIENTO EN GITHUB
   Guarda la base completa en data/db.json de un repositorio PRIVADO de datos.
   Cada guardado es un commit: el historial de GitHub conserva todas las versiones.
   - Conexión por navegador: repositorio + token personal (no se guarda en el sitio).
   - Varias personas: si dos guardan a la vez, se fusionan por registro (id).
   - Sin red: los cambios quedan en este navegador y se envían al reconectar.
   Límites: no envía correos; no sirve para que externos capturen sin token.
   ========================================================================== */
const ABStore = (() => {
  const LS_CONN = 'ab-conexion', LS_MODO = 'ab-modo', LS_CACHE = 'ab-cache-github';
  const API = 'https://api.github.com';
  const CFG0 = (typeof AB_CONFIG !== 'undefined' && AB_CONFIG) || { modo: 'produccion', datos: {} };
  const _load = loadDB, _save = saveDB, _reset = resetDB;
  const S = { sha: null, base: null, estado: 'inicio', ultimo: '', msg: '', onChange: null, timer: null, deb: null };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { } };
  const modoPractica = () => lsGet(LS_MODO) === 'practica' || (CFG0.modo === 'practica' && lsGet(LS_MODO) !== 'github');
  const conn = () => { try { const c = JSON.parse(lsGet(LS_CONN) || 'null'); if (!c || !c.token || !c.repo) return null; return Object.assign({ rama: CFG0.datos.rama || 'main', ruta: CFG0.datos.ruta || 'data/db.json' }, c); } catch (e) { return null; } };
  const hora = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const pretty = o => JSON.stringify(o, null, 1);

  /* ---------- GitHub ---------- */
  async function gh(method, path, body, accept, c) {
    c = c || conn();
    const r = await fetch(API + path, { method, cache: 'no-store', headers: Object.assign({ Authorization: 'Bearer ' + c.token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    return r;
  }
  async function errDe(r) {
    const m = { 401: 'El token no es válido o ya venció.', 403: 'El token no tiene permiso de escritura en el repositorio (Contents: Read and write) o GitHub limitó las solicitudes.', 404: 'No se encontró el repositorio o el token no tiene acceso a él.' }[r.status] || ('GitHub respondió con el código ' + r.status + '.');
    const e = new Error(m); e.status = r.status; return e;
  }
  const fpath = c => `/repos/${c.repo}/contents/${c.ruta.split('/').map(encodeURIComponent).join('/')}`;
  const enc = s => { const b = new TextEncoder().encode(s); let x = ''; for (let i = 0; i < b.length; i += 0x8000) x += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(x); };
  const dec = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), ch => ch.charCodeAt(0)));

  async function traerRemoto() {
    const c = conn(); const q = '?ref=' + encodeURIComponent(c.rama);
    const r = await gh('GET', fpath(c) + q);
    if (r.status === 404) return null;
    if (!r.ok) throw await errDe(r);
    const j = await r.json(); let txt;
    if (j.content) txt = dec(j.content); else { const rr = await gh('GET', fpath(c) + q, null, 'application/vnd.github.raw+json'); if (!rr.ok) throw await errDe(rr); txt = await rr.text(); }
    const d = JSON.parse(txt); if (!d || d.v !== 2) { const e = new Error('El archivo de datos no tiene el formato esperado.'); e.status = 0; throw e; }
    return { sha: j.sha, db: d };
  }
  async function enviar(txt, msg) {
    const c = conn(); const body = { message: msg, content: enc(txt), branch: c.rama }; if (S.sha) body.sha = S.sha;
    const r = await gh('PUT', fpath(c), body);
    if (r.ok) { const j = await r.json(); S.sha = j.content.sha; return 'ok'; }
    if (r.status === 409 || r.status === 422) return 'conflicto';
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
      d.innerHTML = `<form style="background:#fff;color:#14201a;max-width:520px;width:100%;border-radius:12px;padding:24px;font-family:'Source Sans 3',system-ui,sans-serif;border-top:5px solid #1c4a36"><h2 style="margin:0 0 6px;font-family:Marcellus,serif;color:#1c4a36">Conectar la base de datos</h2>
      <p style="margin:0 0 14px;color:#56645c;font-size:14px">Los registros se guardan en un repositorio <b>privado</b> de GitHub. Cada guardado queda en el historial del repositorio.</p>
      <div id="ab-err" role="alert" style="display:${aviso ? 'block' : 'none'};background:#fbe9e7;color:#8a1c0e;padding:8px 10px;border-radius:8px;margin-bottom:10px;font-size:14px">${esc(aviso || '')}</div>
      <label>Repositorio de datos (usuario/repositorio)<input id="ab-repo" style="${f}" placeholder="club-bellavista/accesos-bellavista-datos" value="${esc(cprev.repo || CFG0.datos.repo || '')}" required autocomplete="off"></label>
      <label>Token de acceso de GitHub<input id="ab-tok" type="password" style="${f}" placeholder="github_pat_…" required autocomplete="off"></label>
      <label>Tu nombre (aparece en el historial)<input id="ab-op" style="${f}" value="${esc(cprev.operador || '')}" required autocomplete="off"></label>
      <button id="ab-go" class="btn primary" type="submit" style="background:#1c4a36;color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;font-weight:600;cursor:pointer">Conectar y abrir</button>
      <button id="ab-prac" type="button" style="margin-left:8px;background:none;border:0;color:#1c4a36;text-decoration:underline;cursor:pointer;font:inherit">Modo práctica con datos ficticios</button>
      <p style="margin:14px 0 0;color:#56645c;font-size:12px">El token se guarda solo en este navegador. Usa un token con acceso únicamente a este repositorio (Contents: Read and write). Guía: docs/GUIA-GITHUB-DATOS.md.</p></form>`;
      document.body.appendChild(d);
      const err = m => { const e = d.querySelector('#ab-err'); e.textContent = m; e.style.display = 'block'; };
      d.querySelector('#ab-prac').onclick = () => { d.remove(); resolve('practica'); };
      d.querySelector('form').onsubmit = async ev => {
        ev.preventDefault(); const b = d.querySelector('#ab-go'); b.disabled = true; b.textContent = 'Verificando…';
        const c = { repo: d.querySelector('#ab-repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''), token: d.querySelector('#ab-tok').value.trim(), operador: d.querySelector('#ab-op').value.trim() };
        try {
          if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo)) throw new Error('Escribe el repositorio como usuario/repositorio.');
          const r = await gh('GET', '/repos/' + c.repo, null, null, c); if (!r.ok) throw await errDe(r);
          const j = await r.json();
          if (!j.private) throw new Error('Ese repositorio es PÚBLICO. Para datos reales debe ser privado (Settings → Danger Zone → Change visibility).');
          if (j.permissions && !j.permissions.push) throw new Error('El token solo puede leer. Necesita permiso Contents: Read and write.');
          c.rama = CFG0.datos.rama || j.default_branch || 'main'; c.ruta = CFG0.datos.ruta || 'data/db.json';
          lsSet(LS_CONN, JSON.stringify(c)); lsSet(LS_MODO, 'github'); d.remove(); resolve(c);
        } catch (ex) { b.disabled = false; b.textContent = 'Conectar y abrir'; err(ex instanceof TypeError ? 'No hay conexión con GitHub. Revisa tu internet.' : ex.message); }
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
        if (e instanceof TypeError || !e.status) { const c = cacheLeer(); if (c) { db = JSON.parse(c.db); S.sha = c.sha; S.base = c.base; setEstado('sinred'); manejar(e); break; } aviso = 'No hay conexión con GitHub y no hay datos guardados en este navegador.'; lsDel(LS_CONN); }
        else { aviso = e.message; lsDel(LS_CONN); }
      }
    }
    setInterval(() => { if (!document.hidden) actualizar(); }, 60000);
    window.addEventListener('focus', () => actualizar());
    window.addEventListener('online', () => sincronizar());
    window.addEventListener('beforeunload', e => { if (!modoPractica() && db && pretty(db) !== S.base) { e.preventDefault(); e.returnValue = ''; } });
    return 'github';
  }

  /* ---------- barra de estado ---------- */
  function barHTML(extra) {
    if (modoPractica()) return `<div class="sim-bar" role="note"><b>Modo práctica con datos ficticios.</b> Se guarda solo en este navegador; no es multiusuario y no envía correos.${extra || ''} <button data-ab="conectar">Conectar a GitHub</button></div>`;
    const c = conn() || {}; const e = S.estado;
    const t = { ok: 'Guardado en GitHub' + (S.ultimo ? ' · ' + S.ultimo : ''), pendiente: 'Guardando cambios…', sinred: 'Sin conexión: los cambios se enviarán al reconectar', error: S.msg || 'No se pudo guardar', inicio: 'Conectando…' }[e] || '';
    return `<div class="sync-bar ${e}" role="status"><span class="dot"></span><b>${esc(t)}</b><span class="meta">${esc(c.repo || '')} · ${esc(c.operador || '')} · Avisos por correo: pendientes de conectar</span><span class="acts"><button data-ab="sync">Sincronizar</button><button data-ab="salir">Cerrar conexión</button></span></div>`;
  }
  function refrescarBarra() { document.querySelectorAll('.sync-bar').forEach(el => { el.outerHTML = barHTML(); }); }
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-ab]'); if (!b) return; const a = b.dataset.ab;
    if (a === 'sync') { setEstado('pendiente'); sincronizar(); }
    if (a === 'conectar') { lsDel(LS_MODO); location.reload(); }
    if (a === 'salir') { if (db && pretty(db) !== S.base && !confirm('Hay cambios sin enviar a GitHub. Si cierras la conexión se perderán en este navegador. ¿Continuar?')) return; lsDel(LS_CONN); lsDel(LS_CACHE); location.reload(); }
  });

  return { ready, actualizar, sincronizar, barHTML, modoPractica, operador: () => (conn() || {}).operador || '', get onChange() { return S.onChange; }, set onChange(f) { S.onChange = f; }, _fusionar: fusionar };
})();
