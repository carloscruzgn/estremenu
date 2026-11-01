// Prepara los datos de la web: la geometría común y la clasificación de cada rasgo.
// Uso: node construir.mjs            → ../datos/base.json, ../datos/rasgos.json y ../datos/rasgos/<código>.json
// Sale del motor del generador de reels (reel-rasgo.zip, construir-datos.mjs): misma proyección, mismas clases.
import fs from 'fs';
import path from 'path';
import * as topo from 'topojson-client';
import { geoConicConformal, geoPath, geoContains } from 'd3-geo';
import { cifrasDiccionario } from './cifras-diccionario.mjs';

const aqui = path.dirname(new URL(import.meta.url).pathname);
const destino = path.resolve(aqui, '../datos');
const leer = f => JSON.parse(fs.readFileSync(path.join(aqui, f)));
const COM = leer('comarcas.json');
const CAT = leer('catalogo.json');
const nm = p => path.join(aqui, 'node_modules', p);
const es = JSON.parse(fs.readFileSync(nm('es-atlas/es/municipalities.json')));
const world = JSON.parse(fs.readFileSync(nm('world-atlas/countries-50m.json')));

// Proyección cónica conforme centrada en la Península; unidades de unos 10 km (la del reel)
const proj = geoConicConformal().parallels([36, 43]).rotate([3.7, 0]).center([0, 40]).scale(6371 / 10).translate([0, 0]);
const pathGen = geoPath(proj);

const SAL = ['rebollar', 'robledo', 'agadones', 'francia', 'bejar'];
const comarca = k => { if (!COM[k]) throw new Error('Comarca desconocida: ' + k); return COM[k].terminos.split(' '); };
const deComarcas = ks => (ks || []).flatMap(comarca);
const area = COM._area_del_taller;
const core = new Set(deComarcas(area.nucleo));
const contact = new Set([...deComarcas(area.contacto), ...area.contacto_terminos.split(' ')]);
const comarcaDe = {};
for (const [k, v] of Object.entries(COM)) if (!k.startsWith('_')) for (const c of v.terminos.split(' ')) comarcaDe[c] = k;

function rings(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  return polys.map(p => p.map(r => r.map(c => { const q = proj(c); return [+q[0].toFixed(2), +(-q[1]).toFixed(2)]; })));
}
const centro = f => { const [[x0, y0], [x1, y1]] = pathGen.bounds(f); return [+((x0 + x1) / 2).toFixed(2), +(-(y0 + y1) / 2).toFixed(2)]; };

// ---------- geometría común ----------
const munis = topo.feature(es, es.objects.municipalities).features;
const provs = topo.feature(es, es.objects.provinces).features;
const portugal = topo.feature(world, world.objects.countries).features.find(f => f.id === '620');
const salamanca = new Set(deComarcas(SAL));

const base = { munis: [], provs: [], portugal: rings(portugal.geometry), comarcas: {} };
for (const f of munis) {
  const code = f.id;
  if (!(code.startsWith('06') || code.startsWith('10') || salamanca.has(code))) continue;
  base.munis.push({ code, name: f.properties.name, rings: rings(f.geometry), c: centro(f), area: core.has(code) ? 'core' : contact.has(code) ? 'contact' : 'none', comarca: comarcaDe[code] || null });
}
for (const f of provs) {
  // Solo las provincias que caben en los encuadres: Extremadura y sus vecinas
  if (!['06', '10', '37', '05', '45', '13', '14', '41', '21', '49'].includes(f.id)) continue;
  base.provs.push({ code: f.id, name: f.properties.name, rings: rings(f.geometry), ext: ['06', '10'].includes(f.id) });
}
for (const [k, v] of Object.entries(COM)) if (!k.startsWith('_')) base.comarcas[k] = { nombre: v.nombre, terminos: v.terminos.split(' ') };
const todos = new Set(base.munis.map(m => m.code));
const sinComarca = base.munis.filter(m => /^(06|10)/.test(m.code) && !m.comarca).map(m => m.code);
if (sinComarca.length) console.warn('Términos extremeños sin comarca:', sinComarca.join(' '));
fs.mkdirSync(path.join(destino, 'rasgos'), { recursive: true });
fs.writeFileSync(path.join(destino, 'base.json'), JSON.stringify(base));
console.log('base.json:', base.munis.length, 'términos,', base.provs.length, 'provincias');

