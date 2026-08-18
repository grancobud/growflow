# Version web imprimible del manual, generada del mismo markdown que usa la app.
#
#     python scripts/manual-a-html.py
#
# Sirve para compartir el manual con alguien que no tiene acceso al sistema. Sale
# del mismo app/src/contenido/manual.md a proposito: una copia escrita aparte se
# desincroniza, y despues hay dos manuales que dicen cosas distintas.
import io, os, re, sys, html
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MD = os.path.join(RAIZ, 'app', 'src', 'contenido', 'manual.md')
OUT = os.path.join(RAIZ, 'scripts', 'manual.html')

SIN_TILDE = str.maketrans('áéíóúüñç', 'aeiouunc')

def ancla(t):
    t = t.lower().translate(SIN_TILDE)
    t = re.sub(r'[^a-z0-9\s-]', '', t)
    return re.sub(r'\s+', '-', t.strip())

def inline(t):
    t = html.escape(t)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
    return t

lineas = io.open(MD, encoding='utf-8').read().replace('\r\n', '\n').split('\n')
partes, indice = [], []
i, parr = 0, []

def cerrar():
    global parr
    if parr:
        partes.append('<p>' + inline(' '.join(parr)) + '</p>')
        parr = []

while i < len(lineas):
    l = lineas[i]; s = l.strip()
    if not s:
        cerrar(); i += 1; continue
    if re.match(r'^-{3,}$', s):
        cerrar(); i += 1; continue
    m = re.match(r'^(#{1,3})\s+(.*)$', s)
    if m:
        cerrar(); n, txt = len(m.group(1)), m.group(2).strip()
        if n == 1:
            partes.append(f'<h1>{inline(txt)}</h1>')
        elif n == 2:
            a = ancla(txt); indice.append((a, txt))
            partes.append(f'<section id="{a}"><h2>{inline(txt)}</h2>')
        else:
            partes.append(f'<h3>{inline(txt)}</h3>')
        i += 1; continue
    if s.startswith('|') and i + 1 < len(lineas) and re.match(r'^\|?[\s:|-]+\|', lineas[i+1].strip()):
        cerrar()
        cel = lambda x: [c.strip() for c in x.strip().strip('|').split('|')]
        enc = cel(s); i += 2; filas = []
        while i < len(lineas) and lineas[i].strip().startswith('|'):
            filas.append(cel(lineas[i])); i += 1
        h = ''.join(f'<th>{inline(c)}</th>' for c in enc)
        b = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in f) + '</tr>' for f in filas)
        partes.append(f'<div class="tabla-wrap"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>')
        continue
    if s.startswith('>'):
        cerrar(); acc = []
        while i < len(lineas) and lineas[i].strip().startswith('>'):
            acc.append(re.sub(r'^>\s?', '', lineas[i].strip())); i += 1
        partes.append('<div class="nota">' + inline(' '.join(acc)) + '</div>')
        continue
    m = re.match(r'^(\d+\.|[-*])\s+(.*)$', s)
    if m:
        cerrar(); ord_ = bool(re.match(r'^\d+\.', m.group(1))); items = []
        while i < len(lineas):
            mm = re.match(r'^(\d+\.|[-*])\s+(.*)$', lineas[i].strip())
            if mm and bool(re.match(r'^\d+\.', mm.group(1))) == ord_:
                items.append(mm.group(2).strip()); i += 1; continue
            if lineas[i].startswith('  ') and lineas[i].strip() and items:
                items[-1] += ' ' + lineas[i].strip(); i += 1; continue
            break
        tag = 'ol' if ord_ else 'ul'
        cls = 'pasos' if ord_ else 'lista'
        partes.append(f'<{tag} class="{cls}">' + ''.join(f'<li>{inline(x)}</li>' for x in items) + f'</{tag}>')
        continue
    # Marcadores de widgets interactivos: en la app se reemplazan por un
    # componente que consulta la base. Acá no hay base que consultar, asi que se
    # explica en una linea en vez de dejar el marcador crudo a la vista.
    if s == '{{PUESTA_EN_MARCHA}}':
        cerrar()
        partes.append('<div class="nota">Dentro del sistema, acá aparece el estado real '
                      'de cada uno de estos puntos: qué está cargado y qué falta.</div>')
        i += 1; continue
    parr.append(s); i += 1
cerrar()

cuerpo = '\n'.join(partes)
# cerrar cada <section> antes de la siguiente y al final
# Cada <section> se cierra al abrir la siguiente. El primer cierre insertado queda
# huerfano (el <h1> va antes de la primera seccion), asi que se descarta.
cuerpo = cuerpo.replace('<section id=', '</section>\n<section id=')
cuerpo = cuerpo.replace('</section>', '', 1)
cuerpo += '\n</section>'

nav = '\n'.join(
    f'<li><a href="#{a}"><span class="n">{t.split("·")[0].strip()}</span>'
    f'<span>{html.escape(t.split("·", 1)[1].strip() if "·" in t else t)}</span></a></li>'
    for a, t in indice)

CSS = io.open(os.path.join(RAIZ, 'scripts', 'manual-estilo.css'), encoding='utf-8').read()

doc = f"""<title>Manual de GrowFlow</title>
<style>{CSS}</style>
<header class="portada">
  <div class="portada-in">
    <div class="sello">GrowFlow · manual de operación</div>
    <h1>Cómo se usa GrowFlow</h1>
    <p class="bajada">El recorrido completo del sistema en el orden en que se usa de verdad, con el
    paso a paso de cada tarea y los campos tal como aparecen en pantalla.</p>
  </div>
</header>
<div class="cuerpo">
  <nav class="indice" aria-label="Índice del manual"><ol>{nav}</ol></nav>
  <main>{cuerpo}</main>
</div>
"""
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(doc)
print('generado:', len(doc), 'bytes ·', len(indice), 'capitulos')
