import json, base64, hashlib, threading, http.server, socketserver, functools, sys, os
from playwright.sync_api import sync_playwright
SITE=sys.argv[1]  # uso: python tests/test_store.py site  (simula Supabase; no usa red)
os.chdir(SITE)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True; srv=socketserver.TCPServer(('127.0.0.1',8778),Q)
threading.Thread(target=srv.serve_forever,daemon=True).start()
OFF={'v':False}
REPO={'file':None,'rev':0,'commits':[],'tabla':True,'form_externo':[]}
def handler(route):
    req=route.request; url=req.url; m=req.method
    if OFF['v']: return route.abort()
    hdr={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
    if m=='OPTIONS': return route.fulfill(status=204,headers=hdr)
    J=lambda st,obj: route.fulfill(status=st,headers=hdr,content_type='application/json',body=json.dumps(obj))
    if '/rest/v1/ab_db' not in url: return route.fulfill(status=404,headers=hdr,body='{}')
    if not REPO['tabla']: return J(404,{'code':'42P01'})
    if 'apikey' not in {k.lower() for k in req.headers}: return J(401,{})
    if m=='GET':
        if 'select=id' in url: return J(200,[])
        if REPO['file'] is None: return J(200,[])
        return J(200,[{'data':json.loads(REPO['file']),'rev':REPO['rev']}])
    b=json.loads(req.post_data)
    if m=='POST':
        if REPO['file'] is not None: return J(409,{'code':'23505'})
        if b.get('id')!='main': return J(401,{})
        REPO['file']=json.dumps(b['data']).encode(); REPO['rev']=b['rev']; REPO['commits'].append(b['mensaje']); REPO['form_externo'].append(b['updated_by'])
        return J(201,[{'rev':REPO['rev']}])
    if m=='PATCH':
        import re
        n=int(re.search(r'rev=eq\.(\d+)',url).group(1))
        if n!=REPO['rev']: return J(200,[])
        REPO['file']=json.dumps(b['data']).encode(); REPO['rev']=b['rev']; REPO['commits'].append(b['mensaje']); REPO['form_externo'].append(b['updated_by'])
        return J(200,[{'rev':REPO['rev']}])
    J(404,{})
res=[]
def ok(n,c): res.append((n,bool(c))); print(('OK  ' if c else 'FAIL'),n)
def conectar(pg,nombre):
    pg.fill('#ab-op',nombre); pg.click('#ab-go')
with sync_playwright() as p:
    br=p.chromium.launch(); 
    def newctx():
        c=br.new_context(); c.route('https://ynljuxfnlgzuxxfohpnb.supabase.co/**',handler); c.route('https://fonts.*/**',lambda r:r.abort()); return c
    c1=newctx(); a=c1.new_page(); errs=[]; a.on('pageerror',lambda e:errs.append(str(e)))
    a.goto('http://127.0.0.1:8778/index.html')
    a.wait_for_selector('#ab-conn'); ok('pide conexión al abrir',True)
    REPO['tabla']=False; conectar(a,'Operador Uno'); a.wait_for_selector('#ab-err:visible'); ok('avisa si falta la tabla','ab_db' in a.inner_text('#ab-err'))
    REPO['tabla']=True; a.click('#ab-go'); a.wait_for_selector('.sync-bar'); a.wait_for_timeout(1200)
    ok('crea el registro inicial',REPO['file'] is not None and REPO['commits'][0].startswith('Inicialización'))
    d=json.loads(REPO['file']); ok('sin datos ficticios (eventos vacíos, sin nombres de ejemplo)',d['eventos']==[] and 'ficticio' not in REPO['file'].decode())
    ok('sin leyenda de prototipo',a.locator('.sim-bar').count()==0 and 'Guardado en Supabase' in a.inner_text('.sync-bar'))
    ok('menú sin reset/ simulado','Restablecer' not in a.content() and 'simulado' not in a.inner_text('header.top'))
    # formulario proveedor desde otro navegador (operador 2)
    c2=newctx(); b=c2.new_page(); b.on('pageerror',lambda e:errs.append(str(e)))
    b.goto('http://127.0.0.1:8778/formularios/proveedores.html'); b.wait_for_selector('#f')
    ok('formulario externo abre sin pedir conexión',b.locator('#ab-conn').count()==0)
    # registrar evento desde admin (a) y solicitud en (b) casi a la vez
    a.evaluate("""()=>{ AB.api.guardarEvento(AB.U('u-adm'),{nombre:'Torneo real',area:'Golf',fini:AB.today(),ffin:AB.today(),lugar:'Campo',aforo:null,estadoFecha:'confirmada',tipo:'evento',fuente:'prueba'}); }""")
    b.evaluate("""()=>{ db.hist.unshift({cuando:new Date().toISOString(),usuario:'ext',accion:'Solicitud de prueba',folio:'PRV-26-0001',detalle:''}); db.seq.PRV=1; db.empresas.push({id:'emp-x',razon:'Empresa X'}); saveDB(); }""")
    a.wait_for_timeout(2500); b.wait_for_timeout(2500)
    a.evaluate("ABStore.sincronizar()"); a.wait_for_timeout(1500)
    fin=json.loads(REPO['file'])
    ok('fusión: evento y empresa coexisten',any(e['nombre']=='Torneo real' for e in fin['eventos']) and any(e['id']=='emp-x' for e in fin['empresas']))
    ok('seq PRV conservado',fin['seq']['PRV']==1)
    ok('formulario externo guarda como Formulario externo','Formulario externo' in REPO['form_externo'])
    ok('versiones con descripción',len(REPO['commits'])>=3 and any('Solicitud de prueba' in m for m in REPO['commits']))
    # recarga: lee desde Supabase
    a.reload(); a.wait_for_selector('.sync-bar'); a.wait_for_timeout(800)
    ok('al recargar carga desde Supabase',a.evaluate("AB.db.empresas.some(e=>e.id==='emp-x')"))
    # recorrer vistas sin errores
    for v in ['inicio','eventos','datos','proveedores','patrocinios','staff','rh','pagos','caseta','historial','enlaces']:
        a.evaluate(f"AB.go('{v}')")
    ok('vistas sin errores de JS',not errs); 
    if errs: print(errs)
    # sin red: guardar y reconectar
    OFF['v']=True; a.evaluate("db.hist.unshift({cuando:new Date().toISOString(),usuario:'x',accion:'Cambio offline',folio:'—',detalle:''}); saveDB();"); a.wait_for_timeout(1500)
    ok('sin red muestra aviso','Sin conexión' in a.inner_text('.sync-bar'))
    OFF['v']=False; a.evaluate("ABStore.sincronizar()"); a.wait_for_timeout(1500)
    ok('reconecta y envía pendientes',any('Cambio offline' in m for m in REPO['commits']))
    # modo práctica intacto
    c3=newctx(); pr=c3.new_page(); pr.goto('http://127.0.0.1:8778/index.html'); pr.wait_for_selector('#ab-conn'); pr.click('#ab-prac'); pr.wait_for_selector('.sim-bar'); pr.wait_for_timeout(600)
    ok('modo práctica con datos ficticios',pr.evaluate("AB.db.solicitudes.length")>3)
    br.close()
print('\n%d/%d'%(sum(1 for _,c in res if c),len(res))); 