// ---------- un fichero por rasgo con mapa ----------
for (const r of CAT.rasgos.filter(r => r.mapa)) {
  const R = leer(path.join('rasgos', r.codigo + '.json'));
  const oleadas = (R.oleadas || []).map(o => o.terminos || {});
  const fuera = (R.fuera && R.fuera.terminos) || {};
  const nunca = new Set(Object.keys(R.nunca || {}));
  const excluir = new Set((R.probable && R.probable.excluir) || []);
  const prob = new Set([...deComarcas(R.probable && R.probable.comarcas), ...((R.probable && R.probable.terminos) || [])]);
  const algunos = new Set([...deComarcas(R.algunos && R.algunos.comarcas), ...((R.algunos && R.algunos.terminos) || [])]);
  const nw = R.noroeste || null;
  const neg = new Set(nw && nw.en_contra ? [...deComarcas(nw.en_contra.comarcas), ...(nw.en_contra.terminos || [])] : []);

  const usados = [...oleadas.flatMap(Object.keys), ...Object.keys(fuera), ...nunca, ...excluir, ...((R.probable && R.probable.terminos) || []), ...neg];
  const faltan = [...new Set(usados)].filter(c => !todos.has(c));
  if (faltan.length) { console.error(r.codigo, 'códigos que no están en el mapa:', faltan.join(' ')); process.exit(1); }

  const clases = {}, resumen = {};
  for (const m of base.munis) {
    const code = m.code, enArea = m.area !== 'none';
    const again = oleadas.map((o, i) => o[code] ? i + 1 : 0).filter(Boolean);
    const wave = enArea && again.length ? again[0] : 0;
    let cls = 'base';
    if (wave) cls = 'reg';
    else if (fuera[code] || (!enArea && again.length)) cls = 'out';
    else if (nunca.has(code)) cls = 'never';
    else if (prob.has(code) && !excluir.has(code)) cls = 'prob';
    else if (algunos.has(code) && !excluir.has(code)) cls = 'part';
    const n = neg.has(code) && cls !== 'reg' && cls !== 'out';
    resumen[cls] = (resumen[cls] || 0) + 1;
    if (cls !== 'base' || n) clases[code] = { cls, wave, again: enArea ? again : [], neg: n };
  }
  const pagina = r.pagina ? leer(path.join('apuntes', r.codigo + '.json')) : null;
  fs.writeFileSync(path.join(destino, 'rasgos', r.codigo + '.json'), JSON.stringify({ rasgo: R, clases, pagina }));
  console.log(r.codigo, 'clases:', JSON.stringify(resumen), '· en contra:', Object.values(clases).filter(c => c.neg).length);
}
// Los rasgos sin mapa interactivo: solo su página de los apuntes
for (const r of CAT.rasgos.filter(r => !r.mapa && r.pagina)) {
  fs.writeFileSync(path.join(destino, 'rasgos', r.codigo + '.json'), JSON.stringify({ rasgo: null, clases: null, pagina: leer(path.join('apuntes', r.codigo + '.json')) }));
}
fs.writeFileSync(path.join(destino, 'rasgos.json'), JSON.stringify(CAT));
// Los textos leídos en el taller, con las palabras de sus rasgos destacados marcadas
const TX = fs.readdirSync(path.join(aqui, 'textos')).filter(f => /^TEX-\d+\.json$/.test(f)).sort().map(f => leer(path.join('textos', f)));
for (const t of TX) for (const c of t.rasgos) if (!CAT.rasgos.some(r => r.codigo === c)) console.warn(t.codigo, 'destaca un rasgo que no está en el catálogo:', c);
// Un texto sin «leido» sale como «Pendiente de leer»: no puede haber más de uno a la vez (Carlos, 18/10/2026)
if (TX.filter(t => !t.leido).length > 1) { console.error('Hay más de un texto pendiente de leer:', TX.filter(t => !t.leido).map(t => t.codigo).join(', ')); process.exit(1); }
fs.writeFileSync(path.join(destino, 'textos.json'), JSON.stringify(TX));
console.log('textos.json:', TX.length, 'textos');
// Las páginas «Sobre el autor» de los textos: cada texto que nombran tiene que existir
const AU = leer('autores.json');
for (const a of AU.autores) for (const c of a.textos) if (!TX.some(t => t.codigo === c)) { console.error('autores.json:', a.id, 'nombra un texto que no está:', c); process.exit(1); }
fs.writeFileSync(path.join(destino, 'autores.json'), JSON.stringify(AU));
console.log('autores.json:', AU.autores.length, 'páginas de autor');
// Los vídeos del taller (#videos), por series: cada vídeo y su portada tienen que estar, y por debajo del tope de Cloudflare Pages, 25 MiB por fichero
const VD = leer('videos.json');
delete VD._nota;
{
  const raiz = path.resolve(aqui, '..'), ids = new Set();
  for (const s of VD.series) for (const v of s.videos) {
    if (ids.has(v.id)) { console.error('videos.json: id repetido:', v.id); process.exit(1); }
    ids.add(v.id);
    for (const f of [v.fichero, v.portada]) {
      const p = path.join(raiz, f);
      if (!fs.existsSync(p)) { console.error('videos.json:', v.id, 'no encuentra', f); process.exit(1); }
      if (fs.statSync(p).size > 25 * 1024 * 1024) { console.error('videos.json:', f, 'pasa de 25 MiB, el tope de Cloudflare Pages'); process.exit(1); }
    }
    for (const e of v.en || []) if (!/^apuntes-\d+$/.test(e) && !CAT.rasgos.some(r => r.codigo === e)) console.warn('videos.json:', v.id, 'enlaza desde una página que no está:', e);
  }
}
fs.writeFileSync(path.join(destino, 'videos.json'), JSON.stringify(VD));
console.log('videos.json:', VD.series.length, 'series,', VD.series.reduce((n, s) => n + s.videos.length, 0), 'vídeos');
// Las cifras del diccionario para la tarjeta de la portada, sin cargar el diccionario entero
const DICC = path.join(destino, 'diccionario.json');
const DIX = path.join(destino, 'diccionario-indices.json');
if (fs.existsSync(DICC)) { const D = JSON.parse(fs.readFileSync(DICC)); fs.writeFileSync(path.join(destino, 'diccionario-cifras.json'), JSON.stringify(cifrasDiccionario(D.fecha, D.lemas, fs.existsSync(DIX) ? JSON.parse(fs.readFileSync(DIX)) : null))); }
// Los signos de Cummins, para la transcripción de sus conversaciones
fs.writeFileSync(path.join(destino, 'signos.json'), JSON.stringify(leer('signos-cummins.json')));
// Las claves del formulario del diccionario, solo en resumen SHA-256 (las claves en claro no están en el repositorio)
fs.writeFileSync(path.join(destino, 'claves.json'), JSON.stringify(leer('claves.json')));
// Los apartados de los apuntes del alumnado, para la sección «El contenido del taller»
const AP = leer('apuntes/apartados.json');
// «Antes de empezar» no lleva página: su texto es la entradilla de «El contenido del taller» (Carlos, 19/10/2026)
const antes = AP.apartados.find(a => a.id === 'antes');
if (!antes) { console.error('apartados.json: falta «Antes de empezar», que da la entradilla'); process.exit(1); }
AP.entradilla = antes.bloques.filter(b => b.t === 'p').map(b => b.texto).join(' ');
AP.apartados = AP.apartados.filter(a => a !== antes);
// y al final, la bibliografía, del § 7 de los apuntes propios (fuente/apuntes/bibliografia.py)
AP.apartados.push(leer('apuntes/bibliografia.json'));
// y detrás, el anexo con los mapas históricos por orden de fechas (Carlos, 19/10/2026); cada mapa tiene que estar en img/mapas
const ANX = leer('apuntes/anexo.json');
for (const b of ANX.bloques.flatMap(b => b.t === 'galeria' ? b.mapas : b.t === 'mapa' ? [b] : [])) if (!fs.existsSync(path.join(aqui, '..', 'img', 'mapas', b.codigo + '.webp'))) { console.error('anexo.json: falta img/mapas/' + b.codigo + '.webp'); process.exit(1); }
AP.apartados.push(ANX);
fs.writeFileSync(path.join(destino, 'apuntes.json'), JSON.stringify(AP));
console.log('apuntes.json:', AP.apartados.length, 'apartados,', AP.apartados.flatMap(a => a.bloques).filter(b => b.t === 'mapa').length, 'mapas en el texto y', AP.apartados.flatMap(a => a.bloques).filter(b => b.t === 'galeria').reduce((n, b) => n + b.mapas.length, 0), 'en galería');
console.log('rasgos.json:', CAT.rasgos.length, 'rasgos,', CAT.rasgos.filter(r => r.mapa).length, 'con mapa,', (CAT.fuera || []).length, 'fuera del taller');

