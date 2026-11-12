// Prepara el diccionario de la web desde el espejo de la hoja DICCIONARIO-NOROESTE.
// Uso: node diccionario.mjs <carpeta del espejo>   → ../datos/diccionario.json
//      node diccionario.mjs <carpeta del espejo> --entradas <fichero>   → los datos de cada entrada para el PDF, sin tocar datos/
// Desde el 12/11/2026 las reglas de la entrada viven solo aquí, para la web y para el papel (ver «la entrada, como datos»).
// La entrada sigue la del diccionario impreso desde el 18/10/2026 (04-VOCABULARIO, «Entrada»), sin la línea
// de Observaciones y sin las marcas ++ ni las categorías con ++cat++ (Carlos, 18/10/2026). Los étimos con
// ++dudoso: étimo++ salen desde el 20/10/2026, sin la marca, que se queda para el PDF de corrección (Carlos).
// Siglas y referencias: de la pestaña FUENTES (versión 2 de la hoja). Si el espejo no la trae, de
// diccionario-siglas.json, y las que falten se forman con la regla de 05-DECISIONES (04/10/2026) y se avisan.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cifrasDiccionario } from './cifras-diccionario.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const carpeta = process.argv[2];
if (!carpeta) { console.error('Uso: node diccionario.mjs <carpeta del espejo> [--entradas <fichero>]'); process.exit(1); }
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
  // Sin el artículo inicial: la glosa de la acepción va sin él (Carlos, 22/10/2026)
  const sinArt = x => norm(x).replace(/^(el|la|los|las|un|una) /, '');
  return g && sinArt(g) !== sinArt(glosaAc[t['acepción']] || '') ? g : '';
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
// La fala, contraste: sus testimonios van en «En la fala» y no cuentan para lugares ni variantes (Carlos, 20/10/2026)
const FALA = 'Val de Xálima';
const esFala = t => t.comarca === FALA;
// Lo de Cummins sin pueblo, «Coria y sus cercanías», como en «Por lugares»: Cummins recogió también en Moraleja,
// de Sierra de Gata, y no encaja en el Valle del Alagón (Carlos, 22/10/2026)
function comarcaDe(t) { return t.comarca === 'Tierra de Coria (Cummins)' ? 'Coria y sus cercanías' : t.comarca; }
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

// ---------- la entrada, como datos ----------
// Las reglas de la entrada viven solo aquí, para la web y para el papel (Carlos, 12/11/2026): componer() da los datos
// de cada lema y htmlWeb() los maqueta para la web. El PDF (estremenu-base, herramientas/diccionario-pdf) los lee
// de `--entradas <fichero>` y solo los maqueta, y lo mismo podría hacer Typst.
// Variantes antes que Fuentes, cada variante con su letra; cada obra una sola vez, con sus páginas, y en cada página
// las marcas de lo que da: número de la acepción y letra de la variante, «2c»; sin letra, la forma del lema; con una
// sola acepción, sin número (Carlos, 12/11/2026, sobre la propuesta de datos/diccionario/trabajo/fuentes-en-la-entrada-2026-11-12).
const LETRAS = 'abcdefghijklmnopqrstuvwxyz';
const letraN = i => i < 26 ? LETRAS[i] : LETRAS[Math.floor(i / 26) - 1] + LETRAS[i % 26];
// Formas que cuentan como la del lema: sin «, -a», con y sin lo que va entre paréntesis, y el femenino de «X, -a»
function clavesLema(lema) {
  const b = lema.replace(/,\s*-a\b.*$/, '').trim();
  const fs_ = new Set([b, b.replace(/\s*\([^)]*\)/g, '').trim(), b.replace(/[()]/g, '')]);
  if (/,\s*-a\b/.test(lema)) for (const f of [...fs_]) fs_.add(f.replace(/[ou]$/, 'a'));
  return new Set([...fs_].filter(Boolean).map(clave));
}
// La voz de un testimonio. En una acepción que es locución, de un lema de una palabra, la forma de la fuente es la
// locución entera (*jincal el porru*): cuenta como la forma del lema si alguna de sus palabras lo es, y si no, como
// la variante que da otro testimonio en una palabra sola (*ajincal rodilla*, de *ajincal*). Así la locución no sale como
// variante. Si ninguna palabra es la del lema ni la de una variante, es otra locución y va entera (*comer a barranco*).
function vozDe(t, kL, lemaUna, acCat, sueltas) {
  const f = limpia(t.forma);
  if (!f || kL.has(clave(f))) return { k: null, forma: f };
  if (lemaUna && /^loc\./.test(acCat[t['acepción']] || '') && /[\s,]/.test(f)) {
    const pal = f.replace(/\([^)]*\)/g, ' ').split(/[\s,]+/).filter(Boolean);
    if (pal.some(p => kL.has(clave(p)))) return { k: null, forma: f };
    const p = pal.find(x => sueltas.has(clave(x)));
    if (p) return { k: clave(p), forma: p };
  }
  return { k: clave(f), forma: f };
}
const marcasDe = s => String(s || '').match(/\+\+[^+]+\+\+/g) || [];
const ordenT = (x, y) => anio(x['fecha del dato']) - anio(y['fecha del dato']) || (x.fuente < y.fuente ? -1 : x.fuente > y.fuente ? 1 : 0);
const avisosPdf = [];

