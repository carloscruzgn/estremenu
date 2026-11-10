// Enlaces cortos de la bibliografía: /b/<clave> lleva a la dirección larga de la obra (10/11/2026, Carlos).
// Lee fuente/apuntes/bibliografia.csv, copia de fuentes/bibliografia.csv de estremenu-base, y escribe
// <salida>/_redirects, que Cloudflare Pages aplica antes de servir nada: «/b/clave dirección 302».
// Los impresos del taller imprimen <estremenu.pages.dev/b/clave> en lugar de la dirección larga.
// Uso (lo llama publicar.sh): node fuente/enlaces-cortos.mjs _site
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = process.argv[2];
if (!salida) { console.error('Falta la carpeta de salida'); process.exit(2); }

// CSV con comillas dobles, como lo escribe el csv de Python
function filas(texto) {
  const out = []; let fila = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); out.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) { fila.push(campo); out.push(fila); }
  return out;
}

const [cab, ...resto] = filas(readFileSync(join(aqui, 'apuntes', 'bibliografia.csv'), 'utf8'));
const iClave = cab.indexOf('clave'), iUrl = cab.indexOf('url');
if (iClave < 0 || iUrl < 0) { console.error('bibliografia.csv sin columnas clave y url'); process.exit(1); }
const lineas = ['# Enlaces cortos de la bibliografía: los escribe fuente/enlaces-cortos.mjs al publicar.'];
for (const f of resto) {
  const clave = f[iClave], url = f[iUrl];
  if (!clave || !url) continue;
  if (!/^[a-z0-9-]+$/.test(clave) || !/^https?:\/\/\S+$/.test(url)) { console.error('Fila no válida:', clave, url); process.exit(1); }
  lineas.push(`/b/${clave} ${url} 302`);
}
writeFileSync(join(salida, '_redirects'), lineas.join('\n') + '\n');
console.log(`_redirects: ${lineas.length - 1} enlaces cortos`);