// ---------- las tres encuestas ----------
// Los puntos de cada red y las rayas del mapa de áreas léxicas de González Salgado 2001, con la misma proyección
const ENC = leer('encuestas.json');
const ISO = leer('isoglosas_GS2001.json');
const xy = ([lon, lat]) => { const q = proj([lon, lat]); return [+q[0].toFixed(3), +(-q[1]).toFixed(3)]; };
const enc = { kruger: {}, cummins: {}, gs: {}, nombres: {}, coinciden: [], desplazar: {}, isoglosas: [], letras: [] };
const kp = {};
for (const p of ENC.kruger) (kp[p.termino] ||= []).push(p);
for (const [code, ps] of Object.entries(kp)) enc.kruger[code] = {
  distancia: ps.every(p => p.distancia),
  texto: ps.map(p => `${p.nombre}, ${p.n ? (p.n.includes(' ') ? 'puntos ' : 'punto ') + p.n : 'sin número'}${p.distancia ? ', a distancia' : ''}`).join('; '),
  nombre: ps[0].nombre,
};
for (const p of ENC.cummins) enc.cummins[p.termino] = { nombre: p.nombre, informantes: p.informantes, distancia: !!p.distancia };
for (const p of ENC.gs) enc.gs[p.termino] = p.nombre;
const redes = [enc.kruger, enc.cummins, enc.gs];
const enRed = [...new Set(redes.flatMap(Object.keys))];
const faltanEnc = enRed.filter(c => !todos.has(c));
if (faltanEnc.length) { console.error('encuestas.json: códigos que no están en el mapa:', faltanEnc.join(' ')); process.exit(1); }
for (const c of enRed) enc.nombres[c] = (enc.cummins[c] && enc.cummins[c].nombre) || enc.gs[c] || enc.kruger[c].nombre;
enc.coinciden = enRed.filter(c => redes.filter(r => r[c]).length > 1);
enc.isoglosas = ISO.features.map(f => ({ linea: f.properties.linea, principal: ['vertical', 'horizontal'].includes(f.properties.linea), pts: f.geometry.coordinates.map(xy) }));
enc.desplazar = Object.fromEntries(Object.entries(ENC.desplazar || {}).filter(([k]) => k !== '_'));
enc.letras = ENC.letras.map(l => { const [x, y] = xy([l.lon, l.lat]); return { t: l.t, x, y }; });
// Áreas de González Salgado 2001 por términos: cada término extremeño va al área donde cae un punto de su interior
// (el centroide de su superficie), como en COMARCAS-Y-MUNICIPIOS.md, sección 7. Las rayas se prolongan por sus extremos.
const raya = l => enc.isoglosas.find(r => r.linea === l).pts;
const enX = (pts, x) => { const q = [...pts].sort((a, b) => a[0] - b[0]); if (x <= q[0][0]) return q[0][1]; if (x >= q[q.length - 1][0]) return q[q.length - 1][1]; for (let i = 0; i < q.length - 1; i++) if (x <= q[i + 1][0]) { const t = (x - q[i][0]) / (q[i + 1][0] - q[i][0]); return q[i][1] + t * (q[i + 1][1] - q[i][1]); } };
const enY = (pts, y) => { const q = [...pts].sort((a, b) => a[1] - b[1]); if (y <= q[0][1]) return q[0][0]; if (y >= q[q.length - 1][1]) return q[q.length - 1][0]; for (let i = 0; i < q.length - 1; i++) if (y <= q[i + 1][1]) { const t = (y - q[i][1]) / (q[i + 1][1] - q[i][1]); return q[i][0] + t * (q[i + 1][0] - q[i][0]); } };
const RV = raya('vertical'), RH = raya('horizontal'), RD = raya('D'), RE = raya('E'), RF = raya('F');
const yE = RE.map(p => p[1]), yEmin = Math.min(...yE), yEmax = Math.max(...yE);
enc.zonas = {};
enc.norte = [];   // términos al norte de la raya horizontal (la Alta Extremadura), también los de C
enc.cortados = []; // términos que corta alguna de las cinco rayas: quedan a los dos lados
const RAYAS = [RV, RH, RD, RE, RF];
const seCruzan = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };
const anillos = f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat().map(r => r.map(xy));
function cruza(f, raya) {
  for (const r of anillos(f)) for (let i = 0; i < r.length - 1; i++) for (let j = 0; j < raya.length - 1; j++) if (seCruzan(r[i], r[i + 1], raya[j], raya[j + 1])) return true;
  return false;
}
for (const f of munis) {
  if (!(f.id.startsWith('06') || f.id.startsWith('10'))) continue;
  const q = pathGen.centroid(f), x = q[0], y = -q[1];
  const oeste = x < enY(RV, y), norte = y > enX(RH, x);
  let z = oeste ? 'C' : norte ? 'A' : 'B';
  if (y > enX(RD, x)) z += '+D';
  if (!oeste && y >= yEmin && y <= yEmax && x > enY(RE, y)) z += '+E';
  if (y < enX(RF, x)) z += '+F';
  enc.zonas[f.id] = z;
  if (norte) enc.norte.push(f.id);
  if (RAYAS.some(r => cruza(f, r))) enc.cortados.push(f.id);
}
for (const [c, z] of Object.entries(ENC.zonas_corrige || {})) if (c !== '_') { enc.zonas[c] = z; if (z[0] === 'A' && !enc.norte.includes(c)) enc.norte.push(c); if (z[0] === 'B') enc.norte = enc.norte.filter(k => k !== c); }
fs.writeFileSync(path.join(destino, 'encuestas.json'), JSON.stringify(enc));
console.log('encuestas.json:', Object.keys(enc.kruger).length, 'términos de Krüger,', Object.keys(enc.cummins).length, 'de Cummins,', Object.keys(enc.gs).length, 'de González Salgado;', enc.coinciden.length, 'con dos o tres;', enc.isoglosas.length, 'rayas');