function componer(L) {
  const lema = limpia(L.lema);
  const todos = testDe.get(L.lema_id) || [];
  const ts = todos.filter(t => !esFala(t)), fala = todos.filter(esFala);
  const as = (acepDe.get(L.lema_id) || []).slice().sort((x, y) => +x['acepción'] - +y['acepción']);
  if (!lema || !as.length) return null;
  const id = L.lema_id, varias = as.length > 1;
  const glosaAc = Object.fromEntries(as.map(a => [a['acepción'], limpia(a.glosa)]));
  const acCat = Object.fromEntries(as.map(a => [a['acepción'], limpia(a['categoría'])]));
  const kL = clavesLema(lema);
  const lemaUna = !/\s/.test(lema.replace(/\([^)]*\)/g, '').replace(/,\s*-a\b.*$/, '').trim());
  const sueltas = new Set(ts.map(t => limpia(t.forma)).filter(f => f && !/[\s,]/.test(f)).map(clave));
  const voz = new Map(ts.map(t => [t, vozDe(t, kL, lemaUna, acCat, sueltas)]));
  const propios = ts.filter(t => voz.get(t).k === null);

  // Variantes, por orden alfabético, cada una con su letra y con la forma que más dan las fuentes
  const grupos = new Map();
  for (const t of ts) { const v = voz.get(t); if (v.k !== null) (grupos.get(v.k) || grupos.set(v.k, []).get(v.k)).push(t); }
  const variantes = [...grupos.entries()].map(([k, g]) => {
    const cuenta = new Map(); for (const t of g) { const f = voz.get(t).forma; cuenta.set(f, (cuenta.get(f) || 0) + 1); }
    return { k, forma: [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0][0], ts: g };
  }).sort((a, b) => colEs.compare(a.forma, b.forma));
  variantes.forEach((v, i) => { v.letra = letraN(i); v.lugares = lugares(v.ts); });
  const letraDe = new Map(variantes.map(v => [v.k, v.letra]));
  const lug = lugares(propios.length ? propios : ts);

  // Fuentes: cada obra una vez, por la fecha del dato; sus páginas, y en cada página las marcas de lo que da
  const codigo = t => (varias ? t['acepción'] : '') + (voz.get(t).k === null ? '' : letraDe.get(voz.get(t).k));
  const porSigla = new Map();
  for (const t of ts.slice().sort(ordenT)) {
    usadas.add(t.fuente);
    const s = sigla(t.fuente), p = /^Informante\b/.test(t.fuente) ? '' : pagina(t);
    const pags = porSigla.get(s) || porSigla.set(s, new Map()).get(s);
    const m = pags.get(p) || pags.set(p, new Map()).get(p);
    const c = codigo(t), gi = glosaInf(t, glosaAc), key = c + '|' + gi;
    (m.get(key) || m.set(key, { c, gi, ts: [] }).get(key)).ts.push(t);
  }
  // Lo que da cada voz, para saber si sus lugares se reparten entre varias obras
  const vozDeCod = c => c.replace(/^\d+/, '');
  const siglasVoz = new Map();
  for (const [s, pags] of porSigla) for (const m of pags.values()) for (const x of m.values()) {
    const v = vozDeCod(x.c); (siglasVoz.get(v) || siglasVoz.set(v, new Set()).get(v)).add(s);
  }
  const lugVoz = v => v === '' ? lug : (variantes.find(x => x.letra === v) || {}).lugares || [];
  const ordenCod = (a, b) => (parseInt(a.c) || 0) - (parseInt(b.c) || 0) || (a.c < b.c ? -1 : a.c > b.c ? 1 : 0);
  const ordenPag = (a, b) => a[0] === '' ? 1 : b[0] === '' ? -1 : a[0].localeCompare(b[0], 'es', { numeric: true });
  const fuentes = [...porSigla.entries()].map(([s, pags]) => ({
    sigla: s,
    paginas: [...pags.entries()].sort(ordenPag).map(([p, m]) => ({
      p, marcas: [...m.values()].sort(ordenCod).map(x => {
        const v = vozDeCod(x.c);
        // ambiguo: la voz sale en más de un lugar y la dan varias obras, así que sus lugares no dicen de qué obra es cada uno
        return { c: x.c, gi: x.gi, lugares: lugares(x.ts), ambiguo: lugVoz(v).length > 1 && (siglasVoz.get(v) || new Set()).size > 1 };
      })
    }))
  }));

  // En la fala: formas de contraste, con su glosa, su pueblo y su fuente (Carlos, 20/10/2026)
  const porForma = new Map();
  for (const t of fala) (porForma.get(t.forma) || porForma.set(t.forma, []).get(t.forma)).push(t);
  const falaD = [...porForma.entries()].sort((a, b) => colEs.compare(a[0], b[0])).map(([forma, g]) => ({
    forma: limpia(forma), glosa: limpia(g[0]['glosa de la fuente']).replace(/\.$/, ''),
    lugares: [...new Set(g.map(t => localidadDe(t)).filter(Boolean))].sort(colEs.compare),
    fuentes: [...new Set(g.slice().sort(ordenT).map(t => { usadas.add(t.fuente); const p = pagina(t); return sigla(t.fuente) + (p ? ', ' + p : ''); }))]
  }));

  // Observaciones, solo para el PDF de corrección: las marcas ++ del lema, de las acepciones y de los testimonios
  const obs = [...marcasDe(L.marcas), ...as.flatMap(a => marcasDe(a.marcas).map(m => m + (varias ? ' (ac. ' + a['acepción'] + ')' : ''))),
    ...todos.flatMap(t => marcasDe(t.marcas).map(m => m + ' (' + t.id + ')'))];
  if (limpia(L['¿variante de?'])) obs.push('¿variante de ' + limpia(L['¿variante de?']) + '?');

  // Avisos del PDF
  if (fala.length && !ts.length) avisosPdf.push('lema solo con testimonios de la fala: ' + lema + ' (' + id + ')');
  if (!propios.length) avisosPdf.push('sin testimonio con la forma del lema: ' + lema + ' (' + id + ')');
  const col = new Set(String(L.variantes || '').split('·').map(x => x.trim()).filter(Boolean).map(clave));
  const ks = new Set(variantes.map(v => v.k));
  if (col.size !== ks.size || [...col].some(k => !ks.has(k)))
    avisosPdf.push('la columna variantes no coincide con las formas: ' + lema + ' (' + id + '): columna «' + (L.variantes || '') + '»; formas «' + variantes.map(v => v.forma).join(' · ') + '»');
  const gl = as.map(a => norm(a.glosa));
  if (new Set(gl).size !== gl.length) avisosPdf.push('dos acepciones con la misma glosa: ' + lema + ' (' + id + ')');

  return {
    id, lema, lugares: lug, etimo: limpia(L['étimo']).replace(/^\[|\]$/g, ''),
    acepciones: as.map(a => ({ n: a['acepción'], cat: limpia(a['categoría']), catDudosa: (a.marcas || '').includes('++cat++'), glosa: limpia(a.glosa), uso: limpia(a.marcas) })),
    variantes: variantes.map(v => ({ letra: v.letra, forma: limpia(v.forma), lugares: v.lugares })),
    fuentes, fala: falaD, vease: veaseDe(L), obs,
    _ts: todos, _sinArea: !ts.length
  };
}

