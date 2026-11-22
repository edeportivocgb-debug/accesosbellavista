import json, base64, hashlib, threading, http.server, socketserver, functools, sys, os
from playwright.sync_api import sync_playwright
SITE=sys.argv[1]  # uso: python tests/test_store.py site
os.chdir(SITE)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True; srv=socketserver.TCPServer(('127.0.0.1',8778),Q)
threading.Thread(target=srv.serve_forever,daemon=True).start()
OFF={'v':False}
REPO={'file':None,'sha':None,'commits':[],'private':True}
def sha(b): return hashlib.sha1(b).hexdigest()
def handler(route):
    req=route.request; url=req.url; m=req.method
    if OFF['v']: return route.abort()
    hdr={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}
    if m=='OPTIONS': return route.fulfill(status=204,headers=hdr)
    if url.endswith('/repos/club/datos'):
        return route.fulfill(status=200,headers=hdr,content_type='application/json',body=json.dumps({'private':REPO['private'],'default_branch':'main','permissions':{'push':True}}))
    if '/contents/data/db.json' in url:
        if m=='GET':
            if REPO['file'] is None: return route.fulfill(status=404,headers=hdr,body='{}')
            return route.fulfill(status=200,headers=hdr,content_type='application/json',body=json.dumps({'sha':REPO['sha'],'content':base64.b64encode(REPO['file']).decode()}))
        if m=='PUT':
            b=json.loads(req.post_data)
            if REPO['file'] is not None and b.get('sha')!=REPO['sha']: return route.fulfill(status=409,headers=hdr,body='{"message":"conflict"}')
            REPO['file']=base64.b64decode(b['content']); REPO['sha']=sha(REPO['file']); REPO['commits'].append(b['message'])
            return route.fulfill(status=200,headers=hdr,content_type='application/json',body=json.dumps({'content':{'sha':REPO['sha']}}))
    route.fulfill(status=404,headers=hdr,body='{}')
res=[]
def ok(n,c): res.append((n,bool(c))); print(('OK  ' if c else 'FAIL'),n)
def conectar(pg,nombre):
    pg.fill('#ab-repo','club/datos'); pg.fill('#ab-tok','github_pat_x'); pg.fill('#ab-op',nombre); pg.click('#ab-go')
with sync_playwright() as p:
    br=p.chromium.launch(); 
    def newctx():
        c=br.new_context(); c.route('https://api.github.com/**',handler); c.route('https://fonts.*/**',lambda r:r.abort()); return c
    c1=newctx(); a=c1.new_page(); errs=[]; a.on('pageerror',lambda e:errs.append(str(e)))
    a.goto('http://127.0.0.1:8778/index.html')
    a.wait_for_selector('#ab-conn'); ok('pide conexión al abrir',True)
    REPO['private']=False; conectar(a,'Operador Uno'); a.wait_for_selector('#ab-err:visible'); ok('rechaza repo público','PÚBLICO' in a.inner_text('#ab-err'))
    REPO['private']=True; a.click('#ab-go'); a.wait_for_selector('.sync-bar'); a.wait_for_timeout(1200)
    ok('crea db.json inicial',REPO['file'] is not None and REPO['commits'][0].startswith('Inicialización'))
    d=json.loads(REPO['file']); ok('sin datos ficticios (eventos vacíos, sin nombres de ejemplo)',d['eventos']==[] and 'ficticio' not in REPO['file'].decode())
    ok('sin leyenda de prototipo',a.locator('.sim-bar').count()==0 and 'Guardado en GitHub' in a.inner_text('.sync-bar'))
    ok('menú sin reset/ simulado','Restablecer' not in a.content() and 'simulado' not in a.inner_text('header.top'))
    # formulario proveedor desde otro navegador (operador 2)
    c2=newctx(); b=c2.new_page(); b.on('pageerror',lambda e:errs.append(str(e)))
    b.goto('http://127.0.0.1:8778/formularios/proveedores.html'); b.wait_for_selector('#ab-conn'); conectar(b,'Operador Dos'); b.wait_for_selector('#f')
    ok('formulario abre tras conectar',True)
    # registrar evento desde admin (a) y solicitud en (b) casi a la vez
    a.evaluate("""()=>{ AB.api.guardarEvento(AB.U('u-adm'),{nombre:'Torneo real',area:'Golf',fini:AB.today(),ffin:AB.today(),lugar:'Campo',aforo:null,estadoFecha:'confirmada',tipo:'evento',fuente:'prueba'}); }""")
    b.evaluate("""()=>{ db.hist.unshift({cuando:new Date().toISOString(),usuario:'ext',accion:'Solicitud de prueba',folio:'PRV-26-0001',detalle:''}); db.seq.PRV=1; db.empresas.push({id:'emp-x',razon:'Empresa X'}); saveDB(); }""")
    a.wait_for_timeout(2500); b.wait_for_timeout(2500)
    a.evaluate("ABStore.sincronizar()"); a.wait_for_timeout(1500)
    fin=json.loads(REPO['file'])
    ok('fusión: evento y empresa coexisten',any(e['nombre']=='Torneo real' for e in fin['eventos']) and any(e['id']=='emp-x' for e in fin['empresas']))
    ok('seq PRV conservado',fin['seq']['PRV']==1)
    ok('commits con descripción',len(REPO['commits'])>=3 and any('Solicitud de prueba' in m for m in REPO['commits']))
    # recarga: lee desde GitHub
    a.reload(); a.wait_for_selector('.sync-bar'); a.wait_for_timeout(800)
    ok('al recargar carga desde GitHub',a.evaluate("AB.db.empresas.some(e=>e.id==='emp-x')"))
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
