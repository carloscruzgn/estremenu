# Bibliografía de la web (apartado 8 de «El contenido del taller»), sacada del § 7 de los apuntes propios.
# Formato (Carlos, 18/10/2026): AUTOR (año). Resto. Por orden alfabético de apellidos y, dentro de cada autor, por año;
# si un autor repite año, con letras (1999a, 1999b), contadas en las dos listas juntas. Las entradas con varias obras se parten.
# En la web (index.html, autorRef), el autor que repite el de la entrada anterior va con raya, ———, y en una obra en
# colaboración que empieza por el mismo autor, ——— y OTRO, A.
# Entra solo la referencia completa: la que tiene una marca ++, le falta el nombre de pila, el año, la publicación,
# las páginas de un artículo o el lugar o la editorial de un libro, se queda en bibliografia_pendientes.md.
# Se quitan los comentarios de Claude (ubicación, fuente, interés, «— vía…») y las claves del tipo (Ariza 1993b).
# Uso, en fuente/apuntes: python3 bibliografia.py
import re, json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src=open('bibliografia_apuntes-propios-7.md').read().splitlines()
sec=None; out={'primaria':[], 'secundaria':[]}; pend=[]
for l in src:
    if l.startswith('## '): sec='primaria' if '7.1' in l else 'secundaria'; continue
    if not l.startswith('**') or sec is None: continue
    m=re.match(r'\*\*(.+?)\*\*\s*(.*)$', l); autor, resto = m.group(1).strip(), m.group(2)
    razones=[]
    if '++' in l: razones.append('marca ++')
    com=''
    k=resto.find(' \\[')
    if k>=0: com=resto[k:]; resto=resto[:k]
    k=resto.find(' — ')
    if k>=0: com=resto[k:]+com; resto=resto[:k]
    for w in ['sin precisar','comprobar']:
        if w in com: razones.append(w)
    resto=re.sub(r'\s*\((?:[A-ZÁÉÍÓÚ][\wáéíóúñ ]+ )?\d{4}[a-z]?\)','',resto)   # (Ariza 1993b)
    resto=re.sub(r'\s*\(su «[^»]+»\)','',resto)
    resto=resto.strip()
    if ',' not in autor and not re.search(r'AUPEX|ALPI|ALEP|COSER|Trabajos|Ayuntamiento|AYUNTAMIENTO|OSCEC|ALCyL|CLE|Junta|Real Academia|REAL ACADEMIA|\(dir', autor): razones.append('sin nombre de pila')
    if not re.search(r'\b1[5-9]\d\d\b|\b20[0-2]\d\b', resto+' '+autor): razones.append('sin año')
    if '«' in resto and '*' not in resto: razones.append('sin publicación')
    e={'autor':autor.rstrip('.')+'.', 'resto':resto if resto.endswith('.') else resto+'.'}
    sin_ital = re.sub(r'\*\*.*?\*\*','',resto)
    if '«' in resto and not re.search(r'\bpp?\. ', resto): razones.append('sin páginas')
    if resto.startswith('*') and '«' not in resto and len([x for x in re.sub(r'\*[^*]+\*','T',resto).split(',') if x.strip()])<3: razones.append('sin lugar ni editorial')
    if re.search(r'inédito|metodología', resto) or resto.startswith(','): razones.append('incompleta')
    if 'y el texto de' in resto: razones.append('varias obras, alguna sin datos')
    if 'ESPA' in resto: razones.append('no citable (05-DECISIONES, 01/10/2026)')
    if 'AMAS DE CASA' in resto: razones.append('autoría distinta de la de 05-DECISIONES, 01/10/2026')
    if re.match(r"[^,]+, [A-ZÁÉÍÓÚÑ]{3,}\b", autor) and 'sin nombre de pila' not in razones: razones.append('sin nombre de pila')   # NARBONA, CANO y MORILLO
    if razones: pend.append((sec,autor,resto,razones))
    else: out[sec].append(e)
# ---------- formato: AUTOR (año). Resto, por orden alfabético y de año, con letras si un autor repite año ----------
ANIO = re.compile(r', (?:\d\d/\d\d/)?((?:1[5-9]\d\d|20[0-2]\d)(?:-\d{2,4})?)(?=[,.;)]| \(|$)')
def partes(autor, resto):
    """Una entrada con varias obras («…, y *Otra*…», «…; **OTRO, A.**, …») se parte en una por obra."""
    out = []
    for p in re.split(r'(?:,|;) y (?=[*«])|; (?=[*«]|\*\*)', resto.rstrip('.')):
        m = re.match(r'\*\*(.+?)\*\*,?\s*(.*)$', p)
        if m: autor, p = m.group(1), m.group(2)
        out.append((autor, p.strip()))
    return out
def sin_punto(a):
    a = a.strip()
    return a if re.search(r'(^|[\s,])[A-ZÁÉÍÓÚÑ]\.$', a) else a.rstrip('.')
def clave(a):   # apellidos en mayúsculas, sin nombres de pila, para ordenar y para las letras
    return ' + '.join(re.findall(r"[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'\-]+(?: (?:DE LA |DE |DEL )?[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ'\-]+)*", a)) or a