// Las marcas de una página: «1c, 2a», con la glosa del informante tras la suya. Con lugar, si se pide, cuando la voz
// se reparte entre varias obras y varios lugares, tras el último de las marcas seguidas que lo comparten: «2, 3, 4 (El Rebollar), 5 (El Payo)»
function marcasTxt(ms, conLugar, esc_, gi_) {
  const lugarDe = m => conLugar && m.ambiguo && m.lugares.length ? m.lugares.join(', ') : '';
  const vis = ms.filter(m => m.c || m.gi || lugarDe(m));
  return vis.map((m, i) => {
    const l = lugarDe(m), sigue = m.c && vis[i + 1] && lugarDe(vis[i + 1]) === l && !vis[i + 1].gi && !m.gi;
    return [esc_(m.c), m.gi ? gi_(m.gi) : '', l && !sigue ? '(' + esc_(l) + ')' : ''].filter(Boolean).join(' ');
  }).join(', ');
}
// Una obra en Fuentes: «VIU 1980 p. 119: 2c; p. 120: 1, 2», «DTO 2009: 2c», «INF [A06]: 1 ‘harto de comida’»
const sepMarcas = mt => mt.startsWith('(') ? ' ' : ': ';
function fuenteTxt(f, conLugar, esc_, gi_) {
  const pags = f.paginas.map(pg => ({ p: pg.p, mt: marcasTxt(pg.marcas, conLugar, esc_, gi_) }));
  if (pags.length === 1 && !pags[0].p) return esc_(f.sigla) + (pags[0].mt ? sepMarcas(pags[0].mt) + pags[0].mt : '');
  return esc_(f.sigla) + ' ' + pags.map(({ p, mt }) => { const pp = p || (mt ? 's. p.' : ''); return pp && mt ? esc_(pp) + sepMarcas(mt) + mt : pp ? esc_(pp) : mt; }).filter(Boolean).join('; ');
}

