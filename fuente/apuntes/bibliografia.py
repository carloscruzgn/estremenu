# Bibliografía de la web (apartado 8 de «El contenido del taller»), sacada del § 7 de los apuntes propios.
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
    if 'ESPA' in resto: razones.append('no citable (05-DECISIONES, 01/10/2026)')
    if 'AMAS DE CASA' in resto: razones.append('autoría distinta de la de 05-DECISIONES, 01/10/2026')
    if re.match(r"[^,]+, [A-ZÁÉÍÓÚÑ]{3,}\b", autor) and 'sin nombre de pila' not in razones: razones.append('sin nombre de pila')   # NARBONA, CANO y MORILLO
    if razones: pend.append((sec,autor,resto,razones))
    else: out[sec].append(e)
intro = ('Las obras con las que se ha preparado el taller. La primera lista recoge las que se han consultado de primera mano. '
         'La segunda, las que se citan a través de otras o están por consultar. Las referencias que aún tienen algún dato por completar se añadirán cuando lo tengan.')
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