// ---------- las localidades del mapa de «Las palabras por lugares» (Carlos, 22/10/2026) ----------
// Las que no son cabeza de municipio, con el término de su municipio, al que suman sus voces; su punto tiene que caer dentro de él.
// Y los trece términos de Cummins, para el recuadro de «Coria y sus cercanías».
const LOC = leer('localidades.json');
const featDe = Object.fromEntries(munis.map(f => [f.id, f]));
const loc = { alias: Object.fromEntries(Object.entries(LOC.alias).filter(([k]) => k !== '_')), alquerias: [], cercanias: ENC.cummins.map(p => p.termino) };
for (const a of LOC.alquerias) {
  if (!featDe[a.termino]) { console.error('localidades.json: término desconocido', a.termino, a.nombre); process.exit(1); }
  if (!geoContains(featDe[a.termino], [a.lon, a.lat])) { console.error('localidades.json:', a.nombre, 'no cae en el término de', a.municipio); process.exit(1); }
  loc.alquerias.push({ nombre: a.nombre, municipio: a.municipio, termino: a.termino });
}
for (const c of Object.values(loc.alias)) if (!todos.has(c)) { console.error('localidades.json: alias a un término que no está en el mapa:', c); process.exit(1); }
fs.writeFileSync(path.join(destino, 'localidades.json'), JSON.stringify(loc));
// El minimapa de la tarjeta «Las palabras por lugares» (Carlos, 22/10/2026): las comarcas del área del taller y de contacto,
// y los términos sueltos de contacto (Garrovillas) con el nombre de su comarca, en trazos SVG simplificados, para colorearlos
// en la página con las voces de diccionario-cifras.json.
{
  const geomsDe = codes => es.objects.municipalities.geometries.filter(g => codes.includes(g.id));
  const pts = [];
  const partes = [
    ...area.nucleo.map(k => ({ nombre: COM[k].nombre, area: 'core', g: topo.merge(es, geomsDe(comarca(k))) })),
    ...area.contacto.map(k => ({ nombre: COM[k].nombre, area: 'contact', g: topo.merge(es, geomsDe(comarca(k))) })),
    ...area.contacto_terminos.split(' ').map(c => ({ nombre: COM[comarcaDe[c]].nombre, area: 'contact', g: topo.merge(es, geomsDe([c])) })),
  ];
  const anillos = g => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap(p => p);
  for (const p of partes) for (const r of anillos(p.g)) for (const c of r) pts.push(proj(c));
  const x0 = Math.min(...pts.map(q => q[0])), x1 = Math.max(...pts.map(q => q[0])), y0 = Math.min(...pts.map(q => q[1])), y1 = Math.max(...pts.map(q => q[1]));
  const k = 200 / Math.max(x1 - x0, y1 - y0), W = Math.round((x1 - x0) * k), H = Math.round((y1 - y0) * k);
  const dp = (q, tol) => { if (q.length < 4) return q; const keep = new Uint8Array(q.length); keep[0] = keep[q.length - 1] = 1; const st = [[0, q.length - 1]]; while (st.length) { const [a, b] = st.pop(); const [ax, ay] = q[a], [bx, by] = q[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); let m = 0, ix = -1; for (let i = a + 1; i < b; i++) { const d = L < 1e-6 ? Math.hypot(q[i][0] - ax, q[i][1] - ay) : Math.abs(dy * q[i][0] - dx * q[i][1] + bx * ay - by * ax) / L; if (d > m) { m = d; ix = i; } } if (m > tol && ix > 0) { keep[ix] = 1; st.push([a, ix], [ix, b]); } } return q.filter((_, i) => keep[i]); };
  const d = g => anillos(g).map(r => { const q = dp(r.map(c => { const p = proj(c); return [(p[0] - x0) * k, (p[1] - y0) * k]; }), 0.6); return q.length < 3 ? '' : 'M' + q.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join('L') + 'Z'; }).join('');
  const mini = { ancho: W, alto: H, comarcas: partes.map(p => ({ nombre: p.nombre, area: p.area, d: d(p.g) })) };
  fs.writeFileSync(path.join(destino, 'minimapa.json'), JSON.stringify(mini));
  console.log('minimapa.json:', mini.comarcas.length, 'piezas,', Math.round(JSON.stringify(mini).length / 1024), 'KB');
}
console.log('localidades.json:', loc.alquerias.length, 'localidades que no son municipio,', Object.keys(loc.alias).length, 'alias,', loc.cercanias.length, 'términos de Cummins');

