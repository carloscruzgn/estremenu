# Bibliografía de la web (apartado 8 de «El contenido del taller»), sacada del § 7 de los apuntes propios.
# Desde el 18/10/2026 el § 7 ya está en el formato de la web (Carlos): **AUTOR (año).** Resto, por orden alfabético
# y de año, con las letras de año fijadas en los apuntes; el autor repetido, «———», y en colaboración, «——— y OTRO».
# El script deshace las rayas (la web las vuelve a poner, index.html, autorRef), quita los comentarios de la
# secundaria («— vía…», «— en la carpeta…») y deja fuera lo incompleto, que va a bibliografia_pendientes.md:
# marca ++, sin nombre de pila, sin año, artículo sin publicación o sin páginas, libro sin lugar ni editorial.
# Uso, en fuente/apuntes: python3 bibliografia.py
import re, json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = open('bibliografia_apuntes-propios-7.md', encoding='utf-8').read().splitlines()
ROL = re.compile(r'\s*\((?:dir|ed|eds|coord)\.\)$')
def primero(a): return re.split(r',? y (?=[A-ZÁÉÍÓÚÑ]{2})', a)[0]
sec = None; out = {'primaria': [], 'secundaria': []}; pend = []
prev = None
for l in src:
    if l.startswith('## '):
        sec = 'primaria' if '7.1' in l else 'secundaria'; prev = None; continue
    if not l.startswith('**') or sec is None: continue
    m = re.match(r'\*\*(.+?) \(([^)]*)\)\.\*\*\s*(.*)$', l)
    if not m: raise SystemExit(f'Formato no reconocido: {l[:80]}')
    autor, anio, resto = m.groups()
    if autor.startswith('———'):                      # raya: el autor de la entrada anterior
        cola = autor[3:]
        if cola.startswith(' y '): autor = primero(prev) + ',' + cola
        elif cola.strip().startswith('('): autor = ROL.sub('', prev) + cola
        else: autor = prev
    prev = autor
    com = ''
    k = resto.find(' — ')
    if k >= 0: com = resto[k + 3:]; resto = resto[:k] + '.'
    razones = []
    if '++' in autor + resto: razones.append('marca ++')
    if ',' not in autor and not re.search(r'AUPEX|ALPI|AYUNTAMIENTO|OSCEC|\(dir|\(ed', autor): razones.append('sin nombre de pila')
    if autor.startswith('['): razones.append('sin autor')
    if autor == 'ALPI': razones.append('sin edición')
    if not re.search(r'1[5-9]\d\d|20[0-2]\d|s\. f\.', anio): razones.append('sin año')
    articulo = resto.startswith('«') and 'en línea' not in resto
    if articulo and '*' not in resto: razones.append('sin publicación')
    if articulo and not re.search(r'\bpp?\. ', resto) and 'inédito' not in resto: razones.append('sin páginas')
    if resto.startswith('*') and '«' not in resto and len([x for x in re.sub(r'\*[^*]+\*', 'T', resto).split(',') if x.strip()]) < 2: razones.append('sin lugar ni editorial')
    if re.search(r'inédito', resto) and '«' in resto: razones.append('incompleta')
    if razones: pend.append((sec, autor, anio, resto, razones))
    else: out[sec].append({'autor': autor, 'anio': anio, 'resto': resto})

intro = ('Las obras con las que se ha preparado el taller. La primera lista recoge las que se han consultado de primera mano. '
         'La segunda, las que se citan a través de otras o están por consultar.')
ap = {'_fuente': 'Apuntes propios, § 7 Bibliografía (bibliografia_apuntes-propios-7.md), solo las referencias completas: bibliografia.py.',
      'id': '8', 'n': '8', 'titulo': 'Bibliografía',
      'bloques': [{'t': 'p', 'texto': intro},
                  {'t': 'h', 'texto': 'Obras consultadas'}, {'t': 'refs', 'items': out['primaria']},
                  {'t': 'h', 'texto': 'Obras citadas a través de otras'}, {'t': 'refs', 'items': out['secundaria']}]}
json.dump(ap, open('bibliografia.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
with open('bibliografia_pendientes.md', 'w', encoding='utf-8') as f:
    f.write('# Bibliografía de la web: referencias pendientes\n\nGenerado por bibliografia.py. Referencias del § 7 de los apuntes propios que no salen en la web hasta que se completen en la fuente.\n\n')
    for nombre, clave in (('Primaria', 'primaria'), ('Secundaria', 'secundaria')):
        f.write(f'## {nombre}\n\n')
        for s, autor, anio, resto, raz in pend:
            if s == clave: f.write(f'- **{autor} ({anio}).** {resto} — {", ".join(raz)}\n')
        f.write('\n')
print('web:', len(out['primaria']), '+', len(out['secundaria']), '· pendientes:', len(pend))
