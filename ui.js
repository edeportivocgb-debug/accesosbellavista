/* ==========================================================================
   COMPONENTES COMPARTIDOS (matriz interna y páginas externas)
   ========================================================================== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const chip = e => `<span class="chip st-${ESTADOS[e][1]}">${ESTADOS[e][0]}</span>`;
const paseChip = e => `<span class="chip st-${PASES[e][1]}">${PASES[e][0]}</span>`;
const lpChip = e => `<span class="chip st-${LINEA_PAGO[e][1]}">${LINEA_PAGO[e][0]}</span>`;
const segChip = e => `<span class="chip st-${SEGUIMIENTO[e][1]}">${SEGUIMIENTO[e][0]}</span>`;
const empty = (t, txt, act) => `<div class="empty"><div class="t">${t}</div><div>${txt || ''}</div>${act || ''}</div>`;
const simBar = (extra) => `<div class="sim-bar" role="note"><b>Prototipo con datos ficticios.</b> Todo se guarda solo en este navegador; no es multiusuario y no envía correos reales.${extra || ''}</div>`;
function toast(msg, err) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); } t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(() => t.remove(), 4500); }
function errBox(el, msg) { el.innerHTML = '<b>Revise lo siguiente:</b><ul style="margin:6px 0 0;padding-left:18px">' + String(msg).split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÑ"¿0-9])/).map(x => `<li>${esc(x)}</li>`).join('') + '</ul>'; el.hidden = false; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
function isAppErr(e) { return e instanceof RuleError || e instanceof PermError; }

/* Filas dinámicas genéricas: def = [[campo, etiqueta, tipo, extra]] */
function dynRow(kind, def, item, i) {
  return `<div class="dynrow" data-row="${kind}"><span class="n">${String(i + 1).padStart(2, '0')}</span><div class="cells">${def.map(([k, l, t, x]) => t === 'check' ? `<label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" data-f="${k}" ${item[k] ? 'checked' : ''}><span>${l}</span></label>` : `<div class="field"><label>${l}</label><input type="${t || 'text'}" data-f="${k}" value="${esc(item[k] ?? '')}" ${x || ''}></div>`).join('')}</div><button type="button" class="icon-x" data-dyn-del aria-label="Quitar renglón">×</button></div>`;
}
function dynBlock(kind, def, items, addLabel, max) {
  return `<div class="dyn" id="dyn-${kind}" data-max="${max || 50}">${items.map((it, i) => dynRow(kind, def, it, i)).join('')}</div><button type="button" class="add" data-dyn-add="${kind}">${addLabel}</button><template id="tpl-${kind}">${dynRow(kind, def, {}, 0)}</template>`;
}
function readDyn(kind) { return $$(`#dyn-${kind} .dynrow`).map(r => { const o = {}; r.querySelectorAll('[data-f]').forEach(i => o[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value.trim()); return o; }).filter(o => Object.entries(o).some(([k, v]) => v && v !== true ? String(v).trim() : false)); }
document.addEventListener('click', e => {
  const a = e.target.closest('[data-dyn-add]'); if (a) { const k = a.dataset.dynAdd; const box = $('#dyn-' + k); if (box.children.length >= +box.dataset.max) { toast('Máximo ' + box.dataset.max + ' renglones.', true); return; } box.insertAdjacentHTML('beforeend', $('#tpl-' + k).innerHTML); renum(box); box.lastElementChild.querySelector('input').focus(); return; }
  const d = e.target.closest('[data-dyn-del]'); if (d) { const box = d.closest('.dyn'); d.closest('.dynrow').remove(); renum(box); }
});
function renum(box) { Array.from(box.children).forEach((r, i) => { const n = r.querySelector('.n'); if (n) n.textContent = String(i + 1).padStart(2, '0'); }); }
function drawQR() { $$('.qrbox[data-tk]').forEach(el => { const tk = el.dataset.tk; el.innerHTML = ''; if (window.QRCode) { try { new QRCode(el, { text: CFG.qrPrefijo + tk, width: 168, height: 168, colorDark: '#14201a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); } catch (e) { el.textContent = 'QR no disponible'; } } else el.innerHTML = '<span style="color:#14201a;font-size:13px;text-align:center">El código QR no cargó.<br>Use la referencia escrita.</span>'; }); }

/* ==========================================================================
   PROGRAMACIÓN DE STAFF (lo usa la matriz interna y el enlace del formulario de staff)
   ========================================================================== */
const PL_KEY = 'accesos-bellavista-v2-borrador-staff';
let PL = null;
function plNuevo(actorId) { const u = U(actorId) || {}; return { actorId, mes: today().slice(0, 7), departamento: CFG.areas.includes(u.area) ? u.area : '', motivo: '', personas: [], paso: 'captura', enviado: null, aceptarTraslapes: false }; }
function plLoad(actorId) { try { const r = JSON.parse(localStorage.getItem(PL_KEY) || 'null'); if (r && r.actorId === actorId && r.paso !== 'enviado') { PL = r; return; } } catch (e) { } PL = plNuevo(actorId); }
function plSave() { try { localStorage.setItem(PL_KEY, JSON.stringify(PL)); } catch (e) { } }
function plNombre(p) { return p.personaId ? persona(p.personaId).nombre : p.nueva.nombre; }
function plTraslapes(p) { return api.verificarTraslapes(p.personaId, p.jornadas); }
function eventosDelMes(mes, dep, soloDep) { const ini = mes + '-01'; const fin = mes + '-31'; return db.eventos.filter(e => e.fini <= fin && (e.ffin || e.fini) >= ini && (!soloDep || e.area === dep)).sort((a, b) => a.fini.localeCompare(b.fini)); }
function plannerHTML(opts = {}) {
  if (!PL) plLoad(opts.actorId);
  const actor = U(PL.actorId);
  if (PL.paso === 'enviado') {
    const e = PL.enviado; return `<div class="card"><div class="note ok"><b>Programación ${esc(e.folio)} enviada a Recursos Humanos.</b> Quedó pendiente de autorización. Se creó el borrador de pago ${esc(e.pago)}, que permanece pendiente de validación.</div>
      <ul style="margin:12px 0 0;padding-left:20px;display:grid;gap:6px"><li>El pase QR solo se genera cuando RH autorice cada jornada.</li><li>Cada trabajador lo recibirá directamente en su correo registrado; usted recibirá una confirmación y no tiene que descargarlo ni reenviarlo.</li><li>Si un trabajador debe completar su identificación, recibirá un enlace a su propio expediente.</li></ul>
      <div class="row-actions" style="margin-top:14px"><button class="btn primary" data-pl="nueva">Programar otra solicitud</button>${opts.enMatriz ? `<button class="btn" data-act="ficha" data-f="${esc(e.folio)}">Ver la solicitud</button>` : ''}</div></div>`;
  }
  const evs = eventosDelMes(PL.mes, PL.departamento, PL.soloDep);
  const per = db.personas.filter(p => !p.empresaId).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const sel = PL.sel || { modo: '', personaId: '', eventoId: '' };
  const ficha = sel.personaId ? persona(sel.personaId) : null;
  const mesMin = PL.mes + '-01'; const [yy, mm] = PL.mes.split('-').map(Number); const mesMax = dstr(new Date(yy, mm, 0));
  const evSel = sel.eventoId && sel.eventoId !== 'none' ? evento(sel.eventoId) : null;
  const totalJ = PL.personas.reduce((n, p) => n + p.jornadas.length, 0);
  const revisar = PL.paso === 'revision';
  const lista = PL.personas.length ? PL.personas.map((p, pi) => { const tr = plTraslapes(p); return `<div class="pcard"><div class="t"><b>${esc(plNombre(p))}</b><span class="muted" style="font-size:13px">${p.personaId ? 'Ficha existente' : 'Persona nueva'} · pase a <span class="mono">${esc(p.correoPase)}</span></span></div>
    <div class="tablewrap"><table><thead><tr><th>Evento o actividad</th><th>Función</th><th>Fecha</th><th>Horario</th><th>Obs.</th>${revisar ? '' : '<th></th>'}</tr></thead><tbody>${p.jornadas.map((j, ji) => `<tr><td>${j.eventoId ? esc(evento(j.eventoId).nombre) : esc(j.actividad) + ' <span class="tag">sin evento</span>'}</td><td>${esc(j.funcion)}</td><td style="white-space:nowrap">${fmtD(j.fecha)}</td><td class="mono">${j.hini}–${j.hfin}</td><td>${esc(j.obs || '')}</td>${revisar ? '' : `<td><button class="icon-x" data-pl="quitar" data-p="${pi}" data-j="${ji}" aria-label="Quitar jornada">×</button></td>`}</tr>`).join('')}</tbody></table></div>
    ${tr.length ? tr.map(x => `<div class="warn-line">Horario traslapado: ${esc(x)}</div>`).join('') : ''}</div>`; }).join('') : `<div class="card">${empty('Aún no hay jornadas', 'Agregue una persona y su primera jornada con el panel de la izquierda.')}</div>`;
  if (revisar) {
    const hayTras = PL.personas.some(p => plTraslapes(p).length);
    return `<div class="card"><div class="card-h"><div><div class="eyebrow">Revisión antes de enviar</div><h2>${esc(PL.departamento)} · ${MESL[mm - 1]} ${yy}</h2></div><span class="muted">${PL.personas.length} persona(s) · ${totalJ} jornada(s)</span></div>
      <p class="hint">Responsable: <b>${esc(actor.nombre)}</b>. Motivo para la solicitud de pago: ${esc(PL.motivo || '—')}</p></div>${lista}
      ${hayTras ? `<label class="check note warn"><input type="checkbox" id="pl-acepto" ${PL.aceptarTraslapes ? 'checked' : ''}><span>Hay horarios traslapados. Confirmo que son intencionales y deben enviarse así.</span></label>` : ''}
      <div id="pl-err" class="note err" hidden role="alert"></div>
      <div class="row-actions"><button class="btn primary big" data-pl="enviar">Enviar a Recursos Humanos</button><button class="btn" data-pl="volver">Volver a editar</button></div>
      <p class="hint">Al enviar se genera el folio, la solicitud queda pendiente de RH y se crea un borrador de pago vinculado. Ningún pase se habilita hasta que RH autorice.</p>`;
  }
  return `<div class="card"><div class="fgrid">
      <div class="field"><label class="req-m" for="pl-mes">Mes</label><input type="month" id="pl-mes" value="${PL.mes}" data-plc="mes"></div>
      <div class="field"><label class="req-m" for="pl-dep">Departamento</label><select id="pl-dep" data-plc="departamento"><option value="">Elija…</option>${CFG.areas.map(a => `<option ${a === PL.departamento ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="field"><label for="pl-mot">Motivo (para la solicitud de pago)</label><input type="text" id="pl-mot" value="${esc(PL.motivo)}" data-plc="motivo" placeholder="Ej. Apoyo en eventos del mes"></div></div></div>
  <div class="planner">
   <div class="card"><div class="card-h"><h2>Agregar jornada</h2></div><div style="display:flex;flex-direction:column;gap:12px">
     <div class="field"><label class="req-m" for="pl-per">Persona</label><select id="pl-per" data-plsel="personaId"><option value="">Elija una persona existente…</option><option value="__nueva" ${sel.modo === 'nueva' ? 'selected' : ''}>+ Registrar persona nueva</option>${per.map(p => `<option value="${p.id}" ${p.id === sel.personaId ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
     ${sel.modo === 'nueva' ? `<div class="fgrid"><div class="field"><label class="req-m" for="pn-nom">Nombre completo</label><input type="text" id="pn-nom" value="${esc(sel.nom || '')}"></div><div class="field"><label class="req-m" for="pn-tel">Teléfono</label><input type="tel" id="pn-tel" value="${esc(sel.tel || '')}" placeholder="10 dígitos"></div><div class="field"><label class="req-m" for="pn-mail">Correo</label><input type="email" id="pn-mail" value="${esc(sel.mail || '')}"></div><div class="field"><label for="pn-pue">Puesto</label><input type="text" id="pn-pue" value="${esc(sel.pue || '')}"></div></div>` : ''}
     ${ficha ? `<div class="ficha"><b>${esc(ficha.nombre)}</b><span>Tel. ${esc(ficha.tel || '—')} · ${esc(ficha.correo || 'sin correo')}</span><span>Puesto: ${esc(ficha.puesto || '—')} · Identificación: ${ficha.idEstado === 'recibida' ? 'recibida' : 'pendiente'}</span><span class="muted">No se vuelven a pedir sus datos. Actualice solo si cambiaron.</span></div>
       <details><summary>Actualizar contacto</summary><div class="fgrid" style="margin-top:8px"><div class="field"><label for="pu-tel">Teléfono</label><input type="tel" id="pu-tel" value="${esc(ficha.tel)}"></div><div class="field"><label for="pu-mail">Correo</label><input type="email" id="pu-mail" value="${esc(ficha.correo)}"></div></div></details>` : ''}
     <div class="field"><label class="req-m" for="pl-cp">Correo del destinatario del pase</label><input type="email" id="pl-cp" value="${esc(sel.cp || (ficha ? ficha.correo : sel.mail || ''))}" placeholder="Al trabajador, no al responsable"></div>
     <div class="field"><label class="req-m" for="pl-ev">Evento del catálogo o actividad</label><select id="pl-ev" data-plsel="eventoId"><option value="">Elija…</option><option value="none" ${sel.eventoId === 'none' ? 'selected' : ''}>Guardia o actividad sin evento</option>${evs.map(e => `<option value="${e.id}" ${e.id === sel.eventoId ? 'selected' : ''}>${esc(e.nombre)} · ${rango(e.fini, e.ffin)}${e.estadoFecha === 'por_revisar' ? ' · fecha por revisar' : ''}</option>`).join('')}</select>
       <label class="check" style="margin-top:4px;font-size:13px"><input type="checkbox" id="pl-solodep" data-plc="soloDep" ${PL.soloDep ? 'checked' : ''}><span>Mostrar solo eventos de ${esc(PL.departamento || 'mi departamento')}</span></label>
       ${evSel ? `<span class="hint">${esc(evSel.lugar || '')} · ${rango(evSel.fini, evSel.ffin)}${evSel.estadoFecha === 'por_revisar' ? ' · <b>fecha pendiente de revisar</b>' : ''}</span>` : ''}</div>
     ${sel.eventoId === 'none' ? `<div class="field"><label class="req-m" for="pl-act">Guardia o actividad</label><input type="text" id="pl-act" value="${esc(sel.act || '')}" placeholder="Ej. Guardia de alberca"></div>` : ''}
     <div class="fgrid"><div class="field"><label class="req-m" for="pl-fun">Función</label><input type="text" id="pl-fun" value="${esc(sel.fun || '')}" placeholder="Ej. Apoyo en Ludoteca"></div>
       <div class="field"><label class="req-m" for="pl-fec">Fecha</label><input type="date" id="pl-fec" min="${mesMin}" max="${mesMax}" value="${esc(sel.fec || (evSel && evSel.fini >= mesMin ? evSel.fini : ''))}"></div>
       <div class="field"><label class="req-m" for="pl-hi">Inicio</label><input type="time" id="pl-hi" value="${esc(sel.hi || '')}"></div><div class="field"><label class="req-m" for="pl-hf">Término</label><input type="time" id="pl-hf" value="${esc(sel.hf || '')}"></div></div>
     <div class="field"><label for="pl-obs">Observaciones</label><input type="text" id="pl-obs" value="${esc(sel.obs || '')}"></div>
     <div id="pl-aerr" class="note err" hidden role="alert"></div>
     <div class="row-actions"><button class="btn primary" data-pl="agregar">Agregar jornada</button><button class="btn" data-pl="limpiar">Limpiar</button></div>
     <p class="hint">Puede agregar varias jornadas y eventos a la misma persona. La fecha se limita al mes elegido.</p></div></div>
   <div style="display:flex;flex-direction:column;gap:12px"><div class="card-h" style="margin:0"><h2>Programación en preparación</h2><span class="muted">${PL.personas.length} persona(s) · ${totalJ} jornada(s)</span></div>${lista}
     ${PL.personas.length ? `<div class="row-actions"><button class="btn primary" data-pl="revisar">Revisar y enviar a RH</button><button class="btn danger" data-pl="descartar">Descartar borrador</button></div>` : ''}
     <p class="hint">El borrador se guarda en este navegador mientras trabaja.</p></div>
  </div>`;
}
function plCapturarSel() { const g = id => { const el = $('#' + id); return el ? el.value : undefined; }; const s = PL.sel || {}; Object.assign(s, { nom: g('pn-nom') ?? s.nom, tel: g('pn-tel') ?? s.tel, mail: g('pn-mail') ?? s.mail, pue: g('pn-pue') ?? s.pue, cp: g('pl-cp') ?? s.cp, act: g('pl-act') ?? s.act, fun: g('pl-fun') ?? s.fun, fec: g('pl-fec') ?? s.fec, hi: g('pl-hi') ?? s.hi, hf: g('pl-hf') ?? s.hf, obs: g('pl-obs') ?? s.obs }); PL.sel = s; }
function plAgregar() {
  plCapturarSel(); const s = PL.sel || {}; const errs = [];
  const nueva = s.modo === 'nueva';
  if (!nueva && !s.personaId) errs.push('Elija una persona o registre una nueva.');
  if (nueva) { if (!String(s.nom || '').trim()) errs.push('Escriba el nombre completo.'); if (!telOk(s.tel)) errs.push('El teléfono debe tener 10 dígitos.'); if (!emailOk(s.mail)) errs.push('Escriba un correo válido para la persona.'); const dup = db.personas.find(p => norm(p.nombre) === norm(s.nom)); if (dup) errs.push(`Ya existe una ficha con el nombre "${dup.nombre}". Elíjala de la lista para no duplicar sus datos.`); }
  if (!emailOk(s.cp)) errs.push('Escriba el correo del destinatario del pase.');
  if (!s.eventoId) errs.push('Elija un evento o "Guardia o actividad sin evento".'); if (s.eventoId === 'none' && !String(s.act || '').trim()) errs.push('Describa la guardia o actividad.');
  if (!String(s.fun || '').trim()) errs.push('Escriba la función.'); if (!s.fec) errs.push('Elija la fecha.'); else if (s.fec.slice(0, 7) !== PL.mes) errs.push('La fecha debe estar dentro del mes elegido.');
  if (!s.hi || !s.hf) errs.push('Indique inicio y término.'); else if (toMin(s.hf) <= toMin(s.hi)) errs.push('El término debe ser posterior al inicio.');
  if (errs.length) { errBox($('#pl-aerr'), errs.join(' ')); return; }
  const j = { eventoId: s.eventoId === 'none' ? null : s.eventoId, actividad: s.eventoId === 'none' ? s.act.trim() : '', funcion: s.fun.trim(), fecha: s.fec, hini: s.hi, hfin: s.hf, obs: (s.obs || '').trim() };
  const ev = j.eventoId ? evento(j.eventoId) : null; const avisoEv = ev && (j.fecha < ev.fini || j.fecha > (ev.ffin || ev.fini)) ? ` La fecha está fuera del periodo del evento (${rango(ev.fini, ev.ffin)}).` : '';
  let p = nueva ? PL.personas.find(x => !x.personaId && norm(x.nueva.nombre) === norm(s.nom)) : PL.personas.find(x => x.personaId === s.personaId);
  if (!p) { p = nueva ? { personaId: null, nueva: { nombre: s.nom.trim(), tel: s.tel.replace(/\D/g, ''), correo: s.mail.trim(), puesto: (s.pue || '').trim() }, correoPase: s.cp.trim(), jornadas: [] } : { personaId: s.personaId, correoPase: s.cp.trim(), jornadas: [] }; PL.personas.push(p); }
  else p.correoPase = s.cp.trim();
  if (!nueva) { const tel = $('#pu-tel') && $('#pu-tel').value.replace(/\D/g, ''); const mail = $('#pu-mail') && $('#pu-mail').value.trim(); const f = persona(s.personaId); const act = {}; if (tel && tel !== f.tel) act.tel = tel; if (mail && mail !== f.correo) act.correo = mail; if (Object.keys(act).length) p.actualizar = Object.assign(p.actualizar || {}, act); }
  p.jornadas.push(j); const tr = plTraslapes(p);
  PL.sel = { modo: s.modo, personaId: s.personaId, eventoId: s.eventoId, nom: s.nom, tel: s.tel, mail: s.mail, pue: s.pue, cp: s.cp, act: s.act, fun: s.fun };
  plSave(); plRender(); toast(tr.length ? 'Jornada agregada con traslape de horario. Revísela.' + avisoEv : 'Jornada agregada.' + avisoEv, !!tr.length || !!avisoEv);
}
let plRender = () => { };
function plBind(container, opts) {
  plRender = () => { container.innerHTML = plannerHTML(opts); };
  container.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.plc) { plCapturarSel(); PL[t.dataset.plc] = t.type === 'checkbox' ? t.checked : t.value; plSave(); if (t.dataset.plc !== 'motivo') plRender(); }
    if (t.dataset.plsel) { plCapturarSel(); const s = PL.sel || {}; if (t.dataset.plsel === 'personaId') { if (t.value === '__nueva') { s.modo = 'nueva'; s.personaId = ''; s.cp = ''; } else { s.modo = t.value ? 'existente' : ''; s.personaId = t.value; s.cp = t.value ? persona(t.value).correo : ''; } } else s.eventoId = t.value; PL.sel = s; plSave(); plRender(); }
    if (t.id === 'pl-acepto') { PL.aceptarTraslapes = t.checked; plSave(); }
  });
  container.addEventListener('click', e => {
    const b = e.target.closest('[data-pl]'); if (!b) return; const a = b.dataset.pl;
    if (a === 'agregar') plAgregar();
    if (a === 'limpiar') { PL.sel = {}; plSave(); plRender(); }
    if (a === 'quitar') { const p = PL.personas[+b.dataset.p]; p.jornadas.splice(+b.dataset.j, 1); if (!p.jornadas.length) PL.personas.splice(+b.dataset.p, 1); plSave(); plRender(); }
    if (a === 'revisar') { if (!PL.departamento) { toast('Elija el departamento.', true); return; } PL.paso = 'revision'; plSave(); plRender(); window.scrollTo({ top: 0 }); }
    if (a === 'volver') { PL.paso = 'captura'; plSave(); plRender(); }
    if (a === 'descartar') { PL = plNuevo(PL.actorId); plSave(); plRender(); toast('Borrador descartado.'); }
    if (a === 'nueva') { PL = plNuevo(PL.actorId); plSave(); plRender(); }
    if (a === 'enviar') {
      try { const r = api.enviarProgramacion(U(PL.actorId), { departamento: PL.departamento, mes: PL.mes, motivo: PL.motivo, personas: PL.personas, aceptarTraslapes: PL.aceptarTraslapes }); PL.paso = 'enviado'; PL.enviado = { folio: r.folio, pago: r.pago }; plSave(); plRender(); toast(`Programación ${r.folio} enviada a RH.`); if (opts.onSent) opts.onSent(r); }
      catch (ex) { if (isAppErr(ex)) errBox($('#pl-err'), ex.message); else throw ex; }
    }
  });
  plRender();
}
