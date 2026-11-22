/* ==========================================================================
   PÁGINAS CON ENLACE PROPIO (formularios y vistas del externo)
   No cargan la navegación administrativa ni enlazan a la matriz.
   ========================================================================== */
const PAGE = document.body.dataset.page;
const HASH = () => decodeURIComponent((location.hash || '').slice(1));
const extHead = (sub) => `<header class="ext-head"><div class="in"><div class="w">BELLAVISTA</div><div class="s">Golf &amp; Country Club · ${sub}</div></div></header>`;
const PRIV = `<label class="check"><input type="checkbox" id="priv"><span class="req-m">Acepto que el club use estos datos solo para controlar el acceso, conforme a su aviso de privacidad [DATO: liga al aviso vigente].</span></label>`;
function mount(html) { $('#app').innerHTML = simBar(' Este enlace solo funciona dentro del prototipo; no es un formulario público publicado.') + html; drawQR(); }

const DEF_PER = [['nombre', 'Nombre completo'], ['tel', 'Teléfono', 'tel', 'placeholder="10 dígitos"'], ['correo', 'Correo', 'email'], ['responsable', 'Responsable', 'check']];
const DEF_VEH = [['marca', 'Marca'], ['modelo', 'Modelo'], ['color', 'Color'], ['placas', 'Placas', 'text', 'style="text-transform:uppercase"']];
const DEF_MAT = [['desc', 'Descripción'], ['cant', 'Cantidad', 'number', 'min="1"'], ['marca', 'Marca']];

