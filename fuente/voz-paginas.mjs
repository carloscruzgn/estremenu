// Una página mínima por palabra del diccionario, para que al compartir una palabra salga su vista previa
// (Carlos, 19/10/2026). WhatsApp y las redes no ejecutan JavaScript ni leen lo que va tras la almohadilla:
// sin una dirección real por palabra, toda dirección enseña la vista previa de la portada.
// Uso, desde publicar.sh: node fuente/voz-paginas.mjs _site   → _site/voz/<palabra>.html
// Cloudflare sirve voz/<palabra>.html en /voz/<palabra>. La página lleva el título y la descripción de la
// palabra y manda en el acto a /#voz/<palabra>, la ficha de siempre.
import fs from 'fs';
import path from 'path';

const aqui = path.dirname(new URL(import.meta.url).pathname);
const salida = process.argv[2];
if (!salida) { console.error('Uso: node voz-paginas.mjs <carpeta de salida>'); process.exit(1); }
const DIC = JSON.parse(fs.readFileSync(path.join(aqui, '..', 'datos', 'diccionario.json'), 'utf8'));

const BASE = 'https://estremenu.pages.dev';
// El nombre del fichero es el lema con la barra cambiada por un guion; el resto, tal cual.
export const nombreVoz = lema => lema.normalize('NFC').replace(/\//g, '-');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const texto = h => h.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const hashVoz = lema => '#voz/' + lema.replace(/%/g, '%25').replace(/ /g, '%20').replace(/#/g, '%23');

const dir = path.join(salida, 'voz');
fs.mkdirSync(dir, { recursive: true });
const vistos = new Set();
let n = 0;
for (const e of DIC.e) {
  const lema = e[1], cab = (e[2].match(/<p class="e-cab">([\s\S]*?)<\/p>/) || [, ''])[1];
  const nombre = nombreVoz(lema);
  if (vistos.has(nombre)) { console.error('Nombre repetido: ' + nombre); process.exit(1); }
  vistos.add(nombre);
  // Las comarcas: el primer paréntesis de la cabecera; los significados: lo que va en negrita
  const comarcas = (texto(cab.replace(/<span class="e-lema">[\s\S]*?<\/span>/, '')).match(/\(([^)]*)\)/) || [, ''])[1];
  const glosa = [...cab.matchAll(/<b>([\s\S]*?)<\/b>/g)].map(m => texto(m[1])).join(' ');
  const desc = glosa + (comarcas ? ` (${comarcas})` : '');
  const titulo = `${lema} · Diccionario del Taller de estremeñu`;
  const url = BASE + '/voz/' + encodeURIComponent(nombre), destino = '/' + hashVoz(lema);
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="Taller de estremeñu · CEPA Coria">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${BASE}/img/og.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Taller de estremeñu, CEPA Coria, curso 2026-2027, sobre el mapa del noroeste de Cáceres">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="/img/icono-32.png">
<meta http-equiv="refresh" content="0; url=${esc(destino)}">
<script>location.replace(${JSON.stringify(destino)});</script>
</head>
<body style="font-family:sans-serif;background:#132e0d;color:#fff;padding:24px">
<p><a style="color:#fff" href="${esc(destino)}">${esc(lema)}</a>, en el diccionario del Taller de estremeñu.</p>
</body>
</html>
`;
  fs.writeFileSync(path.join(dir, nombre + '.html'), html);
  n++;
}
console.log(`voz-paginas: ${n} páginas en ${dir}`);
