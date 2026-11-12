// Una página mínima por palabra del diccionario, para que al compartir una palabra salga su vista previa
// (Carlos, 19/10/2026). WhatsApp y las redes no ejecutan JavaScript ni leen lo que va tras la almohadilla:
// sin una dirección real por palabra, toda dirección enseña la vista previa de la portada.
// Uso, desde publicar.sh: node fuente/voz-paginas.mjs _site   → _site/voz/<palabra>.html
// Cloudflare sirve voz/<palabra>.html en /voz/<palabra>. La página lleva el título y la descripción de la
// palabra y manda en el acto a /#voz/<palabra>, la ficha de siempre. La imagen, img/og-diccionario.jpg, la misma
// para todas, la hace fuente/og-diccionario.py.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
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
// Los homónimos (dos lemas con la misma forma, como pielga, 20/10/2026) comparten página: la descripción
// lleva los dos, y la ficha abre el primero con los dos en la lista del buscador. Dos lemas distintos que
// dieran el mismo nombre de fichero (por la barra) sí paran la publicación.
const grupos = new Map();
for (const e of DIC.e) {
  const nombre = nombreVoz(e[1]);
  if (!grupos.has(nombre)) grupos.set(nombre, []);
  const g = grupos.get(nombre);
  if (g.length && g[0][1].normalize('NFC') !== e[1].normalize('NFC')) { console.error('Nombre repetido: ' + nombre); process.exit(1); }
  g.push(e);
}
let n = 0;
for (const [nombre, g] of grupos) {
  const lema = g[0][1];
  // Las comarcas: el primer paréntesis de la cabecera, o los de todas las acepciones; los significados: lo que va en negrita
  const desc = g.map(e => {
    const cab = (e[2].match(/<p class="e-cab">([\s\S]*?)<\/p>/) || [, ''])[1];
    const sinLema = cab.replace(/<span class="e-lema">[\s\S]*?<\/span>/, '');
    // Con varias acepciones, los lugares van tras el número de cada una (12/11/2026): se reúnen los de todas, sin repetir
    const porAc = [...sinLema.matchAll(/<b>\d+\.<\/b> \(([\s\S]*?)\) /g)].map(m => texto(m[1]));
    const comarcas = porAc.length ? [...new Set(porAc.flatMap(x => x.split(', ')))].sort(new Intl.Collator('es').compare).join(', ')
      : (texto(sinLema).match(/\(([^)]*)\)/) || [, ''])[1];
    const glosa = [...cab.matchAll(/<b>([\s\S]*?)<\/b>/g)].map(m => texto(m[1])).join(' ');
    return glosa + (comarcas ? ` (${comarcas})` : '');
  }).join(' · ');
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
<meta property="og:image" content="${BASE}/img/og-diccionario.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Diccionario del Taller de estremeñu, CEPA Coria">
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