/* ---------- Proveedores ---------- */
function pageProveedores(done) {
  if (done) return mount(extHead('Proveedores') + `<div class="ext-wrap"><h1>Solicitud recibida</h1><div class="note ok"><b>Folio ${esc(done)}.</b> Su solicitud llegó al club y está pendiente de revisión de Recursos Humanos. Enviarla no autoriza el acceso: recibirá la confirmación y el pase por correo.</div><div class="row-actions"><button class="btn" id="otra">Registrar otra solicitud</button></div></div>`), $('#otra').onclick = () => pageProveedores();
  mount(extHead('Proveedores') + `<div class="ext-wrap"><div><div class="eyebrow">Formulario de proveedores</div><h1>Solicitud de acceso de proveedores</h1><p class="muted">Para entregas, servicios, instalaciones y paquetería. Los campos con * son obligatorios. Enviar la solicitud no autoriza el acceso.</p></div>
  <form class="req" id="f" novalidate>
   <fieldset><legend><span class="n">01</span>Tipo de visita</legend><div class="radios">${Object.entries(MODALIDADES).map(([k, l], i) => `<label class="radio"><input type="radio" name="mod" value="${k}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
     <p class="hint" id="paqnote" hidden>La guía identifica la entrega; <b>no autoriza el ingreso de ninguna persona</b>. El repartidor entrega en caseta conforme al procedimiento aprobado por RH [DATO: procedimiento].</p></fieldset>
   <fieldset><legend><span class="n">02</span>Empresa que provee</legend><div class="fgrid"><div class="field"><label class="req-m" for="razon">Razón social</label><input type="text" id="razon"></div><div class="field"><label for="comercial">Nombre comercial</label><input type="text" id="comercial"></div><div class="field"><label for="contratista">Contratista</label><input type="text" id="contratista"></div></div>
     <div class="fgrid"><div class="field"><label class="req-m" for="cnom">Quien llena la solicitud</label><input type="text" id="cnom"></div><div class="field"><label class="req-m" for="cmail">Correo de contacto</label><input type="email" id="cmail"></div><div class="field"><label for="ctel">Teléfono</label><input type="tel" id="ctel"></div></div></fieldset>
   <fieldset><legend><span class="n">03</span>Quién recibe en el club</legend><div class="fgrid"><div class="field"><label class="req-m" for="rarea">Área que recibe</label><select id="rarea"><option value="">Elija…</option>${CFG.areas.map(a => `<option>${a}</option>`).join('')}</select></div><div class="field"><label class="req-m" for="rper">Persona que recibe</label><input type="text" id="rper"></div></div></fieldset>
   <fieldset><legend><span class="n">04</span>Fechas y horario</legend><div class="fgrid"><div class="field"><label class="req-m" for="fini">Inicio</label><input type="date" id="fini"></div><div class="field"><label class="req-m" for="ffin">Término</label><input type="date" id="ffin"></div><div class="field"><label class="req-m" for="hini">Hora de ingreso</label><input type="time" id="hini"></div><div class="field"><label class="req-m" for="hfin">Hora de salida</label><input type="time" id="hfin"></div></div><p class="hint">La puerta la asigna el club al autorizar.</p></fieldset>
   <fieldset id="fs-per"><legend><span class="n">05</span>Personas que ingresarán</legend><p class="hint">Quien efectivamente entra al club. El responsable necesita teléfono y presenta identificación oficial.</p>${dynBlock('per', DEF_PER, [{ responsable: true }], '+ Agregar persona', 16)}</fieldset>
   <fieldset id="fs-paq" hidden><legend><span class="n">05</span>Entrega por paquetería</legend><div class="fgrid"><div class="field"><label class="req-m" for="guia">Guía o referencia</label><input type="text" id="guia"></div><div class="field"><label for="paqueteria">Empresa de paquetería</label><input type="text" id="paqueteria"></div><div class="field"><label for="bultos">Bultos</label><input type="number" id="bultos" min="1" value="1"></div></div></fieldset>
   <fieldset><legend><span class="n">06</span>Mercancía que se entrega</legend><p class="hint">Lo que se queda en el club.</p>${dynBlock('merc', DEF_MAT, [], '+ Agregar mercancía')}</fieldset>
   <fieldset><legend><span class="n">07</span>Equipo o instalaciones que se retiran después</legend><p class="hint">Lo que se instala y luego se recoge. Vigilancia lo verificará a la salida.</p>${dynBlock('ret', DEF_MAT, [], '+ Agregar equipo o instalación')}</fieldset>
   <fieldset><legend><span class="n">08</span>Equipo de trabajo que entra y sale</legend>${dynBlock('eq', DEF_MAT, [], '+ Agregar equipo')}</fieldset>
   <fieldset id="fs-veh"><legend><span class="n">09</span>Vehículos</legend>${dynBlock('veh', DEF_VEH, [], '+ Agregar vehículo', 10)}</fieldset>
   <fieldset><legend><span class="n">10</span>Observaciones</legend><textarea id="obs" aria-label="Observaciones"></textarea>${PRIV}</fieldset>
   <div id="err" class="note err" hidden role="alert"></div>
   <button class="btn primary big" type="submit">Enviar solicitud</button></form></div>`);
  document.querySelectorAll('input[name=mod]').forEach(r => r.onchange = () => { const p = r.value === 'paqueteria' && r.checked; if (!r.checked) return; $('#fs-per').hidden = p; $('#fs-veh').hidden = p; $('#fs-paq').hidden = !p; $('#paqnote').hidden = !p; });
  $('#f').onsubmit = e => { e.preventDefault(); const v = id => $('#' + id).value.trim(); const mod = $('input[name=mod]:checked').value; const paq = mod === 'paqueteria';
    if (!$('#priv').checked) { errBox($('#err'), 'Acepte el aviso de privacidad.'); return; }
    const d = { modalidad: mod, empresa: { razon: v('razon'), comercial: v('comercial'), contratista: v('contratista') }, contacto: { nombre: v('cnom'), correo: v('cmail'), tel: v('ctel').replace(/\D/g, '') }, recibe: { area: v('rarea'), persona: v('rper') }, fini: v('fini'), ffin: v('ffin'), hini: v('hini'), hfin: v('hfin'), personas: paq ? [] : readDyn('per').map(p => ({ ...p, tel: (p.tel || '').replace(/\D/g, '') })), paq: paq ? { guia: v('guia'), paqueteria: v('paqueteria'), bultos: +v('bultos') || 1 } : null, mercancia: readDyn('merc').map(m => ({ ...m, cant: +m.cant })), retira: readDyn('ret').map(m => ({ ...m, cant: +m.cant })), equipo: readDyn('eq').map(m => ({ ...m, cant: +m.cant })), vehiculos: paq ? [] : readDyn('veh'), obs: v('obs') };
    try { loadDB(); const r = api.recibirFormulario('proveedores', d); pageProveedores(r.folio); window.scrollTo({ top: 0 }); } catch (ex) { if (isAppErr(ex)) errBox($('#err'), ex.message); else throw ex; } };
}

/* ---------- Patrocinadores (enlace por torneo) ---------- */
function pagePatrocinadores(done) {
  const tk = HASH(); const t = api.torneoPorEnlace(tk);
  if (!t) return mount(extHead('Patrocinadores') + `<div class="ext-wrap">${empty('Enlace no válido', 'Pida a Logística de patrocinios el enlace vigente de su torneo.')}</div>`);
  const info = `<div class="fixed-info"><div><span>Torneo</span>${esc(t.nombre)}</div><div><span>Fechas</span>${rango(t.fini, t.ffin)}</div><div><span>Lugar</span>${esc(t.lugar)}</div><div><span>Puerta</span>${esc(t.puerta)}</div><div><span>Zona de montaje</span>${esc(t.zona)}</div><div><span>Ingreso a montaje</span>${fmtD(t.fechaMontaje)} · ${t.ingresoIni}–${t.ingresoFin}</div><div><span>Turnos</span>de ${t.turnoMin} min · tolerancia ${t.tolMin} min</div><div><span>Descarga</span>${t.descarga[0]}–${t.descarga[1]}</div><div><span>Montaje</span>${t.montaje[0]}–${t.montaje[1]}</div><div><span>Desmontaje</span>${fmtD(t.desmontaje[0])} · ${t.desmontaje[1]}–${t.desmontaje[2]}</div><div><span>Cierre del registro</span>${fmtDT(t.cierreRegistro)}</div></div>`;
  if (done) return mount(extHead('Patrocinadores') + `<div class="ext-wrap"><h1>Registro recibido</h1><div class="note ok"><b>Folio ${esc(done.folio)}.</b> ${done.turno && done.turno.turno ? `Turno provisional de llegada: <b>${done.turno.turno}</b>.` : 'No hubo espacio en los turnos disponibles: quedó en <b>lista de espera</b>; Logística le contactará.'} El pase se envía cuando Recursos Humanos autorice y Logística confirme su horario.</div>${info}</div>`);
  if (!t.abierto) return mount(extHead('Patrocinadores') + `<div class="ext-wrap"><h1>${esc(t.nombre)}</h1><div class="note warn">El registro cerró el ${fmtDT(t.cierreRegistro)}. Comuníquese con Logística de patrocinios.</div>${info}</div>`);
  mount(extHead('Patrocinadores') + `<div class="ext-wrap"><div><div class="eyebrow">Registro de patrocinadores</div><h1>${esc(t.nombre)}</h1><p class="muted">Las reglas logísticas las define el club y no se modifican desde este formulario.</p></div>${info}
  <form class="req" id="f" novalidate>
   <fieldset><legend><span class="n">01</span>Empresa patrocinadora</legend><div class="field"><label class="req-m" for="razon">Razón social</label><input type="text" id="razon"></div></fieldset>
   <fieldset><legend><span class="n">02</span>Responsables y contactos</legend><p class="hint">Teléfono de 10 dígitos y correo. Cada responsable recibe su propio pase.</p>${dynBlock('resp', [['nombre', 'Nombre completo'], ['tel', 'Teléfono', 'tel'], ['correo', 'Correo', 'email']], [{}], '+ Agregar responsable', 4)}</fieldset>
   <fieldset><legend><span class="n">03</span>Participantes</legend><p class="hint">Si un participante no tiene correo, su pase llega al responsable.</p>${dynBlock('part', [['nombre', 'Nombre completo'], ['correo', 'Correo (opcional)', 'email']], [], '+ Agregar participante', 16)}
     <label class="check"><input type="checkbox" id="idok"><span class="req-m">Cada persona presentará identificación oficial vigente en caseta.</span></label></fieldset>
   <fieldset><legend><span class="n">04</span>Vehículos</legend><p class="hint">Cada vehículo ocupa capacidad del turno.</p>${dynBlock('veh', DEF_VEH, [], '+ Agregar vehículo', 6)}</fieldset>
   <fieldset><legend><span class="n">05</span>Equipo</legend>${dynBlock('eq', DEF_MAT, [], '+ Agregar equipo')}</fieldset>
   <fieldset><legend><span class="n">06</span>Instalaciones y montaje</legend><div class="field"><label for="inst">Instalaciones (stand, carpa, medidas)</label><input type="text" id="inst"></div>
     <div class="radios"><label class="radio"><input type="radio" name="desc" value="si"><span>Requiere descarga<small>Turno dentro de ${t.descarga[0]}–${t.descarga[1]}</small></span></label><label class="radio"><input type="radio" name="desc" value="no" checked><span>No requiere descarga</span></label></div>
     <div class="field"><label for="nec">Necesidades de montaje</label><input type="text" id="nec" placeholder="Ej. corriente eléctrica, mesa"></div></fieldset>
   ${t.controlObjetos ? `<fieldset><legend><span class="n">07</span>Objetos y mobiliario que ingresan al campo de golf</legend><p class="hint">Se revisan al entrar y al salir. ${esc(t.objetosNota || '')}</p>${dynBlock('obj', [['desc', 'Objeto o mobiliario'], ['cant', 'Cantidad', 'number', 'min="1"']], [], '+ Agregar objeto')}</fieldset>` : ''}
   <fieldset><legend><span class="n">08</span>Observaciones</legend><textarea id="obs" aria-label="Observaciones"></textarea>${PRIV}</fieldset>
   <div id="err" class="note err" hidden role="alert"></div><button class="btn primary big" type="submit">Enviar registro</button></form></div>`);
  $('#f').onsubmit = e => { e.preventDefault(); if (!$('#priv').checked) { errBox($('#err'), 'Acepte el aviso de privacidad.'); return; }
    const d = { enlace: tk, empresa: { razon: $('#razon').value.trim() }, personas: readDyn('resp').map(p => ({ ...p, tel: (p.tel || '').replace(/\D/g, ''), responsable: true })).concat(readDyn('part').map(p => ({ ...p, tel: '', responsable: false }))), idConfirmada: $('#idok').checked, vehiculos: readDyn('veh'), equipo: readDyn('eq').map(m => ({ ...m, cant: +m.cant })), instalaciones: $('#inst').value.trim(), montaje: { descarga: $('input[name=desc]:checked').value === 'si', necesidades: $('#nec').value.trim() }, objetosCampo: t.controlObjetos ? readDyn('obj').map(m => ({ ...m, cant: +m.cant })) : [], obs: $('#obs').value.trim() };
    try { loadDB(); const r = api.recibirFormulario('patrocinadores', d); pagePatrocinadores(r); window.scrollTo({ top: 0 }); } catch (ex) { if (isAppErr(ex)) errBox($('#err'), ex.message); else throw ex; } };
}

/* ---------- Staff (enlace para el responsable interno) ---------- */
function pageStaff() {
  const resp = db.usuarios.filter(u => u.perfil === 'responsable');
  const actorId = (() => { try { return localStorage.getItem('accesos-bellavista-v2-resp') || resp[0].id; } catch (e) { return resp[0].id; } })();
  mount(extHead('Programación de staff externo') + `<div class="ext-wrap" style="max-width:1200px"><div><div class="eyebrow">Para responsables internos</div><h1>Programación de staff externo</h1><p class="muted">Registre personas, eventos y jornadas. RH autoriza el acceso y el pase llega directo al trabajador.</p></div>
   <div class="card"><div class="field" style="max-width:420px"><label for="resp">Responsable que programa (sesión simulada)</label><select id="resp">${resp.map(u => `<option value="${u.id}" ${u.id === actorId ? 'selected' : ''}>${esc(u.nombre)}</option>`).join('')}</select></div></div><div id="pl"></div></div>`);
  PL = null; plLoad(actorId); plBind($('#pl'), {});
  $('#resp').onchange = e => { try { localStorage.setItem('accesos-bellavista-v2-resp', e.target.value); } catch (x) { } PL = null; plLoad(e.target.value); plRender(); };
}

/* ---------- Vistas del externo ---------- */
function pagePase() {
  const x = api.expediente(HASH());
  if (!x) return mount(extHead('Pase de acceso') + `<div class="ext-wrap">${empty('Pase no encontrado', 'La referencia no es válida.')}</div>`);
  const valido = x.estado === 'autorizado' && ['enviado', 'generado', 'fallido'].includes(x.paseEstado);
  mount(extHead('Pase de acceso') + `<div class="ext-wrap"><div class="pass ${valido ? '' : 'void'}"><div class="ph"><div class="w">BELLAVISTA</div><div class="s">Golf &amp; Country Club · Pase de acceso</div></div><div class="pb">
   ${valido ? '' : `<div class="note err"><b>${x.estado === 'cancelado' ? 'Este pase fue cancelado.' : x.paseEstado === 'suspendido' ? 'Pase suspendido: hay un cambio en revisión.' : 'Este pase no está vigente.'}</b></div>`}
   <div><div style="font-size:22px;font-weight:700">${esc(x.nombre)}</div><div class="muted">${esc(x.empresa)} · ${TIPOS[x.tipo]}</div></div>
   ${valido ? `<div class="qrbox" data-tk="${x.token}" aria-label="Código QR del pase"></div><div class="ref">${x.token}</div>` : ''}
   <div><div class="lbl">Válido únicamente en:</div><ul style="margin:6px 0 0;padding-left:18px">${x.ventanas.map(v => `<li>${fmtD(v.fecha)} · ${v.hini}–${v.hfin} <span class="muted">· ${esc(v.etiqueta)}</span></li>`).join('') || '<li>Sin jornadas autorizadas</li>'}</ul></div>
   <dl class="kv"><dt>Folio</dt><dd class="mono">${x.folio}</dd><dt>Puerta</dt><dd>${esc(x.puerta)}</dd></dl>
   <p class="hint">Presente su identificación oficial. El código solo localiza su permiso; fuera de estos días y horarios no es válido.</p></div></div></div>`);
}
function pageExpediente() {
  const x = api.expediente(HASH());
  if (!x) return mount(extHead('Mi expediente') + `<div class="ext-wrap">${empty('Expediente no encontrado', 'La referencia no es válida o venció.')}</div>`);
  mount(extHead('Mi expediente') + `<div class="ext-wrap"><h1>Mi expediente de acceso</h1><p class="muted">Solo usted ve esta información. No necesita repetir la solicitud.</p>
   <div class="card"><dl class="kv"><dt>Nombre</dt><dd><b>${esc(x.nombre)}</b></dd><dt>Folio</dt><dd class="mono">${x.folio}</dd><dt>Estado</dt><dd>${chip(x.estado)} ${paseChip(x.paseEstado)}</dd><dt>Jornadas</dt><dd>${x.ventanas.map(v => `${fmtD(v.fecha)} ${v.hini}–${v.hfin}`).join('<br>') || '—'}</dd></dl></div>
   <div class="card"><div class="card-h"><h2>Identificación</h2>${x.idEstado === 'recibida' ? '<span class="chip st-ok">Recibida</span>' : '<span class="chip st-pend">Falta</span>'}</div>
   ${x.idEstado === 'recibida' ? '<p class="muted">RH ya tiene su identificación.</p>' : `<div class="field"><label for="doc">Copia legible de su credencial para votar</label><input type="file" id="doc" accept="image/*,application/pdf"></div><div class="note warn" style="margin-top:10px">Prototipo: el archivo no se guarda ni se envía; solo se marca como recibido.</div><div class="row-actions" style="margin-top:10px"><button class="btn primary" id="sub">Enviar identificación</button></div>`}</div></div>`);
  const b = $('#sub'); if (b) b.onclick = () => { if (!$('#doc').files.length) { toast('Elija el archivo.', true); return; } try { loadDB(); api.subirDocumento(x.token, $('#doc').files[0].name); toast('Identificación recibida.'); pageExpediente(); } catch (ex) { if (isAppErr(ex)) toast(ex.message, true); else throw ex; } };
}

loadDB();
({ proveedores: pageProveedores, patrocinadores: pagePatrocinadores, staff: pageStaff, pase: pagePase, expediente: pageExpediente })[PAGE]();
window.addEventListener('hashchange', () => { if (PAGE !== 'proveedores' && PAGE !== 'staff') ({ patrocinadores: pagePatrocinadores, pase: pagePase, expediente: pageExpediente })[PAGE](); });