def plano(t):
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFD', t.lower()) if unicodedata.category(c) != 'Mn')
# ---------- un autor, una forma: el que oscila va con la más completa (Carlos, 18/10/2026) ----------
# ARIZA, M. / ARIZA, Manuel / ARIZA VIGUERA, Manuel → ARIZA VIGUERA, Manuel. Se buscan las formas en las dos listas y en
# las pendientes; el autor que solo sale con iniciales o con un apellido se queda como está.
SEP = re.compile(r',? y (?=[A-ZÁÉÍÓÚÑ]{2})')
def personas(a):
    return [p.strip().rstrip('.') if not re.search(r'\b[A-ZÁÉÍÓÚÑ]\.$', p.strip()) else p.strip() for p in SEP.split(a.strip())]
def trozos(p):
    ap, _, nom = p.partition(',')
    return ap.strip(), nom.strip()
def iniciales(nom):
    return [w[0] for w in re.findall(r"[A-ZÁÉÍÓÚÑ][\wáéíóúñª.]*", nom)]
def misma(p, q):
    (a1, n1), (a2, n2) = trozos(p), trozos(q)
    w1, w2 = a1.split(), a2.split()
    if not (w1 == w2[:len(w1)] or w2 == w1[:len(w2)]) or not n1 or not n2: return False
    if n1 == n2: return True
    solo_ini = lambda n: all(w.endswith('.') or w.endswith('ª') or w in ('de', 'del', 'la', 'las') for w in n.split())
    if not (solo_ini(n1) or solo_ini(n2)): return False   # Mina y Manuel no son la misma persona
    i1, i2 = iniciales(n1), iniciales(n2)
    return i1 == i2[:len(i1)] or i2 == i1[:len(i2)]
formas = [p for sec in out for e in out[sec] for a, _ in partes(e['autor'], e['resto']) for p in personas(a)] + [p for _, autor, _, _ in pend for p in personas(autor) if '++' not in p]
def mejor(p):
    grupo = [q for q in formas if misma(p, q)] or [p]
    ap = max((trozos(q)[0] for q in grupo), key=lambda x: len(x.split()))
    nom = max((trozos(q)[1] for q in grupo), key=lambda x: (-x.count('.') + x.count('ª.'), len(x)))
    return f'{ap}, {nom}' if nom else ap
cambios = {}
def normalizar(a):
    for p in personas(a):
        m = mejor(p)
        if m != p: cambios[p] = m; a = a.replace(p, m, 1)
    return a

listas = {}
for sec in ('primaria', 'secundaria'):
    L = []
    for e in out[sec]:
        for autor, r in partes(e['autor'], e['resto']):
            m = ANIO.search(r)
            if not m: raise SystemExit(f'Sin año al partir: {autor} {r}')
            r = (r[:m.start()] + r[m.end():]).strip().rstrip(',').rstrip('.') + '.'
            L.append({'autor': sin_punto(normalizar(autor)), 'anio': m.group(1), 'resto': r, '_k': clave(normalizar(autor))})
    listas[sec] = L
for p, m in sorted(cambios.items()): print('autor:', p, '→', m)
from collections import Counter
cuenta = Counter((x['_k'], x['anio']) for L in listas.values() for x in L)
for L in listas.values():
    L.sort(key=lambda x: (plano(x['_k']), x['anio'], plano(x['resto'].lstrip('«*'))))
vistos = Counter()   # letras por orden de aparición dentro de cada autor y año
todas = sorted([x for L in listas.values() for x in L], key=lambda x: (plano(x['_k']), x['anio'], plano(x['resto'].lstrip('«*'))))
for x in todas:
    k = (x['_k'], x['anio'])
    if cuenta[k] > 1:
        x['anio'] += 'abcdefgh'[vistos[k]]
        vistos[k] += 1
for L in listas.values():
    for x in L: del x['_k']
out = listas

intro = ('Las obras con las que se ha preparado el taller. La primera lista recoge las que se han consultado de primera mano. '
         'La segunda, las que se citan a través de otras o están por consultar.')
ap = {'_fuente': 'Apuntes propios, § 7 Bibliografía (bibliografia_apuntes-propios-7.md), solo las referencias completas: bibliografia.py.',
      'id': '8', 'n': '8', 'titulo': 'Bibliografía',
      'bloques': [{'t': 'p', 'texto': intro},
                  {'t': 'h', 'texto': 'Obras consultadas'}, {'t': 'refs', 'items': out['primaria']},
                  {'t': 'h', 'texto': 'Obras citadas a través de otras'}, {'t': 'refs', 'items': out['secundaria']}]}
json.dump(ap, open('bibliografia.json', 'w'), ensure_ascii=False, indent=1)
with open('bibliografia_pendientes.md', 'w') as f:
    f.write('# Bibliografía de la web: referencias pendientes\n\nGenerado por bibliografia.py. Referencias del § 7 de los apuntes propios que no salen en la web hasta que se completen en la fuente.\n\n')
    for nombre, clave in (('Primaria', 'primaria'), ('Secundaria', 'secundaria')):
        f.write(f'## {nombre}\n\n')
        for sec, autor, resto, raz in pend:
            if sec == clave: f.write(f'- **{autor}** {resto} — {", ".join(raz)}\n')
        f.write('\n')
print('web:', len(out['primaria']), '+', len(out['secundaria']), '· pendientes:', len(pend))
