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
// Los signos de Cummins, para la transcripción de sus conversaciones
fs.writeFileSync(path.join(destino, 'signos.json'), JSON.stringify(leer('signos-cummins.json')));
// Los apartados de los apuntes del alumnado, para la sección «El contenido del taller»
const AP = leer('apuntes/apartados.json');
fs.writeFileSync(path.join(destino, 'apuntes.json'), JSON.stringify(AP));
console.log('apuntes.json:', AP.apartados.length, 'apartados,', AP.apartados.flatMap(a => a.bloques).filter(b => b.t === 'mapa').length, 'mapas');
console.log('rasgos.json:', CAT.rasgos.length, 'rasgos,', CAT.rasgos.filter(r => r.mapa).length, 'con mapa');
