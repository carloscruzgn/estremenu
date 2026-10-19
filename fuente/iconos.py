"""Icono de la web: «ñu», la ñ en blanco y la u naranja subrayada, sobre el verde oscuro (Carlos, 19/10/2026).

Uso, desde la raíz del repositorio:  python3 fuente/iconos.py  [ruta del Chrome]
Dibuja el icono a 1024 px con la Montserrat 900 de img/fuentes y lo reduce a:
  img/icono-32.png, img/icono-48.png, img/icono-192.png  — pestaña y buscadores, con las esquinas redondeadas
  img/apple-touch-icon.png (180)                         — pantalla de inicio del iPhone y el iPad: cuadrado
                                                           entero, sin transparencia, porque iOS redondea solo
"""
import http.server, io, os, socketserver, sys, threading
from functools import partial
from PIL import Image
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = sys.argv[1] if len(sys.argv) > 1 else None

def svg(rx):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="1024" height="1024">
<rect width="100" height="100" rx="{rx}" fill="#132e0d"/>
<text x="50" y="68" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="54" letter-spacing="-2"><tspan fill="#eef4e9">ñ</tspan><tspan fill="#ff914d">u</tspan></text>
<rect x="51" y="75" width="33" height="5.5" fill="#ff914d"/></svg>'''

PAGINA = '''<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Montserrat; font-weight: 900; src: url(img/fuentes/montserrat-latin-900-normal.woff2) }
html, body { margin: 0; background: transparent } div { width: 1024px; height: 1024px; line-height: 0 }
</style><div id="r">%s</div><div id="c">%s</div>'''

class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

with socketserver.TCPServer(('127.0.0.1', 0), partial(Silencioso, directory=RAIZ)) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    tmp = os.path.join(RAIZ, '_iconos.html')
    open(tmp, 'w').write(PAGINA % (svg(22), svg(0)))
    try:
        with sync_playwright() as p:
            nav = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
            pag = nav.new_page(viewport={'width': 1024, 'height': 2048})
            pag.goto(f'http://127.0.0.1:{srv.server_address[1]}/_iconos.html', wait_until='networkidle')
            pag.evaluate("document.fonts.load('900 54px Montserrat', 'ñu').then(() => document.fonts.ready)")
            pag.wait_for_timeout(500)
            redondo = Image.open(io.BytesIO(pag.locator('#r').screenshot(omit_background=True))).convert('RGBA')
            cuadrado = Image.open(io.BytesIO(pag.locator('#c').screenshot())).convert('RGB')
            nav.close()
    finally:
        os.remove(tmp)
    srv.shutdown()

for n in (32, 48, 192):
    redondo.resize((n, n), Image.LANCZOS).save(os.path.join(RAIZ, 'img', f'icono-{n}.png'), optimize=True)
cuadrado.resize((180, 180), Image.LANCZOS).save(os.path.join(RAIZ, 'img', 'apple-touch-icon.png'), optimize=True)
print('Escritos img/icono-32.png, img/icono-48.png, img/icono-192.png e img/apple-touch-icon.png')