// ---------- el mapa de la portada ----------
// España y Portugal, Extremadura y el área del taller, para la animación del título: se acerca de la Península a Extremadura
// y de Extremadura al noroeste, y se queda en claro detrás de las letras. Trazos en coordenadas de pantalla (y hacia abajo),
// en kilómetros, simplificados para que el fichero pese poco.
{
  const km = c => { const q = proj(c); return [q[0] * 10, q[1] * 10]; };
  // Douglas-Peucker sobre una línea ya proyectada; tol en km
  const simplifica = (pts, tol) => {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const pila = [[0, pts.length - 1]];
    while (pila.length) {
      const [a, b] = pila.pop(); const [ax, ay] = pts[a], [bx, by] = pts[b];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
      let max = 0, idx = -1;
      // en un anillo cerrado los dos extremos coinciden: se mide la distancia al punto
      for (let i = a + 1; i < b; i++) { const d = L < 1e-6 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > max) { max = d; idx = i; } }
      if (max > tol && idx > 0) { keep[idx] = 1; pila.push([a, idx], [idx, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  const r1 = v => Math.round(v * 10) / 10;
  const linea = (coords, tol, cerrar) => { const p = simplifica(coords.map(km), tol); if (p.length < 2) return ''; return 'M' + p.map(([x, y]) => r1(x) + ' ' + r1(y)).join('L') + (cerrar ? 'Z' : ''); };
  const trazo = (geom, tol) => {
    if (!geom) return '';
    const t = geom.type, c = geom.coordinates;
    if (t === 'LineString') return linea(c, tol);
    if (t === 'MultiLineString') return c.map(l => linea(l, tol)).join('');
    if (t === 'Polygon') return c.map(r => linea(r, tol, true)).join('');
    if (t === 'MultiPolygon') return c.flatMap(p => p.map(r => linea(r, tol, true))).join('');
    return '';
  };
  const fuera = new Set(['35', '38', '51', '52']);   // Canarias, Ceuta y Melilla no caben en el encuadre
  const pv = es.objects.provinces.geometries.filter(g => !fuera.has(g.id));
  const peninsula = { type: 'GeometryCollection', geometries: pv };
  const ccaa = es.objects.autonomous_regions.geometries.filter(g => !['05', '18', '19', '20'].includes(g.id));
  const munisEx = es.objects.municipalities.geometries.filter(g => /^(06|10)/.test(g.id) || salamanca.has(g.id));
  const deNucleo = es.objects.municipalities.geometries.filter(g => core.has(g.id));
  const deContacto = es.objects.municipalities.geometries.filter(g => contact.has(g.id));
  const encuadre = feats => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const f of feats) { const [[a, b], [c, d]] = pathGen.bounds(f); x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d); } return [r1(x0 * 10), r1(y0 * 10), r1((x1 - x0) * 10), r1((y1 - y0) * 10)]; };
  const fPen = topo.feature(es, peninsula).features.filter(f => !['07'].includes(f.id));   // el encuadre de España, sin las Baleares
  const fExt = topo.feature(es, { type: 'GeometryCollection', geometries: pv.filter(g => ['06', '10'].includes(g.id)) }).features;
  const fNuc = topo.feature(es, { type: 'GeometryCollection', geometries: deNucleo }).features;
  const coria = es.objects.municipalities.geometries.find(g => g.id === '10067');
  const P = {
    _: 'Lo escribe construir.mjs. Kilómetros en la proyección del reel, con la y hacia abajo.',
    portugal: trazo(portugal.geometry, 1.2),
    espana: trazo(topo.merge(es, pv.filter(g => g.id !== '54')), 1.2),
    ccaa: trazo(topo.mesh(es, { type: 'GeometryCollection', geometries: ccaa }, (a, b) => a !== b), 1.2),
    // solo las rayas de provincia que tocan a Cáceres, Badajoz o Salamanca, que son las que se ven al acercarse
    provincias: trazo(topo.mesh(es, peninsula, (a, b) => a !== b && ['06', '10', '37'].some(c => c === a.id || c === b.id)), 0.5),
    extremadura: trazo(topo.merge(es, pv.filter(g => ['06', '10'].includes(g.id))), 0.4),
    nucleo: trazo(topo.merge(es, deNucleo), 0.15),
    contacto: trazo(topo.merge(es, deContacto), 0.15),
    terminos: trazo(topo.mesh(es, { type: 'GeometryCollection', geometries: munisEx }, (a, b) => a !== b), 0.25),
    coria: (() => { const q = pathGen.centroid(topo.feature(es, coria)); return [r1(q[0] * 10), r1(q[1] * 10)]; })(),
    vistas: { espana: encuadre(fPen), extremadura: encuadre(fExt), area: encuadre(fNuc) },
  };
  fs.writeFileSync(path.join(destino, 'portada.json'), JSON.stringify(P));
  console.log('portada.json:', Math.round(JSON.stringify(P).length / 1024), 'KB');
}
