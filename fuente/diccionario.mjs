// Prepara el diccionario de la web desde el espejo de la hoja DICCIONARIO-NOROESTE.
// Uso: node diccionario.mjs <carpeta del espejo>   → ../datos/diccionario.json
// La entrada sigue la del diccionario impreso desde el 18/10/2026 (04-VOCABULARIO, «Entrada»), sin la línea
// de Observaciones y sin nada de lo marcado como dudoso: ni las marcas ++ ni los étimos con ++dudoso: étimo++
// ni las categorías con ++cat++ (Carlos, 18/10/2026).
// Siglas y referencias: de la pestaña FUENTES (versión 2 de la hoja). Si el espejo no la trae, de
// diccionario-siglas.json, y las que falten se forman con la regla de 05-DECISIONES (04/10/2026) y se avisan.
import fs from 'fs';
import path from 'path';

const aqui = path.dirname(new URL(import.meta.url).pathname);
const carpeta = process.argv[2];
if (!carpeta) { console.error('Uso: node diccionario.mjs <carpeta del espejo>'); process.exit(1); }
const avisos = [];

// ---------- lectura del espejo ----------
function csv(nombre, obligatorio = true) {
  const f = path.join(carpeta, 'DICCIONARIO-NOROESTE_' + nombre + '.csv');
  if (!fs.existsSync(f)) { if (obligatorio) { console.error('Falta ' + f); process.exit(1); } return null; }
  const s = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
  const filas = []; let fila = [], campo = '', comillas = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (comillas) {
      if (c === '"') { if (s[i + 1] === '"') { campo += '"'; i++; } else comillas = false; }
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  const cab = filas.shift();
  return filas.filter(f => f.some(x => x !== '')).map(f => Object.fromEntries(cab.map((k, i) => [k, f[i] ?? ''])));
}
const LEMAS = csv('LEMAS'), ACEP = csv('ACEPCIONES'), TEST = csv('TESTIMONIOS'), FUENTES = csv('FUENTES', false);
let fechaEspejo = '';
const fEsp = path.join(carpeta, 'DICCIONARIO-NOROESTE_ESPEJO.txt');
if (fs.existsSync(fEsp)) {
  const t = fs.readFileSync(fEsp, 'utf8');
  const m = t.match(/(\d{4})-(\d{2})-(\d{2})/) || t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) fechaEspejo = m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`;
  if (/muestra/i.test(t)) avisos.push('El espejo es una muestra, no el entero.');
}
const esMuestra = fs.existsSync(fEsp) && /muestra/i.test(fs.readFileSync(fEsp, 'utf8'));

// ---------- utilidades ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const limpia = s => String(s || '').replace(/\+\+[^+]*\+\+/g, '').replace(/\s+/g, ' ').trim();
const dudoso = (marcas, que) => String(marcas || '').includes('++dudoso: ' + que + '++');
const mayus = s => s ? s[0].toLocaleUpperCase('es') + s.slice(1) : s;
const punto = s => /[.!?…»]$/.test(s) ? s : s + '.';
const colEs = new Intl.Collator('es', { sensitivity: 'base' });
// Para buscar: minúsculas, sin tildes (salvo la ñ), sin la h volada, solo letras y espacios
const norm = s => String(s || '').toLowerCase().replace(/ʰ/g, 'h').replace(/ñ/g, '\u0001').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\u0001/g, 'ñ').replace(/[^a-zñ ]+/g, '').replace(/\s+/g, ' ').trim();
// Clave de variación regular (04-VOCABULARIO, «Variación regular»): -o/-u, -e/-i, -r/-l, -rse/-lsi, plurales
function clave(f) {
  let s = norm(String(f || '').replace(/\([^)]*\)/g, '').replace(/,\s*-a\b.*$/, ''));
  return s.split(' ').map(p => p
    .replace(/(r|l)(se|si)$/, 'RSE').replace(/(o|u)s$/, 'US').replace(/(e|i)s$/, 'IS')
    .replace(/(o|u)$/, 'U').replace(/(e|i)$/, 'I').replace(/(r|l)$/, 'R')).join(' ');
}
// Glosa del informante del taller cuando dice algo que su acepción no dice (Carlos, 19/10/2026): sale tras su sigla
const glosaInf = (t, glosaAc) => {
  if (!/^Informante\b/.test(t.fuente)) return '';
  const g = limpia(t['glosa de la fuente']).replace(/\.$/, '');
  return g && norm(g) !== norm(glosaAc[t['acepción']] || '') ? g : '';
};
const anio = s => { const m = String(s || '').match(/\b(1[89]\d\d|20\d\d)\b/); return m ? +m[1] : 9999; };

// ---------- siglas ----------
const SIG = new Map();
if (FUENTES) for (const f of FUENTES) SIG.set(f.fuente, { sigla: f.sigla, ref: f.referencia || f.fuente });
else {
  avisos.push('El espejo no trae FUENTES (hoja anterior a la versión 2): siglas de diccionario-siglas.json.');
  const prov = JSON.parse(fs.readFileSync(path.join(aqui, 'diccionario-siglas.json')));
  for (const [k, v] of Object.entries(prov.siglas)) SIG.set(k, v);
}
function sigla(fuente) {
  if (/^Informante\b/.test(fuente)) return 'INF [' + fuente.replace(/^Informante\s*/, '') + ']';
  if (SIG.has(fuente)) return SIG.get(fuente).sigla;
  const a = anio(fuente), s = fuente.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() + (a < 9999 ? ' ' + a : '');
  SIG.set(fuente, { sigla: s, ref: fuente, formada: true });
  avisos.push('Sigla formada por regla: ' + fuente + ' → ' + s);
  return s;
}
const usadas = new Set();

// ---------- lugares (04-VOCABULARIO, «Lugares») ----------
const SIN = 'Sin localizar';
function comarcaDe(t) { return t.comarca === 'Tierra de Coria (Cummins)' ? 'Valle del Alagón' : t.comarca; }
function localidadDe(t) {
  const l = (t.localidad || '').trim();
  if (!l || l === SIN || l === t.comarca || l === 'Hurdes' || l === 'Tierra de Coria (Cummins)') return '';
  return l;
}
function lugares(ts) {
  const com = new Map(), sueltas = new Set();
  for (const t of ts) {
    if (t.localidad === SIN || t.comarca === SIN || (!t.comarca && !t.localidad)) continue;
    const c = comarcaDe(t), l = localidadDe(t);
    if (!c) { if (l) sueltas.add(l); continue; }
    if (!com.has(c)) com.set(c, { locs: new Set(), sola: false });
    if (l) com.get(c).locs.add(l); else com.get(c).sola = true;
  }
  const out = [...sueltas];
  if (com.size === 1) {
    const [[c, v]] = [...com];
    if (v.sola || v.locs.size > 3) out.push(c); else out.push(...v.locs);
  } else for (const [c, v] of com) out.push(v.sola || v.locs.size >= 2 ? c : [...v.locs][0]);
  return out.sort(colEs.compare);
}

// ---------- página del original ----------
// Con la columna «página» (versión 2 de la hoja) va tal cual: «p. 40», «§ 239, p. 185». Sin ella, de las notas.
function pagina(t) {
  if (t['página'] !== undefined) return t['página'] ? String(t['página']) : '';
  const n = t.notas || '';
  if (/^\s*VÍA/i.test(n)) return '';
  const m = n.match(/\bp\. (\d+)/);
  return m ? 'p. ' + m[1] : '';
}

// ---------- entradas ----------
const acepDe = new Map(), testDe = new Map();
for (const a of ACEP) (acepDe.get(a.lema_id) || acepDe.set(a.lema_id, []).get(a.lema_id)).push(a);
for (const t of TEST) (testDe.get(t.lema_id) || testDe.set(t.lema_id, []).get(t.lema_id)).push(t);

// Véase: «changal (L01012) · …»; el lema se toma de LEMAS por su identificador, que manda sobre el texto
const lemaPorId = new Map(LEMAS.map(L => [L.lema_id, limpia(L.lema)]));
function veaseDe(L) {
  const out = [];
  for (const parte of String(L['véase'] || '').split('·').map(x => x.trim()).filter(Boolean)) {
    const id = (parte.match(/\bL\d{5}\b/) || [])[0];
    const lema = id ? lemaPorId.get(id) : limpia(parte.replace(/\(.*\)/, ''));
    if (!lema) { avisos.push('Véase a un lema que no existe: ' + L.lema_id + ' → ' + parte); continue; }
    if (!out.includes(lema)) out.push(lema);
  }
  return out;
}
// La dirección de una palabra, como enlaceVoz de index.html
const enlace = lema => '#voz/' + lema.replace(/%/g, '%25').replace(/ /g, '%20').replace(/#/g, '%23');

const entradas = [];
for (const L of LEMAS) {
  const lema = limpia(L.lema);
  if (!lema) continue;
  const ts = testDe.get(L.lema_id) || [];
  const as = (acepDe.get(L.lema_id) || []).slice().sort((x, y) => +x['acepción'] - +y['acepción']);
  if (!ts.length || !as.length) { avisos.push('Sin testimonios o sin acepciones: ' + L.lema_id + ' ' + lema); continue; }
  const kLema = clave(lema);
  const propios = ts.filter(t => clave(t.forma) === kLema);
  const varias = as.length > 1;
  const glosaAc = Object.fromEntries(as.map(a => [a['acepción'], limpia(a.glosa)]));

  const lug = lugares(propios.length ? propios : ts);
  const etimo = !dudoso(L.marcas, 'étimo') && limpia(L['étimo']) ? limpia(L['étimo']).replace(/^\[|\]$/g, '') : '';
  const catDe = a => (a.marcas || '').includes('++cat++') ? '' : limpia(a['categoría']);

  let h = `<p class="e-cab"><span class="e-lema">${esc(lema)}</span>`;
  if (!varias && catDe(as[0])) h += `. <i>${esc(catDe(as[0]))}</i>`;
  if (lug.length) h += ` (${esc(lug.join(', '))})`;
  if (etimo) h += ` [<i>${esc(etimo)}</i>]`;
  h += '.';
  if (!varias) h += ` <b>${esc(punto(mayus(limpia(as[0].glosa))))}</b>`;
  else for (const a of as) h += ` <b>${esc(a['acepción'])}.</b> ${catDe(a) ? `<i>${esc(catDe(a))}</i> ` : ''}<b>${esc(punto(mayus(limpia(a.glosa))))}</b>`;
  h += '</p>';

  if (propios.length) {
    const vistos = new Set(), partes = [];
    for (const t of propios.slice().sort((x, y) => anio(x['fecha del dato']) - anio(y['fecha del dato']))) {
      const s = sigla(t.fuente); usadas.add(t.fuente);
      const inf = /^Informante\b/.test(t.fuente);
      const p = inf ? '' : pagina(t);
      const gi = glosaInf(t, glosaAc);
      const txt = esc(s + (p ? ', ' + p : '') + (varias ? ', ac. ' + t['acepción'] : '')) + (gi ? `, <span class="e-gi">‘${esc(gi)}’</span>` : '');
      if (!vistos.has(txt)) { vistos.add(txt); partes.push(txt); }
    }
    h += `<p class="e-lin"><span class="e-et">Fuentes:</span> ${partes.join('; ')}.</p>`;
  }
  const otras = new Map();
  for (const t of ts) { const k = clave(t.forma); if (k !== kLema && t.forma) (otras.get(k) || otras.set(k, []).get(k)).push(t); }
  if (otras.size) {
    const vs = [...otras.values()].map(g => {
      const cuenta = {}; for (const t of g) cuenta[t.forma] = (cuenta[t.forma] || 0) + 1;
      const forma = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0][0];
      // Con varias acepciones, cada sigla lleva la suya, como en Fuentes (19/10/2026)
      const sig = [...new Set(g.map(t => { usadas.add(t.fuente); const gi = glosaInf(t, glosaAc); return esc(sigla(t.fuente) + (varias ? ', ac. ' + t['acepción'] : '')) + (gi ? `, <span class="e-gi">‘${esc(gi)}’</span>` : ''); }))];
      const lg = lugares(g);
      return { forma, txt: `<i>${esc(limpia(forma))}</i> (${[esc(lg.join(', ')), sig.join(', ')].filter(Boolean).join('; ')})` };
    }).sort((a, b) => colEs.compare(a.forma, b.forma));
    h += `<p class="e-lin"><span class="e-et">Variantes:</span> ${vs.map(v => v.txt).join('; ')}.</p>`;
  }
  // Véase: lemas distintos que conviene leer juntos (04-VOCABULARIO), con enlace a su ficha (19/10/2026)
  const vease = veaseDe(L);
  if (vease.length) h += `<p class="e-lin"><span class="e-et">Véase:</span> ${vease.map(v => `<a class="e-vease" href="${esc(enlace(v))}"><i>${esc(v)}</i></a>`).join(', ')}.</p>`;

  const formas = [...new Set([lema, ...ts.map(t => t.forma)].map(norm).filter(Boolean))];
  const glosas = norm(as.map(a => limpia(a.glosa)).join(' '));
  entradas.push({ id: L.lema_id, lema, h, f: formas, k: [...new Set(formas.map(clave))], g: glosas, g1: limpia(as[0].glosa), ts });
}

// Orden por el texto del lema (04-VOCABULARIO, «Orden»)
const claveOrden = s => s.replace(/^[^\p{L}]+/u, '').toLowerCase().replace(/ñ/g, 'n￿').normalize('NFD').replace(/[̀-ͯ]/g, '');
entradas.sort((a, b) => claveOrden(a.lema) < claveOrden(b.lema) ? -1 : claveOrden(a.lema) > claveOrden(b.lema) ? 1 : 0);

// ---------- las palabras del taller ----------
const nuevas = [], confirma = [];
for (const e of entradas) {
  const inf = e.ts.filter(t => /^Informante\b/.test(t.fuente));
  if (!inf.length) continue;
  const resto = e.ts.filter(t => !/^Informante\b/.test(t.fuente));
  // La glosa que dio el informante; si no la dio, la de su acepción (Carlos, 19/10/2026)
  const glosa = limpia(inf[0]['glosa de la fuente']) || limpia((acepDe.get(e.id) || []).find(a => a['acepción'] === inf[0]['acepción'])?.glosa || '');
  const base = { id: e.id, lema: e.lema, glosa, lugar: [...new Set(inf.map(t => localidadDe(t) || comarcaDe(t)).filter(Boolean))].join(', '), inf: [...new Set(inf.map(t => sigla(t.fuente)))].join(', '), orden: inf.map(t => t.id).sort().pop() };
  if (!resto.length) nuevas.push(base);
  else {
    const prim = resto.slice().sort((x, y) => anio(x['fecha del dato']) - anio(y['fecha del dato']))[0];
    const a = anio(prim['fecha del dato']);
    confirma.push({ ...base, antes: { sigla: sigla(prim.fuente), anio: a < 9999 ? a : '', lugar: localidadDe(prim) || comarcaDe(prim) || '' } });
  }
}
for (const l of [nuevas, confirma]) l.sort((a, b) => a.orden < b.orden ? 1 : -1);

// ---------- fuentes y abreviaturas de lo publicado ----------
const fuentes = [...usadas].filter(f => !/^Informante\b/.test(f)).map(f => ({ sigla: sigla(f), ref: SIG.get(f)?.ref || f }))
  .filter((v, i, a) => a.findIndex(x => x.sigla === v.sigla) === i).sort((a, b) => colEs.compare(a.sigla, b.sigla));
if ([...usadas].some(f => /^Informante\b/.test(f))) fuentes.push({ sigla: 'INF [A00]', ref: 'Informante del taller, con su código, curso 2026-2027.' });
const CATS = JSON.parse(fs.readFileSync(path.join(aqui, 'diccionario-abreviaturas.json')));
const tokens = new Set(); for (const a of ACEP) for (const p of limpia(a['categoría']).split(/\s+/)) tokens.add(p);
const hayInf = [...usadas].some(f => /^Informante\b/.test(f));
const abreviaturas = Object.entries(CATS.entradas).filter(([k]) => (k.startsWith('·') && (hayInf || !k.includes('INF'))) || tokens.has(k)).map(([k, v]) => ({ a: k.replace(/^·/, ''), v }));

const salida = {
  fecha: fechaEspejo, muestra: esMuestra, lemas: entradas.length,
  // Cada entrada: [id, lema, html de la tarjeta, formas para buscar, claves de variación, glosas para buscar, primera glosa, número de testimonios]
  e: entradas.map(e => [e.id, e.lema, e.h, e.f.join('|'), e.k.join('|'), e.g, e.g1, e.ts.length]),
  fuentes, abreviaturas, taller: { nuevas, confirma }
};
fs.writeFileSync(path.resolve(aqui, '../datos/diccionario.json'), JSON.stringify(salida));
fs.writeFileSync(path.resolve(aqui, '../datos/diccionario-cifras.json'), JSON.stringify({ fecha: salida.fecha, lemas: salida.lemas }));
console.log('diccionario.json:', entradas.length, 'lemas;', nuevas.length, 'nuevas y', confirma.length, 'confirmadas por el taller;', fuentes.length, 'fuentes');
for (const a of new Set(avisos)) console.log('  aviso:', a);
