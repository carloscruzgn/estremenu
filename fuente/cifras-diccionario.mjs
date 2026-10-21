// Las cifras del diccionario que se ven sin cargarlo entero: la fecha y los lemas, para la portada, y, para las dos
// tarjetas de bajo el buscador (Carlos, 22/10/2026), las voces de cada comarca, el número de comarcas, de pueblos
// y de fuentes, y las fuentes con más voces, para la estantería. Lo usan diccionario.mjs y construir.mjs.
export function cifrasDiccionario(fecha, lemas, indices) {
  const c = { fecha, lemas };
  if (!indices) return c;
  const grupos = indices.lugares.filter(g => g.tipo === 'comarca');
  c.comarcas = Object.fromEntries(indices.lugares.filter(g => g.tipo !== 'otros').map(g => [g.nombre, g.voces.length]));
  c.nComarcas = grupos.length;
  c.nPueblos = new Set(indices.lugares.flatMap(g => g.pueblos.map(p => p.nombre))).size;
  c.nFuentes = indices.fuentes.length;
  c.fuentes = indices.fuentes.map(f => [f.sigla, f.voces.length]).sort((a, b) => b[1] - a[1]).slice(0, 9);
  return c;
}
