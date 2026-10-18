// Prepara los datos de la web: la geometría común y la clasificación de cada rasgo.
// Uso: node construir.mjs            → ../datos/base.json, ../datos/rasgos.json y ../datos/rasgos/<código>.json
// Sale del motor del generador de reels (reel-rasgo.zip, construir-datos.mjs): misma proyección, mismas clases.
import fs from 'fs';
import path from 'path';
import * as topo from 'topojson-client';
import { geoConicConformal, geoPath } from 'd3-geo';

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
fs.writeFileSync(path.join(destino, 'textos.json'), JSON.stringify(TX));
console.log('textos.json:', TX.length, 'textos');
// Las páginas «Sobre el autor» de los textos: cada texto que nombran tiene que existir
const AU = leer('autores.json');
for (const a of AU.autores) for (const c of a.textos) if (!TX.some(t => t.codigo === c)) { console.error('autores.json:', a.id, 'nombra un texto que no está:', c); process.exit(1); }
fs.writeFileSync(path.join(destino, 'autores.json'), JSON.stringify(AU));
console.log('autores.json:', AU.autores.length, 'páginas de autor');
// Los signos de Cummins, para la transcripción de sus conversaciones
fs.writeFileSync(path.join(destino, 'signos.json'), JSON.stringify(leer('signos-cummins.json')));
// Las claves del formulario del diccionario, solo en resumen SHA-256 (las claves en claro no están en el repositorio)
fs.writeFileSync(path.join(destino, 'claves.json'), JSON.stringify(leer('claves.json')));
// Los apartados de los apuntes del alumnado, para la sección «El contenido del taller»
const AP = leer('apuntes/apartados.json');
// y al final, la bibliografía, del § 7 de los apuntes propios (fuente/apuntes/bibliografia.py)
AP.apartados.push(leer('apuntes/bibliografia.json'));
fs.writeFileSync(path.join(destino, 'apuntes.json'), JSON.stringify(AP));
console.log('apuntes.json:', AP.apartados.length, 'apartados,', AP.apartados.flatMap(a => a.bloques).filter(b => b.t === 'mapa').length, 'mapas');
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
for (const f of munis) {
  if (!(f.id.startsWith('06') || f.id.startsWith('10'))) continue;
  const q = pathGen.centroid(f), x = q[0], y = -q[1];
  const oeste = x < enY(RV, y), norte = y > enX(RH, x);
  let z = oeste ? 'C' : norte ? 'A' : 'B';
  if (y > enX(RD, x)) z += '+D';
  if (!oeste && y >= yEmin && y <= yEmax && x > enY(RE, y)) z += '+E';
  if (y < enX(RF, x)) z += '+F';
  enc.zonas[f.id] = z;
}
for (const [c, z] of Object.entries(ENC.zonas_corrige || {})) if (c !== '_') enc.zonas[c] = z;
fs.writeFileSync(path.join(destino, 'encuestas.json'), JSON.stringify(enc));
console.log('encuestas.json:', Object.keys(enc.kruger).length, 'términos de Krüger,', Object.keys(enc.cummins).length, 'de Cummins,', Object.keys(enc.gs).length, 'de González Salgado;', enc.coinciden.length, 'con dos o tres;', enc.isoglosas.length, 'rayas');

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