function htmlWeb(E) {
  const varias = E.acepciones.length > 1;
  const cat = a => a.catDudosa ? '' : a.cat;
  const conUso = a => a.uso ? ` ${esc(punto(a.uso))}` : '';
  let h = `<p class="e-cab"><span class="e-lema">${esc(E.lema)}</span>`;
  if (!varias && cat(E.acepciones[0])) h += `. <i>${esc(cat(E.acepciones[0]))}</i>`;
  if (E.lugares.length) h += ` (${esc(E.lugares.join(', '))})`;
  if (E.etimo) h += ` [<i>${esc(E.etimo)}</i>]`;
  h += '.';
  if (!varias) h += ` <b>${esc(punto(mayus(E.acepciones[0].glosa)))}</b>${conUso(E.acepciones[0])}`;
  else for (const a of E.acepciones) h += ` <b>${esc(a.n)}.</b> ${cat(a) ? `<i>${esc(cat(a))}</i> ` : ''}<b>${esc(punto(mayus(a.glosa)))}</b>${conUso(a)}`;
  h += '</p>';
  const lin = (et, txt) => `<p class="e-lin"><span class="e-et">${et}:</span> ${txt}.</p>`;
  if (E.variantes.length) h += lin(E.variantes.length > 1 ? 'Variantes' : 'Variante', E.variantes.map(v => `<b>${esc(v.letra)}.</b> <i>${esc(v.forma)}</i>${v.lugares.length ? ` (${esc(v.lugares.join(', '))})` : ''}`).join('; '));
  const gi = g => `<span class="e-gi">‘${esc(g)}’</span>`;
  if (E.fuentes.length) h += lin(E.fuentes.length > 1 ? 'Fuentes' : 'Fuente', E.fuentes.map(f => fuenteTxt(f, LUGAR_EN_FUENTES, esc, gi)).join(' · '));
  if (E.fala.length) h += lin('En la fala', E.fala.map(x => `<i>${esc(x.forma)}</i>${x.glosa ? ` ‘${esc(x.glosa)}’` : ''} (${[esc(x.lugares.join(', ')), esc(x.fuentes.join('; '))].filter(Boolean).join('; ')})`).join('; '));
  // Véase: lemas distintos que conviene leer juntos (04-VOCABULARIO), con enlace a su ficha (19/10/2026)
  if (E.vease.length) h += lin('Véase', E.vease.map(v => `<a class="e-vease" href="${esc(enlace(v))}"><i>${esc(v)}</i></a>`).join(', '));
  return h;
}
// El lugar de cada obra en Fuentes, cuando la voz se reparte entre varias obras y varios lugares: a decisión de Carlos
// (punto 4 de la propuesta del 12/11/2026). Apagado mientras no lo decida.
const LUGAR_EN_FUENTES = process.env.LUGAR_EN_FUENTES === '1';

