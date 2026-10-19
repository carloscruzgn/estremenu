"""Imagen para compartir (Open Graph): la cabecera de la portada, con el título y el mapa detrás, en 1200 × 630.

Uso, desde la raíz del repositorio:  python3 fuente/og.py  [ruta del Chrome]
Escribe img/og.jpg. Saca la imagen de la propia portada (index.html) en reposo, sin movimiento:
si cambian el título, el antetítulo o el mapa de la portada, se vuelve a correr.
"""
import http.server, os, socketserver, sys, threading
from functools import partial
from playwright.sync_api import sync_playwright

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'img', 'og.jpg')
CHROME = sys.argv[1] if len(sys.argv) > 1 else None
W, H = 1200, 630

# Solo la cabecera, a toda la imagen; fuera la banda de arriba, el botón Saltar y el resto de la portada.
CSS = f"""
body > *:not(main), #vistas > *:not(#v-inicio), #v-inicio > *:not(.heroe), .saltar {{ display: none !important }}
html, body, main, #v-inicio {{ margin: 0 !important; padding: 0 !important; min-height: 0 !important }}
.heroe {{ width: {W}px; height: {H}px; min-height: {H}px !important; padding: 0 !important; box-sizing: border-box }}
.heroe > .envoltura {{ max-width: none !important; padding-inline: 84px !important }}
.portada h1 {{ margin-top: 14px !important }}
.portada h1 .l1 {{ font-size: 76px !important }}
.portada h1 .l2 {{ font-size: 172px !important }}
.heroe .antetitulo {{ font-size: 22px !important }}
"""

class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

with socketserver.TCPServer(('127.0.0.1', 0), partial(Silencioso, directory=RAIZ)) as srv:
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{srv.server_address[1]}/index.html#inicio'
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=CHROME) if CHROME else p.chromium.launch()
        pag = nav.new_page(viewport={'width': W, 'height': H}, device_scale_factor=1, reduced_motion='reduce')
        pag.goto(url, wait_until='networkidle')
        pag.add_style_tag(content=CSS)
        # El encuadre del mapa se calcula con el tamaño de la cabecera: se recalcula con el nuevo
        pag.evaluate("dispatchEvent(new Event('resize'))")
        pag.wait_for_function("document.querySelectorAll('#titulo-portada .cambio.fijo').length === 2")
        pag.evaluate("document.fonts.ready")
        pag.wait_for_timeout(1500)
        pag.locator('#heroe').screenshot(path=SALIDA, type='jpeg', quality=88)
        nav.close()
    srv.shutdown()
print('Escrita', os.path.relpath(SALIDA, RAIZ))
