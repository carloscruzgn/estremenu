"""Imagen para compartir una palabra del diccionario (Open Graph), 1200 × 630: el «ñu» sobre naranja y
«Diccionario» en la letra de los lemas sobre el verde (Carlos, 19/10/2026, la cuarta de cuatro propuestas).

Uso, desde la raíz del repositorio:  python3 fuente/og-diccionario.py  [ruta del Chrome]
Escribe img/og-diccionario.jpg, que llevan todas las páginas de voz/ (fuente/voz-paginas.mjs).
"""
import http.server, os, socketserver, sys, threading
from functools import partial
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'img', 'og-diccionario.jpg')
CHROME = sys.argv[1] if len(sys.argv) > 1 else None
ante = 'Taller de estremeñu · CEPA Coria'
F = f'''
@font-face{{font-family:M;font-weight:500;src:url(/img/fuentes/montserrat-latin-500-normal.woff2)}}
@font-face{{font-family:M;font-weight:700;src:url(/img/fuentes/montserrat-latin-700-normal.woff2)}}
@font-face{{font-family:M;font-weight:800;src:url(/img/fuentes/montserrat-latin-800-normal.woff2)}}
@font-face{{font-family:M;font-weight:900;src:url(/img/fuentes/montserrat-latin-900-normal.woff2)}}
@font-face{{font-family:M;font-weight:900;src:url(/img/fuentes/montserrat-latin-ext-900-normal.woff2);unicode-range:U+0100-02BA}}
@font-face{{font-family:G;font-style:normal;src:url(/img/fuentes/eb-garamond-latin-400-normal.woff2)}}
@font-face{{font-family:G;font-style:italic;src:url(/img/fuentes/eb-garamond-latin-400-italic.woff2)}}
@font-face{{font-family:G;font-weight:700;src:url(/img/fuentes/eb-garamond-latin-700-normal.woff2)}}
@font-face{{font-family:Fell;src:url(/img/fuentes/im-fell-english-sc-latin-400-normal.woff2)}}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:1200px;height:630px;overflow:hidden}}
'''
HTML = '<!doctype html><meta charset="utf-8">' + f'''<style>{F}
body{{display:flex;font-family:M}}
.izq{{width:470px;background:#ff914d;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#132e0d}}
.ñu{{font-weight:900;font-size:200px;line-height:1;color:#fff}}
.ñu i{{font-style:normal;color:#132e0d;text-decoration:underline;text-decoration-thickness:16px;text-underline-offset:22px}}
.der{{flex:1;background:#132e0d;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 70px}}
.k{{font-weight:700;font-size:22px;letter-spacing:.18em;text-transform:uppercase;color:#ff914d}}
h1{{font-family:Fell;font-weight:400;font-size:104px;line-height:1;margin:18px 0 22px}}
.s{{font-family:G;font-style:italic;font-size:36px;color:#f6eedf}}
</style><div class="izq"><div class="ñu">ñ<i>u</i></div></div><div class="der"><div class="k">{ante}</div><h1>Diccionario</h1><div class="s">Las palabras del noroeste de Cáceres</div></div>'''

class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.startswith('/_og'):
            b = HTML.encode('utf-8'); self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(b)))
            self.end_headers(); self.wfile.write(b)
        else: super().do_GET()

with socketserver.TCPServer(('127.0.0.1', 0), partial(Silencioso, directory=RAIZ)) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
        pag = nav.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
        pag.goto(f'http://127.0.0.1:{srv.server_address[1]}/_og', wait_until='networkidle')
        pag.evaluate('document.fonts.ready'); pag.wait_for_timeout(500)
        pag.screenshot(path=SALIDA, type='jpeg', quality=88)
        nav.close()
    srv.shutdown()
print('Escrita', os.path.relpath(SALIDA, RAIZ))