const entradas = [], datosPdf = [];
for (const L of LEMAS) {
  const E = componer(L);
  if (!E) { if (limpia(L.lema)) avisos.push('Sin testimonios del área o sin acepciones: ' + L.lema_id + ' ' + limpia(L.lema)); continue; }
  const { _ts: todos, _sinArea, ...datos } = E;
  datosPdf.push(datos);
  if (_sinArea) { avisos.push('Sin testimonios del área o sin acepciones: ' + L.lema_id + ' ' + E.lema); continue; }
  const formas = [...new Set([E.lema, ...todos.map(t => t.forma)].map(norm).filter(Boolean))];
  const glosas = norm(E.acepciones.map(a => a.glosa).join(' '));
  entradas.push({ id: E.id, lema: E.lema, h: htmlWeb(E), f: formas, k: [...new Set(formas.map(clave))], g: glosas, g1: E.acepciones[0].glosa, ts: todos });
}
// Para el PDF: los datos de cada entrada, sin maquetar, y sus avisos. No toca nada de datos/.
const iEnt = process.argv.indexOf('--entradas');
if (iEnt > 0) {
  const destino = path.resolve(process.argv[iEnt + 1]);
  fs.writeFileSync(destino, JSON.stringify({ fecha: fechaEspejo, entradas: datosPdf, avisos: avisosPdf }));
  console.log('entradas para el PDF:', datosPdf.length, 'lemas,', avisosPdf.length, 'avisos →', destino);
  process.exit(0);
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

// ---------- las palabras por lugares y por fuentes (Carlos, 21/10/2026) ----------
// Página aparte, con su propio fichero, datos/diccionario-indices.json, para no cargar el buscador.
// Por lugares: cada comarca con todos sus testimonios —también los que no dicen pueblo— y cada pueblo con los suyos.
// «Tierra de Coria (Cummins)» va aparte, como «Coria y sus cercanías»: no encaja en una comarca, porque Cummins
// recogió también en Moraleja, de Sierra de Gata. La localidad sin comarca va en «Otros lugares». Fuera la fala
// y lo sin localizar, que solo sale por fuentes. Cada voz: [lema_id, forma si no es la del lema, siglas o lugares].
const CERCANIAS = 'Coria y sus cercanías';
const entPorId = new Map(entradas.map(e => [e.id, e]));
const grupoDe = t => t.comarca === 'Tierra de Coria (Cummins)' ? CERCANIAS : t.comarca || 'Otros lugares';
const ordenSiglas = ts => [...new Set(ts.slice().sort((x, y) => anio(x['fecha del dato']) - anio(y['fecha del dato'])).map(t => sigla(t.fuente)))];
function vocesDe(ts, dato) {
  const g = new Map();
  for (const t of ts) {
    const e = entPorId.get(t.lema_id); if (!e) continue;
    const forma = clave(t.forma) === clave(e.lema) ? '' : limpia(t.forma);
    const k = t.lema_id + '|' + clave(forma);
    if (!g.has(k)) g.set(k, { id: t.lema_id, lema: e.lema, forma, ts: [] });
    g.get(k).ts.push(t);
  }
  return [...g.values()].sort((a, b) => colEs.compare(a.forma || a.lema, b.forma || b.lema)).map(v => [v.id, v.forma, dato(v.ts)]);
}
const todosTs = entradas.flatMap(e => e.ts.filter(t => !esFala(t)).map(t => ({ ...t, lema_id: e.id })));
const localizados = todosTs.filter(t => !(t.localidad === SIN || t.comarca === SIN || (!t.comarca && !t.localidad)));
const porGrupo = new Map();
for (const t of localizados) {
  const c = grupoDe(t), l = localidadDe(t);
  if (!porGrupo.has(c)) porGrupo.set(c, { ts: [], pueblos: new Map() });
  const G = porGrupo.get(c); G.ts.push(t);
  if (l && c !== CERCANIAS) (G.pueblos.get(l) || G.pueblos.set(l, []).get(l)).push(t);
}
const vocesLugar = ts => vocesDe(ts, ordenSiglas);
const lugaresIdx = [...porGrupo.entries()].sort((a, b) => a[0] === 'Otros lugares' ? 1 : b[0] === 'Otros lugares' ? -1 : colEs.compare(a[0], b[0])).map(([c, G]) => ({
  nombre: c, tipo: c === CERCANIAS ? 'cercanias' : c === 'Otros lugares' ? 'otros' : 'comarca',
  voces: c === 'Otros lugares' ? [] : vocesLugar(G.ts),
  pueblos: [...G.pueblos.entries()].sort((a, b) => colEs.compare(a[0], b[0])).map(([l, ts]) => ({ nombre: l, voces: vocesLugar(ts) }))
}));
// Por fuentes: cada obra con sus voces y, en cada voz, los lugares como en la ficha. Los informantes del taller
// no se listan aquí: llevan a «Las palabras del taller», que ya las reúne.
const porFuente = new Map();
for (const t of todosTs) if (!/^Informante\b/.test(t.fuente)) (porFuente.get(t.fuente) || porFuente.set(t.fuente, []).get(t.fuente)).push(t);
const fuentesIdx = [...porFuente.entries()].map(([f, ts]) => ({ sigla: sigla(f), ref: SIG.get(f)?.ref || f, voces: vocesDe(ts, g => lugares(g)) }))
  .sort((a, b) => colEs.compare(a.sigla, b.sigla));
const informantesIdx = [...new Set(todosTs.filter(t => /^Informante\b/.test(t.fuente)).map(t => sigla(t.fuente)))].length;
// Los informantes del taller, para el filtro de «Las palabras del taller»: código, pueblos de sus testimonios y
// descripción, de informantes.json; vacía sale «Descripción pendiente.» (Carlos, 29/10/2026; antes, «Por autorizar.»)
const INFD = fs.existsSync(path.join(aqui, 'informantes.json')) ? JSON.parse(fs.readFileSync(path.join(aqui, 'informantes.json'))) : {};
const infPor = new Map();
for (const t of todosTs) if (/^Informante\b/.test(t.fuente)) {
  const c = t.fuente.replace(/^Informante\s*/, '');
  if (!infPor.has(c)) infPor.set(c, new Set());
  const l = localidadDe(t) || comarcaDe(t); if (l) infPor.get(c).add(l);
}
const informantes = [...infPor.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([c, ls]) => ({ inf: 'INF [' + c + ']', lugares: [...ls].sort(colEs.compare), descripcion: (INFD[c] && INFD[c].descripcion) || '', ...(INFD[c] && INFD[c].sin_pueblos ? { sin_pueblos: true } : {}) }));
fs.writeFileSync(path.resolve(aqui, '../datos/informantes.json'), JSON.stringify({ informantes }));
fs.writeFileSync(path.resolve(aqui, '../datos/diccionario-indices.json'), JSON.stringify({ fecha: fechaEspejo, lugares: lugaresIdx, fuentes: fuentesIdx, informantes: informantesIdx }));
// Cada pueblo tiene que poder ponerse en el mapa de «Las palabras por lugares»: si no es un municipio de base.json, va en
// localidades.json, con su término y sus coordenadas, y se vuelve a correr construir.mjs. Si falta, sale en la lista y no en el mapa.
{
  const B = JSON.parse(fs.readFileSync(path.resolve(aqui, '../datos/base.json'))), L = JSON.parse(fs.readFileSync(path.resolve(aqui, '../datos/localidades.json')));
  const hay = new Set([...B.munis.map(m => m.name), ...Object.keys(L.alias), ...L.alquerias.map(a => a.nombre)]);
  const sinSitio = lugaresIdx.flatMap(g => g.pueblos.map(p => p.nombre)).filter(n => !hay.has(n));
  if (sinSitio.length) console.warn('AVISO: pueblos sin sitio en el mapa de lugares (añadir a fuente/localidades.json):', sinSitio.join(', '));
}
console.log('diccionario-indices.json:', lugaresIdx.length, 'grupos de lugares,', lugaresIdx.reduce((n, c) => n + c.pueblos.length, 0), 'pueblos,', fuentesIdx.length, 'fuentes');

// ---------- fuentes y abreviaturas de lo publicado ----------
const fuentes = [...usadas].filter(f => !/^Informante\b/.test(f)).map(f => ({ sigla: sigla(f), ref: SIG.get(f)?.ref || f }))
  .filter((v, i, a) => a.findIndex(x => x.sigla === v.sigla) === i).sort((a, b) => colEs.compare(a.sigla, b.sigla));
if ([...usadas].some(f => /^Informante\b/.test(f))) fuentes.push({ sigla: 'INF [A00]', ref: 'Informante del taller, con su código, curso 2026-2027.' });
// Obras sin testimonios que se agradecen, en cabeza de la lista: el Tesoro de González Salgado no es fuente,
// pero se nombra con su nota (Carlos, 21/10/2026).
for (const f of ['González Salgado 2026'].reverse()) { const r = FUENTES && FUENTES.find(x => x.fuente === f); if (r) fuentes.unshift({ sigla: r.sigla, ref: [r.referencia || f, r.notas].filter(Boolean).join(' ') }); }
const CATS = JSON.parse(fs.readFileSync(path.join(aqui, 'diccionario-abreviaturas.json')));
const tokens = new Set(); for (const a of ACEP) { for (const p of limpia(a['categoría']).split(/\s+/)) tokens.add(p); const u = limpia(a.marcas); for (const k of ['U. t.', 'U. m.']) if (u.includes(k)) tokens.add(k); if (/\bpl\./.test(u)) tokens.add('pl.'); }
const hayInf = [...usadas].some(f => /^Informante\b/.test(f));
const abreviaturas = Object.entries(CATS.entradas).filter(([k]) => (k.startsWith('·') && (hayInf || !k.includes('INF'))) || tokens.has(k)).map(([k, v]) => ({ a: k.replace(/^·/, ''), v }));

const salida = {
  fecha: fechaEspejo, muestra: esMuestra, lemas: entradas.length,
  // Cada entrada: [id, lema, html de la tarjeta, formas para buscar, claves de variación, glosas para buscar, primera glosa, número de testimonios]
  e: entradas.map(e => [e.id, e.lema, e.h, e.f.join('|'), e.k.join('|'), e.g, e.g1, e.ts.length]),
  fuentes, abreviaturas, taller: { nuevas, confirma }
};
fs.writeFileSync(path.resolve(aqui, '../datos/diccionario.json'), JSON.stringify(salida));
fs.writeFileSync(path.resolve(aqui, '../datos/diccionario-cifras.json'), JSON.stringify(cifrasDiccionario(salida.fecha, salida.lemas, { lugares: lugaresIdx, fuentes: fuentesIdx })));
console.log('diccionario.json:', entradas.length, 'lemas;', nuevas.length, 'nuevas y', confirma.length, 'confirmadas por el taller;', fuentes.length, 'fuentes');
for (const a of new Set(avisos)) console.log('  aviso:', a);
